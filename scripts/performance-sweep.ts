import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Performance thresholds
const API_RESPONSE_THRESHOLD_MS = 500;
const APPLY_FIXES = process.argv.includes('--apply-fixes');

interface OptimizationResult {
  category: string;
  description: string;
  impact: string;
  file?: string;
  line?: string;
  suggestedFix?: string;
}

/**
 * Helper to run grep and filter for logic files only
 */
function runGrep(pattern: string, searchPath: string | string[] = ['src/', 'supabase/functions/']): string[] {
  try {
    const paths = Array.isArray(searchPath) ? searchPath.join(' ') : searchPath;
    // Escape double quotes for the shell command
    const escapedPattern = pattern.replace(/"/g, '\\"');
    const output = execSync(`grep -rnE "${escapedPattern}" ${paths} || true`).toString();
    return output.split('\n').filter(Boolean).filter(line => {
      const file = line.split(':')[0];
      return (file.endsWith('.ts') || file.endsWith('.tsx')) &&
             !file.includes('node_modules') &&
             !file.includes('.test.');
    });
  } catch (e) {
    console.error(`Grep error for pattern ${pattern}:`, e);
    return [];
  }
}

/**
 * Finds the index of the closing brace for an opening brace at a given index.
 * Handles strings, comments, and template literals.
 */
function findClosingBrace(content: string, openIndex: number): number {
    let depth = 0;
    let inString = null;
    let inComment = null;
    let inTemplateLiteral = false;

    for (let i = openIndex; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        // Handle comments
        if (!inString && !inTemplateLiteral) {
            if (!inComment && char === '/' && nextChar === '/') {
                inComment = 'line';
                i++;
                continue;
            }
            if (!inComment && char === '/' && nextChar === '*') {
                inComment = 'block';
                i++;
                continue;
            }
            if (inComment === 'line' && char === '\n') {
                inComment = null;
                continue;
            }
            if (inComment === 'block' && char === '*' && nextChar === '/') {
                inComment = null;
                i++;
                continue;
            }
            if (inComment) continue;
        }

        // Handle strings and template literals
        if (!inComment) {
            if (!inString && !inTemplateLiteral && (char === "'" || char === '"')) {
                inString = char;
                continue;
            }
            if (inString === char && content[i - 1] !== '\\') {
                inString = null;
                continue;
            }
            if (!inString && !inTemplateLiteral && char === '`') {
                inTemplateLiteral = true;
                continue;
            }
            if (inTemplateLiteral && char === '`' && content[i - 1] !== '\\') {
                inTemplateLiteral = false;
                continue;
            }
            if (inString || inTemplateLiteral) continue;
        }

        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

/**
 * Ensures that the required React hook or utility is imported in the file.
 */
function ensureReactImport(content: string, item: string): string {
    if (content.includes(`import { ${item}`) || content.includes(`, ${item}`) || content.includes(`{${item}`)) {
        return content;
    }

    const reactImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
    if (reactImportMatch) {
        const existing = reactImportMatch[1].trim();
        return content.replace(reactImportMatch[0], `import { ${existing}, ${item} } from 'react'`);
    }

    const simpleReactImportMatch = content.match(/import\s+React\s+from\s+['"]react['"]/);
    if (simpleReactImportMatch) {
        return content.replace(simpleReactImportMatch[0], `import React, { ${item} } from 'react'`);
    }

    return `import { ${item} } from 'react';\n` + content;
}

/**
 * Robustly finds the character offset for a given line number.
 */
function getLineOffset(content: string, lineNum: number): number {
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNum - 1; i++) {
        offset += lines[i].length + 1; // +1 for the newline
    }
    return offset;
}

/**
 * Checks if the current position is likely inside a React hook or return statement.
 */
function isInsideHook(lines: string[], lineIdx: number): boolean {
    const currentLine = lines[lineIdx];
    if (currentLine.includes('useMemo') || currentLine.includes('useCallback') || currentLine.includes('useEffect')) {
        return true;
    }

    for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 50); i--) {
        const line = lines[i];
        if (line.includes('useMemo') || line.includes('useCallback') || line.includes('useEffect')) return true;
        if (line.includes('return (') || line.trim().startsWith('return ')) return true;
        if (line.includes('export const') || (line.includes('function ') && line.match(/\b[A-Z]/))) break;
    }
    return false;
}

/**
 * Checks if we are inside a React component based on capitalization of the function name.
 */
function isInsideComponent(lines: string[], lineIdx: number): boolean {
    for (let i = lineIdx; i >= Math.max(0, lineIdx - 100); i--) {
        const line = lines[i];
        // Match "const ComponentName = ..." or "function ComponentName(...) {"
        const match = line.match(/(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/);
        if (match) return true;
    }
    return false;
}

/**
 * Finds the optimal point to insert a hook at the top of a component.
 */
function findHookInsertionPoint(lines: string[], lineIdx: number): number {
    for (let i = lineIdx; i >= Math.max(0, lineIdx - 100); i--) {
        const line = lines[i];
        if (line.match(/(?:const|function)\s+[A-Z][a-zA-Z0-9]*.*=>\s*\{/) || (line.includes('function') && line.includes('{'))) {
            return i + 1;
        }
    }
    return -1;
}

/**
 * Scans for unused local variables (Dead Code).
 */
function scanForDeadCode(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        // Find variable declarations (const/let varName =)
        const output = runGrep("\\b(const|let|var)\\s+([a-zA-Z0-9_]+)\\s*=");
        const fileVars: Record<string, { name: string; line: string }[]> = {};

        output.forEach(line => {
            const [file, lineNum, ...rest] = line.split(':');
            const content = rest.join(':');
            const match = content.match(/\b(const|let|var)\s+([a-zA-Z0-9_]+)\s*=/);
            if (match) {
                const varName = match[2];
                // Skip common iterators and exported variables
                if (['i', 'j', 'k', 'index', 'idx', 'res', 'err', 'e'].includes(varName) || content.includes('export ')) return;
                if (!fileVars[file]) fileVars[file] = [];
                fileVars[file].push({ name: varName, line: lineNum });
            }
        });

        Object.entries(fileVars).forEach(([file, vars]) => {
            const content = fs.readFileSync(file, 'utf8');
            // Basic comment stripping for usage count
            const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

            vars.forEach(v => {
                const regex = new RegExp(`\\b${v.name}\\b`, 'g');
                const matches = cleanContent.match(regex);
                // If it only appears once (the declaration), it's unused
                if (matches && matches.length === 1) {
                    results.push({
                        category: 'logic',
                        description: `Detected potentially unused variable "${v.name}"`,
                        impact: 'Dead code increases bundle size and reduces maintainability',
                        file,
                        line: v.line,
                        suggestedFix: 'Remove unused variable'
                    });
                }
            });
        });
    } catch (e) {
        console.error('Error scanning for dead code:', e);
    }
    return results;
}

/**
 * Scans for N+1 queries (async calls in loops)
 */
/**
 * Scans for inefficient Supabase queries (e.g., select(*) for counts)
 */
function scanForInefficientQueries(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    // 1. .select('*', { count: ... }) supporting both single and double quotes
    runGrep("\\.select\\(['\"]\\*['\"],\\s*\\{[^}]*count:").forEach(line => {
      const [file, lineNum] = line.split(':');
      results.push({
        category: 'backend_api',
        description: 'Detected .select("*") with count option',
        impact: 'Unnecessary bandwidth/performance overhead; use .select("id") instead',
        file,
        line: lineNum,
        suggestedFix: 'Use .select("id", { count: ... })'
      });
    });

    // 2. Over-fetching in general (Heuristic for wide tables)
    runGrep("\\.select\\(['\"]\\*['\"]\\)").forEach(line => {
        const [file, lineNum] = line.split(':');
        results.push({
            category: 'backend_api',
            description: 'Detected .select("*") without specific columns',
            impact: 'Over-fetching data; consider selecting only needed columns',
            file,
            line: lineNum
        });
    });
  } catch (e) {
    console.error('Error scanning for inefficient queries:', e);
  }
  return results;
}

/**
 * Scans for inline objects or arrays in React props (unnecessary re-render risks).
 */
function scanForInlineProps(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        // Detect patterns like items={[]} or style={{...}}
        runGrep("=\\{\\s*(\\[\\]|\\{[^}]*\\})\\s*\\}").forEach(line => {
            const [file, lineNum] = line.split(':');
            if (!file.endsWith('.tsx')) return;

            const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
            if (match) {
                const componentName = match[1];
                const skipComponents = ['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2'];
                if (skipComponents.includes(componentName)) return;

                results.push({
                    category: 'frontend_react',
                    description: `Detected inline object/array prop in <${componentName}>`,
                    impact: 'Causes re-render on every parent render even if component is memoized',
                    file,
                    line: lineNum,
                    suggestedFix: 'Lift to constant or wrap in useMemo'
                });
            }
        });
    } catch (e) {
        console.error('Error scanning for inline props:', e);
    }
    return results;
}

function scanForN1Queries(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    // 1. Storage removals in map
    runGrep("\\.map\\(.*removeItemStorageObjects").forEach(line => {
      const [file, lineNum] = line.split(':');
      results.push({
        category: 'backend_api',
        description: 'Detected potential N+1 storage removal pattern',
        impact: 'Multiple storage API calls in a loop',
        file,
        line: lineNum,
        suggestedFix: 'Use removeMultipleItemsStorageObjects instead'
      });
    });

    // 2. Generic async calls in loops (map/forEach with await)
    runGrep("\\.(map|forEach)\\(async").forEach(line => {
      const parts = line.split(':');
      if (parts.length < 2) return;
      const [file, lineNum] = parts;
      results.push({
        category: 'backend_api',
        description: 'Detected async operation inside loop (Potential N+1)',
        impact: 'Serial or parallel individual API calls instead of batching',
        file,
        line: lineNum
      });
    });

    // 2b. Await inside for/while loops using robust block scanning
    runGrep("\\b(for|while)\\s*\\(").forEach(line => {
        const [file, lineNumStr] = line.split(':');
        const lineNum = parseInt(lineNumStr);
        const content = fs.readFileSync(file, 'utf8');

        const lineOffset = getLineOffset(content, lineNum);
        const braceIndex = content.indexOf('{', lineOffset);
        if (braceIndex === -1) return;

        const closeIndex = findClosingBrace(content, braceIndex);
        if (closeIndex === -1) return;

        const blockContent = content.substring(braceIndex, closeIndex);
        if (blockContent.includes('await ')) {
            results.push({
                category: 'backend_api',
                description: 'Detected await inside for/while loop (Potential N+1)',
                impact: 'Sequential execution of async operations; consider batching',
                file,
                line: lineNum
            });
        }
    });

    // 2c. createSignedUrl in loops specifically
    runGrep("\\.map\\(.*createSignedUrl").forEach(line => {
        const [file, lineNum] = line.split(':');
        results.push({
            category: 'backend_api',
            description: 'Detected createSignedUrl inside .map()',
            impact: 'High network overhead; use createSignedUrls (batched) instead',
            file,
            line: lineNum,
            suggestedFix: 'Use createSignedUrls for batching'
        });
    });

    // 3. Supabase calls inside loops (Heuristic)
    const supabaseUsage: Record<string, number> = {};
    runGrep("\\b(supabase|from)\\(").forEach(line => {
      const file = line.split(':')[0];
      supabaseUsage[file] = (supabaseUsage[file] || 0) + 1;
    });

    Object.entries(supabaseUsage).forEach(([file, count]) => {
      if (count > 15) {
         results.push({
           category: 'backend_api',
           description: `High number of Supabase calls (${count}) in single file`,
           impact: 'Potential for redundant queries; consider consolidating or batching',
           file
         });
      }
    });

    // 4. Supabase queries in map
    runGrep("\\.map\\(.*supabase\\.(from|upsert|delete)").forEach(line => {
        const [file, lineNum] = line.split(':');
        results.push({
          category: 'backend_api',
          description: 'Detected Supabase query inside .map() (N+1)',
          impact: 'Executes one query per item in the collection',
          file,
          line: lineNum,
          suggestedFix: 'Use batch operations if possible'
        });
    });

  } catch (e) {
    console.error('Error scanning for N+1:', e);
  }
  return results;
}

/**
 * Scans for Supabase queries that might need database indexes
 */
function scanForMissingIndexes(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    const knownIndexedColumns = ['id', 'created_at', 'user_id', 'updated_at', 'email', 'slug', 'status', 'active', 'type', 'role', 'name'];

    try {
        // Look for .eq('column', ...), .in('column', ...), etc.
        runGrep("\\.(eq|in|gt|lt|gte|lte|neq|like|ilike|match)\\('[a-zA-Z0-9_]+'").forEach(line => {
            // regex to extract file, line and column name
            const match = line.match(/^([^:]+):([0-9]+):.*?\.(eq|in|gt|lt|gte|lte|neq|like|ilike|match)\('([a-zA-Z0-9_]+)'/);
            if (match) {
                const [, file, lineNum, , column] = match;
                if (knownIndexedColumns.includes(column) || column.endsWith('_id')) return;

                // Attempt to find table name by looking back in the file
                let tableName = 'table_name_here';
                try {
                     const content = fs.readFileSync(file, 'utf8');
                     const lines = content.split('\n');
                     const lineIdx = parseInt(lineNum) - 1;
                     for (let i = lineIdx; i >= Math.max(0, lineIdx - 20); i--) {
                         const fromMatch = lines[i].match(/\.from\(['"]([^'"]+)['"]\)/);
                         if (fromMatch) {
                             tableName = fromMatch[1];
                             break;
                         }
                     }
                } catch (e) {
                    // Ignore error when reading table name
                }

                results.push({
                    category: 'database',
                    description: `Potential missing index for column "${column}" in table "${tableName}"`,
                    impact: 'Queries on this column may cause full table scans',
                    file,
                    line: lineNum,
                    suggestedFix: `CREATE INDEX IF NOT EXISTS idx_${tableName}_${column} ON ${tableName} (${column});`
                });
            }
        });
    } catch (e) {
        console.error('Error scanning for missing indexes:', e);
    }
    return results;
}

/**
 * Scans for missing memoization in React components
 */
function scanForMissingMemo(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    // 1. Complex filtering/sorting in component body (not wrapped in useMemo)
    runGrep("\\.(filter|sort|reduce)\\(").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const lineIdx = parseInt(lineNum) - 1;
        if (isNaN(lineIdx) || lineIdx < 0) return;

        // Look back up to find if we are inside a hook or the return statement
        let isInsideHook = false;
        let isInsideReturn = false;

        for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 100); i--) {
            const l = lines[i];

            if (l.includes('return (') || l.trim().startsWith('return ')) {
                isInsideReturn = true;
            }

            if (l.includes('useMemo') || l.includes('useCallback') || l.includes('useEffect')) {
                isInsideHook = true;
                break;
            }

            if (l.includes('export const') || l.includes('function ')) {
                break;
            }
        }

        if (!isInsideHook) {
            // Check if it's an assignment
            let actualLineIdx = lineIdx;
            let varName = '';
            if (!lines[lineIdx].includes('const ') && lineIdx > 0 && lines[lineIdx-1].includes('const ')) {
                actualLineIdx = lineIdx - 1;
            }
            const match = lines[actualLineIdx].match(/const\s+(\w+)/);
            if (match) varName = match[1];

            results.push({
                category: 'frontend_react',
                description: `Detected expensive operation (${lines[lineIdx].includes('filter') ? 'filter' : 'sort/reduce'}) outside useMemo${varName ? ` for "${varName}"` : ''}`,
                impact: 'Calculation runs on every render',
                file,
                line: (actualLineIdx + 1).toString(),
                suggestedFix: 'Wrap in useMemo'
            });
        }
    });

    // 2. Components used in lists that might need memoization
    runGrep("\\.map\\(.*=>.*<[A-Z]").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match) {
            const componentName = match[1];
            // Skip common components that are already fast or don't benefit much from memoization
            const skipComponents = [
                'Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar',
                'ItemCardSkeleton', 'SkeletonCard', 'CardSkeleton', 'Loader2'
            ];
            if (skipComponents.includes(componentName)) return;

            let isMemoized = false;
            try {
                const importLine = execSync(`grep -rnE "import.*${componentName}.*from" ${file} || true`).toString();
                if (importLine) {
                    const pathMatch = importLine.match(/from\s+["'](.+)["']/);
                    if (pathMatch) {
                        const importPath = pathMatch[1];
                        let resolvedPath: string | null = null;
                        if (importPath.startsWith('@/')) {
                            resolvedPath = importPath.replace('@/', 'src/') + '.tsx';
                        } else if (importPath.startsWith('.')) {
                            resolvedPath = path.join(path.dirname(file), importPath) + '.tsx';
                        }

                        if (resolvedPath && fs.existsSync(resolvedPath)) {
                            const def = fs.readFileSync(resolvedPath, 'utf8');
                            if (def.includes('memo(') || def.includes('React.memo(')) {
                                isMemoized = true;
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore errors during import resolution
            }

            if (!isMemoized) {
                results.push({
                    category: 'frontend_react',
                    description: `Component <${componentName}> used in list mapping`,
                    impact: 'May cause redundant re-renders if not memoized',
                    file,
                    line: lineNum,
                    suggestedFix: `Check if <${componentName}> is memoized`
                });
            }
        }
    });

    // 3. Arrow functions passed as props to components (Unnecessary re-renders)
    runGrep("<[A-Z][a-zA-Z0-9]*[^>]*\\w+\\s*=\\s*\\{\\s*\\([^)]*\\)\\s*=>").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match) {
            const componentName = match[1];
            const skipComponents = ['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2', 'TabsTrigger', 'TabsList'];
            if (skipComponents.includes(componentName)) return;

            results.push({
                category: 'frontend_react',
                description: `Detected inline arrow function passed to <${componentName}>`,
                impact: 'Causes re-render even if component is memoized',
                file,
                line: lineNum,
                suggestedFix: 'Wrap in useCallback'
            });
        }
    });

  } catch (e) {
    console.error('Error scanning for missing memo:', e);
  }
  return results;
}

/**
 * Applies automated fixes where safe
 */
function applyFixes(optimizations: OptimizationResult[]) {
    if (!APPLY_FIXES) return;

    console.log('Applying automated fixes...');
    // Sort optimizations by line number in descending order (bottom-up)
    // to prevent offset corruption when modifying files.
    const sortedOptimizations = [...optimizations].sort((a, b) => {
        const lineA = parseInt(a.line || '0');
        const lineB = parseInt(b.line || '0');
        return lineB - lineA;
    });

    sortedOptimizations.forEach(opt => {
        if (!opt.file || !opt.line) return;

        try {
            const content = fs.readFileSync(opt.file, 'utf8');
            const lines = content.split('\n');
            const lineIdx = parseInt(opt.line) - 1;
            const line = lines[lineIdx];

            if (opt.category === 'backend_api' && opt.description.includes('N+1 storage removal')) {
                const match = line.match(/(\w+)\.map\(\w+\s*=>\s*removeItemStorageObjects\(\w+\)\)/);
                if (match) {
                    const collectionName = match[1];
                    lines[lineIdx] = line.replace(match[0], `removeMultipleItemsStorageObjects(${collectionName})`);
                    fs.writeFileSync(opt.file, lines.join('\n'));
                    console.log(`✅ Fixed N+1 storage removal in ${opt.file}`);
                }
            } else if (opt.category === 'backend_api' && opt.description.includes('select("*") with count option')) {
                const match = line.match(/\.select\((["'])\*(\1),\s*(\{[^}]*count:[^}]*\})\)/);
                if (match) {
                    lines[lineIdx] = line.replace(match[0], `.select(${match[1]}id${match[1]}, ${match[3]})`);
                    fs.writeFileSync(opt.file, lines.join('\n'));
                    console.log(`✅ Fixed inefficient count query in ${opt.file}`);
                }
            } else if (opt.category === 'frontend_react' && opt.description.includes('outside useMemo')) {
                // Automated useMemo wrapping is risky due to dependency tracking.
                // Suggest manually instead of potentially breaking the code.
                console.log(`Recommendation: Wrap expensive operation in useMemo in ${opt.file}:${opt.line}`);
            } else if (opt.category === 'database' && opt.description.includes('Potential missing index')) {
                const columnMatch = opt.description.match(/column "([^"]+)"/);
                const tableMatch = opt.description.match(/table "([^"]+)"/);
                const column = columnMatch ? columnMatch[1] : null;
                const tableName = tableMatch ? tableMatch[1] : 'table_name_here';

                if (column) {
                    const sqlFile = 'supabase/migrations/performance_indexes_suggestion.sql';
                    const indexName = `idx_${tableName}_${column}`;
                    const sqlStatement = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${column});`;
                    const sql = `-- Suggested index for performance optimization\n-- File: ${opt.file}\n-- Context: Found filter on "${column}" in table "${tableName}"\n${sqlStatement}\n\n`;

                    if (!fs.existsSync(path.dirname(sqlFile))) {
                        fs.mkdirSync(path.dirname(sqlFile), { recursive: true });
                    }

                    let existingSql = '';
                    if (fs.existsSync(sqlFile)) {
                        existingSql = fs.readFileSync(sqlFile, 'utf8');
                    }

                    if (!existingSql.includes(sqlStatement)) {
                        fs.appendFileSync(sqlFile, sql);
                        console.log(`✅ Generated index suggestion for "${column}" in ${sqlFile}`);
                    }
                }
            } else if (opt.category === 'frontend_react' && opt.description.includes('used in list mapping')) {
                // Automated memo() wrapping for components
                const componentName = opt.description.match(/<(\w+)>/)?.[1];
                if (componentName) {
                    // Try to find the component definition file
                    const importLine = execSync(`grep -rnE "import.*${componentName}.*from" ${opt.file} || true`).toString();
                    const pathMatch = importLine.match(/from\s+["'](.+)["']/);
                    if (pathMatch) {
                        const importPath = pathMatch[1];
                        let resolvedPath: string | null = null;
                        if (importPath.startsWith('@/')) resolvedPath = importPath.replace('@/', 'src/') + '.tsx';
                        else if (importPath.startsWith('.')) resolvedPath = path.join(path.dirname(opt.file), importPath) + '.tsx';

                        if (resolvedPath && fs.existsSync(resolvedPath)) {
                            let def = fs.readFileSync(resolvedPath, 'utf8');
                            if (!def.includes('memo(') && !def.includes('React.memo(')) {
                                // 1. Add import if missing
                                def = ensureReactImport(def, 'memo');

                                // 2. Handle both arrow functions and traditional functions
                                const arrowMatch = def.match(new RegExp(`export const ${componentName}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                const funcMatch = def.match(new RegExp(`export function ${componentName}\\s*\\(([^)]*)\\)\\s*\\{`));

                                if (arrowMatch) {
                                    const braceIdx = def.indexOf('{', def.indexOf(arrowMatch[0]));
                                    const closeIdx = findClosingBrace(def, braceIdx);
                                    if (closeIdx !== -1) {
                                        const original = def.substring(0, closeIdx + 1);
                                        const wrapped = original.replace(`export const ${componentName} = (`, `export const ${componentName} = memo((`) + ');';
                                        def = def.replace(original, wrapped);
                                        if (!def.includes(`${componentName}.displayName`)) {
                                            def += `\n\n${componentName}.displayName = "${componentName}";\n`;
                                        }
                                        console.log(`✅ Wrapped arrow component ${componentName} in memo()`);
                                        fs.writeFileSync(resolvedPath, def);
                                    }
                                } else if (funcMatch) {
                                    // Rename original and export memoized version
                                    const braceIdx = def.indexOf('{', def.indexOf(funcMatch[0]));
                                    const closeIdx = findClosingBrace(def, braceIdx);
                                    if (closeIdx !== -1) {
                                        def = def.replace(`export function ${componentName}`, `function _${componentName}`);
                                        def += `\n\nexport const ${componentName} = memo(_${componentName});\n`;
                                        def += `${componentName}.displayName = "${componentName}";\n`;
                                        console.log(`✅ Refactored and memoized traditional function component ${componentName}`);
                                        fs.writeFileSync(resolvedPath, def);
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (opt.category === 'frontend_react' && opt.description.includes('inline arrow function')) {
                // Automated useCallback for simple setter patterns: onClick={() => setOpen(false)}
                const setterMatch = line.match(/(\w+)\s*=\s*\{\(\)\s*=>\s*(\w+)\(([^)]*)\)\}/);
                if (setterMatch) {
                    const [fullMatch, propName, setterName, setterVal] = setterMatch;
                    const handlerName = `handle${propName.charAt(0).toUpperCase() + propName.slice(1)}`;

                    // This requires inserting a useCallback hook in the component body
                    // Too complex for simple regex without knowing component structure
                    console.log(`Recommendation: Move ${fullMatch} to a useCallback named ${handlerName} in ${opt.file}`);
                } else {
                    console.log(`Recommendation: Wrap inline arrow function in useCallback in ${opt.file}:${opt.line}`);
                }
            }
        } catch (e) {
            console.error(`Failed to apply fix in ${opt.file}:`, e);
        }
    });
}

/**
 * Reviews recent merges for performance regressions
 */
function reviewRecentMerges(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const lookback = process.env.GITHUB_ACTIONS ? "24 hours ago" : "7 days ago";
        const merges = execSync(`git log --merges --since="${lookback}" --pretty=format:"%h %s" || true`).toString();
        if (merges) {
            merges.split('\n').filter(Boolean).forEach(merge => {
                const parts = merge.split(' ');
                if (parts.length < 2) return;
                const hash = parts[0];
                const msg = parts.slice(1).join(' ');

                const diff = execSync(`git diff ${hash}^..${hash} || true`).toString();
                if (diff.includes('useEffect') || diff.includes('supabase') || diff.includes('.map') ||
                    diff.includes('useState') || diff.includes('useCallback') ||
                    msg.toLowerCase().includes('perf') || msg.toLowerCase().includes('fix')) {
                    results.push({
                        category: 'process',
                        description: `Recent merge "${msg}" contains potential performance impact`,
                        impact: 'Changes in hooks or API patterns should be reviewed',
                        file: hash
                    });
                }
            });
        }
    } catch (e) {
        console.error('Error reviewing merges:', e);
    }
    return results;
}

/**
 * Benchmarks actual API response times if credentials are available
 */
async function runApiBenchmarks(): Promise<{ apiLatencyMs: number; status: string; tableMetrics?: Record<string, number> }> {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        return { apiLatencyMs: 0, status: 'skipped (no credentials)' };
    }

    try {
        const supabase = createClient(url, key);
        const tables = ['items', 'subscriptions', 'health_measurements', 'profiles', 'tags'];
        const tableMetrics: Record<string, number> = {};
        let totalLatency = 0;
        let successCount = 0;

        for (const table of tables) {
            const start = Date.now();
            const { error } = await supabase.from(table).select('id').limit(1);
            const end = Date.now();

            if (!error) {
                const latency = end - start;
                tableMetrics[table] = latency;
                totalLatency += latency;
                successCount++;
            }
        }

        if (successCount === 0) {
            return { apiLatencyMs: 0, status: 'failed' };
        }

        return {
            apiLatencyMs: Math.round(totalLatency / successCount),
            status: 'success',
            tableMetrics
        };
    } catch (e) {
        console.error('Benchmark error:', e);
        return { apiLatencyMs: 0, status: 'error' };
    }
}

/**
 * Runs performance benchmarks
 */
async function runBenchmarks() {
  console.log('Running performance benchmarks...');
  const apiBenchmark = await runApiBenchmarks();

  const metrics = {
    bundleSizeKB: 0,
    largeFilesCount: 0,
    timestamp: new Date().toISOString(),
    apiLatencyMs: apiBenchmark.apiLatencyMs,
    apiStatus: apiBenchmark.status
  };

  try {
    if (fs.existsSync('dist')) {
      const files = execSync('find dist -name "*.js"').toString().split('\n').filter(Boolean);
      metrics.largeFilesCount = files.length;
      let totalSize = 0;
      files.forEach(file => {
        totalSize += fs.statSync(file).size;
      });
      metrics.bundleSizeKB = Math.round(totalSize / 1024);
    }
  } catch (e) {
    console.warn('Could not run benchmarks (build artifacts missing)');
  }

  return metrics;
}

/**
 * Logs the results to performance-logs.json
 */
function logResults(optimizations: OptimizationResult[], benchmarks: Record<string, unknown>) {
  const logPath = path.join(process.cwd(), 'performance-logs.json');
  let logs = [];
  if (fs.existsSync(logPath)) {
    try {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch (e) {
        logs = [];
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    type: 'nightly_sweep',
    optimizations: optimizations.map(o => ({ ...o, fixed: APPLY_FIXES })),
    benchmarks,
    status: optimizations.length > 0 ? 'optimizations_found' : 'healthy',
    PR_URL: process.env.PR_URL
  };

  logs.unshift(summary);
  // Keep the last 20 runs to maintain a reasonable history
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: { optimizations: OptimizationResult[]; benchmarks: { apiLatencyMs: number; beforeLatencyMs?: number; tableMetrics?: Record<string, number> } }, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const optimizations = summary.optimizations;
  const slowTables = Object.entries(summary.benchmarks.tableMetrics || {})
    .filter(([, latency]) => latency > API_RESPONSE_THRESHOLD_MS);

  const slaExceeded = summary.benchmarks.apiLatencyMs > API_RESPONSE_THRESHOLD_MS || slowTables.length > 0;

  const backendLeadId = process.env.BACKEND_LEAD_SLACK_ID || "backend-lead";
  const backendLeadTag = `<@${backendLeadId}>`;

  let text = `🚀 *Nightly Performance Sweep Report* - ${new Date().toLocaleDateString()}\n`;
  if (summary.benchmarks.beforeLatencyMs) {
      const delta = summary.benchmarks.apiLatencyMs - summary.benchmarks.beforeLatencyMs;
      text += `⏱️ *Latency Delta:* ${summary.benchmarks.beforeLatencyMs}ms → ${summary.benchmarks.apiLatencyMs}ms (${delta >= 0 ? '+' : ''}${delta}ms)\n`;
  } else {
      text += `⏱️ *Current Latency:* ${summary.benchmarks.apiLatencyMs}ms\n`;
  }
  if (prUrl) {
      text += `📦 *Pull Request:* ${prUrl}\n`;
  }

  if (slaExceeded) {
      text += `⚠️ *SLA THRESHOLD EXCEEDED* - cc ${backendLeadTag}\n`;
      if (slowTables.length > 0) {
          text += `*Slow Endpoints detected:*\n${slowTables.map(([table, latency]) => `• ${table}: ${latency}ms`).join('\n')}\n`;
      }
  }

  const message = {
    text,
    attachments: [
      {
        color: slaExceeded ? '#ef4444' : (optimizations.length > 0 ? '#f59e0b' : '#10b981'),
        title: 'Optimization Summary',
        text: optimizations.length > 0
          ? `Found ${optimizations.length} potential optimizations.\n` +
            optimizations.slice(0, 8).map(o => `• [${o.category}] ${o.description} in ${o.file}`).join('\n') +
            (optimizations.length > 8 ? `\n...and ${optimizations.length - 8} more.` : '')
          : 'No major performance regressions detected. System is within SLA thresholds.'
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    if (!response.ok) {
      throw new Error(`Slack API responded with ${response.status}`);
    }
    console.log('Slack notification sent successfully.');
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

/**
 * Scans for potential nested loops
 */
function scanForNestedLoops(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const loopPattern = "\\b(\\.map|\\.forEach|for\\s*\\(|while\\s*\\()";
        const output = runGrep(loopPattern);
        const fileMap: Record<string, number[]> = {};

        output.forEach(line => {
            const parts = line.split(':');
            if (parts.length < 2) return;
            const file = parts[0];
            const lineNum = parts[1];
            if (!fileMap[file]) fileMap[file] = [];
            fileMap[file].push(parseInt(lineNum));
        });

        Object.entries(fileMap).forEach(([file, lineNums]) => {
            const content = fs.readFileSync(file, 'utf8');

            lineNums.forEach(lineNum => {
                const lineOffset = getLineOffset(content, lineNum);

                // Find start of this loop
                const openBraceIdx = content.indexOf('{', lineOffset);
                if (openBraceIdx === -1) return;

                const closeBraceIdx = findClosingBrace(content, openBraceIdx);
                if (closeBraceIdx === -1) return;

                const innerContent = content.substring(openBraceIdx + 1, closeBraceIdx);

                // Look for nested loops within this block
                const innerRegex = new RegExp(loopPattern, 'g');
                const innerMatches = innerContent.match(innerRegex);

                // Ignore standard patterns that might look like nested loops but are harmless
                const isHarmless = innerContent.includes('ReadableStream') || innerContent.includes('buffer');

                if (innerMatches && innerMatches.length > 0 && !isHarmless) {
                    results.push({
                        category: 'logic',
                        description: 'Potential nested loop detected',
                        impact: 'May lead to O(n^2) complexity',
                        file,
                        line: lineNum.toString()
                    });
                }
            });
        });
    } catch (e) {
        console.error('Error scanning for nested loops:', e);
    }
    return results;
}

async function main() {
  if (process.env.SEND_NOTIFICATION_ONLY) {
    if (!fs.existsSync('performance-summary.json')) return;
    const summary = JSON.parse(fs.readFileSync('performance-summary.json', 'utf8'));
    await sendSlackNotification(summary, process.env.PR_URL);
    return;
  }

  console.log('Starting nightly performance sweep...');

  const inefficientQueries = scanForInefficientQueries();
  const n1Issues = scanForN1Queries();
  const indexIssues = scanForMissingIndexes();
  const memoIssues = scanForMissingMemo();
  const mergeIssues = reviewRecentMerges();
  const logicIssues = scanForNestedLoops();
  const deadCodeIssues = scanForDeadCode();
  const inlinePropIssues = scanForInlineProps();

  const allIssues = [
    ...inefficientQueries,
    ...n1Issues,
    ...indexIssues,
    ...memoIssues,
    ...mergeIssues,
    ...logicIssues,
    ...deadCodeIssues,
    ...inlinePropIssues
  ];

  const beforeBenchmarks = await runBenchmarks();

  if (APPLY_FIXES && allIssues.length > 0) {
      applyFixes(allIssues);
      const afterBenchmarks = await runBenchmarks();

      logResults(allIssues, { before: beforeBenchmarks, after: afterBenchmarks });

      if (process.env.SLACK_WEBHOOK_URL && !process.env.GITHUB_ACTIONS) {
          await sendSlackNotification({
            optimizations: allIssues,
            benchmarks: {
                apiLatencyMs: afterBenchmarks.apiLatencyMs,
                beforeLatencyMs: beforeBenchmarks.apiLatencyMs
            }
          });
      }
      console.log('Performance sweep completed with auto-fixes.', { before: beforeBenchmarks, after: afterBenchmarks });
  } else {
      logResults(allIssues, beforeBenchmarks);

      if (process.env.SLACK_WEBHOOK_URL && !process.env.GITHUB_ACTIONS) {
          await sendSlackNotification({
            optimizations: allIssues,
            benchmarks: { apiLatencyMs: beforeBenchmarks.apiLatencyMs }
          });
      }
      console.log('Performance sweep completed.', { benchmarks: beforeBenchmarks });
  }
}

main().catch(console.error);
