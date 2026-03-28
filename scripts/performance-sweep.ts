import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Performance thresholds
const API_RESPONSE_THRESHOLD_MS = 500;
const APPLY_FIXES = process.argv.includes('--apply-fixes');

/**
 * Robust helper to find closing brace for a block, handling strings/comments/interpolation
 */
function findClosingBrace(content: string, openBraceIdx: number): number {
    let depth = 0;
    let inString: string | null = null;
    let inComment: 'single' | 'multi' | null = null;
    let isEscaped = false;

    for (let i = openBraceIdx; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        if (inComment === 'single') {
            if (char === '\n') inComment = null;
            continue;
        }

        if (inComment === 'multi') {
            if (char === '*' && nextChar === '/') {
                inComment = null;
                i++;
            }
            continue;
        }

        if (inString) {
            if (char === '\\') isEscaped = true;
            else if (char === inString) inString = null;
            // Handle template literal interpolation
            else if (inString === '`' && char === '$' && nextChar === '{') {
                depth++;
                i++;
            }
            continue;
        }

        if (char === '/' && nextChar === '/') inComment = 'single';
        else if (char === '/' && nextChar === '*') inComment = 'multi';
        else if (char === "'" || char === '"' || char === '`') inString = char;
        else if (char === '{') depth++;
        else if (char === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

/**
 * Checks if a given position is inside a React Hook
 */
function isInsideHook(content: string, index: number): boolean {
    const lookback = content.slice(Math.max(0, index - 2000), index);
    const hookMatch = lookback.match(/(useCallback|useMemo|useEffect|useLayoutEffect)\s*\(/g);
    if (!hookMatch) return false;

    // Verify if the current line or previous line is the start of a hook
    const lines = lookback.split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine.includes('useCallback') || lastLine.includes('useMemo')) return true;

    // Use brace counting to be sure
    let braceDepth = 0;
    for (let i = index - 1; i >= 0; i--) {
        if (content[i] === '}') braceDepth++;
        if (content[i] === '{') {
            if (braceDepth === 0) {
                const startOfBlock = content.lastIndexOf('\n', i);
                const blockHead = content.slice(startOfBlock, i);
                if (blockHead.includes('useCallback') || blockHead.includes('useMemo') || blockHead.includes('useEffect')) return true;
                return false;
            }
            braceDepth--;
        }
    }
    return false;
}

/**
 * Checks if a given position is inside a React Component
 */
function isInsideComponent(content: string, index: number): boolean {
    const lookback = content.slice(0, index);
    const componentMatch = lookback.match(/(?:export\s+)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g);
    if (!componentMatch) return false;

    // Count braces back to find the component head
    let braceDepth = 0;
    for (let i = index - 1; i >= 0; i--) {
        if (content[i] === '}') braceDepth++;
        if (content[i] === '{') {
            if (braceDepth === 0) {
                const startOfLine = lookback.lastIndexOf('\n', i);
                const line = lookback.slice(startOfLine, i);
                if (line.match(/(const|function)\s+[A-Z]/)) return true;
                // Keep going if we are in a nested block that isn't a component
            } else {
                braceDepth--;
            }
        }
    }
    return false;
}

/**
 * Gets character offset from line number
 */
function getLineOffset(content: string, lineNum: number): number {
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
        offset += lines[i].length + 1;
    }
    return offset;
}

/**
 * Ensures React hooks are imported
 */
function ensureReactImport(content: string, hookName: string): string {
    if (content.includes(hookName)) return content;

    const reactImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
    if (reactImportMatch) {
        const imports = reactImportMatch[1].split(',').map(i => i.trim());
        if (!imports.includes(hookName)) {
            return content.replace(reactImportMatch[0], `import { ${imports.join(', ')}, ${hookName} } from 'react'`);
        }
        return content;
    }

    const reactNamespaceMatch = content.match(/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/);
    if (reactNamespaceMatch) return content; // Use React.hookName instead?

    return `import { ${hookName} } from 'react';\n` + content;
}

/**
 * Finds the insertion point for a hook in a component
 */
function findHookInsertionPoint(content: string, componentName: string): number {
    const componentRegex = new RegExp(`(?:export\\s+)?(?:const|function)\\s+${componentName}\\s*=?\\s*\\(?([^)]*)\\)?\\s*(=>)?\\s*\\{`);
    const match = content.match(componentRegex);
    if (!match) return -1;

    const openBraceIdx = content.indexOf('{', match.index);
    if (openBraceIdx === -1) return -1;

    // Skip possible early returns or other hooks
    const lines = content.slice(openBraceIdx).split('\n');
    let insertionIdx = openBraceIdx + 1;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('use') || line.startsWith('const') || line.startsWith('let') || line === '') {
            insertionIdx += lines[i].length + 1;
            continue;
        }
        break;
    }

    return insertionIdx;
}

interface OptimizationResult {
  category: string;
  description: string;
  impact: string;
  file?: string;
  line?: string;
  suggestedFix?: string;
  fixed?: boolean;
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
 * Scans for N+1 queries (async calls in loops)
 */
/**
 * Scans for inefficient Supabase queries (e.g., select(*) for counts)
 */
function scanForInefficientQueries(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    // 1. .select('*', { count: ... })
    runGrep("\\.select\\(['\"](\\*|\\*\\*)['\"],\\s*\\{[^}]*count:").forEach(line => {
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

    // 2. Heavy .select('*') without specific columns in complex files
    runGrep("\\.select\\(['\"]\\*['\"]\\)").forEach(line => {
        const [file, lineNum] = line.split(':');
        results.push({
            category: 'backend_api',
            description: 'Detected .select("*") without explicit columns',
            impact: 'Over-fetching of data can slow down the API and increase memory usage',
            file,
            line: lineNum,
            suggestedFix: 'Specify only needed columns, e.g., .select("id, name")'
        });
    });
  } catch (e) {
    console.error('Error scanning for inefficient queries:', e);
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

    // 2b. Await inside for/while loops
    const awaitInLoops = execSync('grep -rnE "(for|while)\\s*\\(" src/ supabase/functions/ -A 10 | grep "await" || true').toString();
    if (awaitInLoops) {
        const lines = awaitInLoops.split('\n');
        lines.forEach(rawLine => {
            const line = rawLine.trim();
            if (!line) return;
            const match = line.match(/^([^:]+):([0-9]+):/);
            if (!match) return;
            const [, file, lineNum] = match;
            if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file.includes('node_modules') || file.includes('.test.')) return;

            results.push({
                category: 'backend_api',
                description: 'Detected await inside for/while loop (Potential N+1)',
                impact: 'Sequential execution of async operations; consider batching',
                file,
                line: lineNum
            });
        });
    }

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
      if (count > 20) {
         results.push({
           category: 'backend_api',
           description: `High number of Supabase calls (${count}) in single file`,
           impact: 'Potential for redundant queries; consider consolidating or batching',
           file
         });
      }
    });

    // 4. Supabase queries in map
    runGrep("\\.map\\(.*supabase\\.(from|upsert|delete|insert|update)").forEach(line => {
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
                     for (let i = lineIdx; i >= Math.max(0, lineIdx - 10); i--) {
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
        if (line.includes('.filter(Boolean)')) return; // Skip trivial filters

        const content = fs.readFileSync(file, 'utf8');
        const offset = getLineOffset(content, parseInt(lineNum));

        if (!isInsideComponent(content, offset)) return;
        if (isInsideHook(content, offset)) return;

        const lines = content.split('\n');
        const lineIdx = parseInt(lineNum) - 1;

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

    // 4. Inline objects or arrays in props
    runGrep("<[A-Z][a-zA-Z0-9]*[^>]*\\w+\\s*=\\s*\\{\\s*(\\[|\\]|\\{)").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match) {
            const componentName = match[1];
            const skipComponents = ['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2'];
            if (skipComponents.includes(componentName)) return;

            // Only flag if it looks like an inline object/array: props={[]} or props={{}}
            if (line.includes('={[]}') || line.includes('={{}}')) {
                results.push({
                    category: 'frontend_react',
                    description: `Detected inline object/array passed to <${componentName}>`,
                    impact: 'New reference on every render causes unnecessary updates',
                    file,
                    line: lineNum,
                    suggestedFix: 'Move outside component or wrap in useMemo'
                });
            }
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
    // Group by file and sort by line number descending (bottom-up) to avoid offset issues
    const byFile: Record<string, OptimizationResult[]> = {};
    optimizations.forEach(opt => {
        if (!opt.file || !opt.line) return;
        if (!byFile[opt.file]) byFile[opt.file] = [];
        byFile[opt.file].push(opt);
    });

    Object.entries(byFile).forEach(([file, fileOpts]) => {
        fileOpts.sort((a, b) => parseInt(b.line!) - parseInt(a.line!));

        fileOpts.forEach(opt => {
            try {
                let content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');
                const lineIdx = parseInt(opt.line!) - 1;
                const line = lines[lineIdx];

                if (opt.category === 'backend_api' && opt.description.includes('N+1 storage removal')) {
                    const match = line.match(/(\w+)\.map\(\w+\s*=>\s*removeItemStorageObjects\(\w+\)\)/);
                    if (match) {
                        const collectionName = match[1];
                        lines[lineIdx] = line.replace(match[0], `removeMultipleItemsStorageObjects(${collectionName})`);
                        fs.writeFileSync(file, lines.join('\n'));
                        opt.fixed = true;
                    }
                } else if (opt.category === 'backend_api' && opt.description.includes('select("*") with count option')) {
                    const match = line.match(/\.select\((["'])\*(\1),\s*(\{[^}]*count:[^}]*\})\)/);
                    if (match) {
                        lines[lineIdx] = line.replace(match[0], `.select(${match[1]}id${match[1]}, ${match[3]})`);
                        fs.writeFileSync(file, lines.join('\n'));
                        opt.fixed = true;
                    }
                } else if (opt.category === 'database' && opt.description.includes('Potential missing index')) {
                    const columnMatch = opt.description.match(/column "([^"]+)"/);
                    const tableMatch = opt.description.match(/table "([^"]+)"/);
                    const column = columnMatch ? columnMatch[1] : null;
                    const tableName = tableMatch ? tableMatch[1] : 'table_name_here';

                    if (column) {
                        const sqlFile = 'supabase/migrations/performance_indexes_suggestion.sql';
                        const indexName = `idx_${tableName}_${column}`;
                        const sqlStatement = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${column});`;
                        const sql = `-- Suggested index for performance optimization\n-- File: ${file}\n-- Context: Found filter on "${column}" in table "${tableName}"\n${sqlStatement}\n\n`;

                        if (!fs.existsSync(path.dirname(sqlFile))) {
                            fs.mkdirSync(path.dirname(sqlFile), { recursive: true });
                        }

                        let existingSql = '';
                        if (fs.existsSync(sqlFile)) existingSql = fs.readFileSync(sqlFile, 'utf8');

                        if (!existingSql.includes(sqlStatement)) {
                            fs.appendFileSync(sqlFile, sql);
                            opt.fixed = true;
                        }
                    }
                } else if (opt.category === 'frontend_react' && opt.description.includes('used in list mapping')) {
                    // Automated memo() wrapping for components
                    const componentName = opt.description.match(/<(\w+)>/)?.[1];
                    if (componentName) {
                        const importLine = execSync(`grep -rnE "import.*${componentName}.*from" ${file} || true`).toString();
                        const pathMatch = importLine.match(/from\s+["'](.+)["']/);
                        if (pathMatch) {
                            const importPath = pathMatch[1];
                            let resolvedPath: string | null = null;
                            if (importPath.startsWith('@/')) resolvedPath = importPath.replace('@/', 'src/') + '.tsx';
                            else if (importPath.startsWith('.')) resolvedPath = path.join(path.dirname(file), importPath) + '.tsx';

                            if (resolvedPath && fs.existsSync(resolvedPath)) {
                                let def = fs.readFileSync(resolvedPath, 'utf8');
                                if (!def.includes('memo(') && !def.includes('React.memo(')) {
                                    def = ensureReactImport(def, 'memo');

                                    // Handle both: export const MyComp = () => ... AND export function MyComp() ...
                                    const arrowMatch = def.match(new RegExp(`export\\s+const\\s+${componentName}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                    const funcMatch = def.match(new RegExp(`export\\s+function\\s+${componentName}\\s*\\(([^)]*)\\)\\s*\\{`));

                                    if (arrowMatch) {
                                        const openIdx = def.indexOf('{', arrowMatch.index);
                                        const closeIdx = findClosingBrace(def, openIdx);
                                        if (closeIdx !== -1) {
                                            const original = def.slice(arrowMatch.index, closeIdx + 1);
                                            const memoized = original.replace(`export const ${componentName} = (`, `export const ${componentName} = memo((`) + ');';
                                            def = def.replace(original, memoized);
                                            if (!def.includes(`${componentName}.displayName`)) def += `\n${componentName}.displayName = "${componentName}";\n`;
                                            fs.writeFileSync(resolvedPath, def);
                                            opt.fixed = true;
                                        }
                                    } else if (funcMatch) {
                                        // For traditional functions, rename and export a memoized constant
                                        const openIdx = def.indexOf('{', funcMatch.index);
                                        const closeIdx = findClosingBrace(def, openIdx);
                                        if (closeIdx !== -1) {
                                            const original = def.slice(funcMatch.index, closeIdx + 1);
                                            const renamed = original.replace(`export function ${componentName}`, `function _${componentName}`);
                                            const memoExport = `\nexport const ${componentName} = memo(_${componentName});\n${componentName}.displayName = "${componentName}";\n`;
                                            def = def.replace(original, renamed + memoExport);
                                            fs.writeFileSync(resolvedPath, def);
                                            opt.fixed = true;
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
                        const [, propName, setterName, setterVal] = setterMatch;
                        const handlerName = `handle${propName.charAt(0).toUpperCase() + propName.slice(1)}`;

                        // Find component name to insert hook
                        const componentMatch = content.slice(0, getLineOffset(content, lineIdx + 1)).match(/(?:export\s+)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g);
                        const componentName = componentMatch ? componentMatch[componentMatch.length - 1].split(/\s+/).pop() : null;

                        if (componentName && !content.includes(`const ${handlerName} =`)) {
                            content = ensureReactImport(content, 'useCallback');
                            const insertionIdx = findHookInsertionPoint(content, componentName);
                            if (insertionIdx !== -1) {
                                const hookCode = `\n  const ${handlerName} = useCallback(() => ${setterName}(${setterVal}), [${setterName}]);\n`;
                                content = content.slice(0, insertionIdx) + hookCode + content.slice(insertionIdx);
                                content = content.replace(setterMatch[0], `${propName}={${handlerName}}`);
                                fs.writeFileSync(file, content);
                                opt.fixed = true;
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to apply fix in ${file}:`, e);
            }
        });
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
async function runApiBenchmarks(): Promise<{ apiLatencyMs: number; tableMetrics: Record<string, number>; status: string }> {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        return { apiLatencyMs: 0, tableMetrics: {}, status: 'skipped (no credentials)' };
    }

    try {
        const supabase = createClient(url, key);
        const tables = ['items', 'subscriptions', 'health_measurements'];
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
            return { apiLatencyMs: 0, tableMetrics: {}, status: 'failed' };
        }

        return {
            apiLatencyMs: Math.round(totalLatency / successCount),
            tableMetrics,
            status: 'success'
        };
    } catch (e) {
        console.error('Benchmark error:', e);
        return { apiLatencyMs: 0, tableMetrics: {}, status: 'error' };
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
    apiStatus: apiBenchmark.status,
    tableMetrics: apiBenchmark.tableMetrics
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
  let logs: Record<string, unknown>[] = [];
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
    optimizations,
    benchmarks,
    status: optimizations.length > 0 ? 'optimizations_found' : 'healthy',
    prUrl: process.env.PR_URL
  };

  logs.unshift(summary);
  // Keep last 20 runs
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: { optimizations: OptimizationResult[]; benchmarks: { apiLatencyMs: number; beforeLatencyMs?: number; tableMetrics?: Record<string, number> }; prUrl?: string }, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const optimizations = summary.optimizations;
  const slaExceeded = summary.benchmarks.apiLatencyMs > API_RESPONSE_THRESHOLD_MS;
  const slowTables = Object.entries(summary.benchmarks.tableMetrics || {}).filter(([, latency]) => latency > API_RESPONSE_THRESHOLD_MS);

  const backendLeadId = process.env.BACKEND_LEAD_SLACK_ID || "backend-lead";
  const backendLeadTag = `<@${backendLeadId}>`;

  let text = `🚀 *Nightly Performance Sweep Report* - ${new Date().toLocaleDateString()}\n`;
  if (summary.benchmarks.beforeLatencyMs) {
      const delta = summary.benchmarks.apiLatencyMs - summary.benchmarks.beforeLatencyMs;
      const pct = summary.benchmarks.beforeLatencyMs > 0 ? Math.round((delta / summary.benchmarks.beforeLatencyMs) * 100) : 0;
      text += `⏱️ *Latency Delta:* ${summary.benchmarks.beforeLatencyMs}ms → ${summary.benchmarks.apiLatencyMs}ms (${delta >= 0 ? '+' : ''}${delta}ms, ${delta >= 0 ? '📈' : '📉'} ${Math.abs(pct)}%)\n`;
  } else {
      text += `⏱️ *Current Latency:* ${summary.benchmarks.apiLatencyMs}ms\n`;
  }

  if (prUrl || summary.prUrl) {
      text += `📦 *Pull Request:* ${prUrl || summary.prUrl}\n`;
  }

  if (slaExceeded || slowTables.length > 0) {
      text += `⚠️ *SLA THRESHOLD EXCEEDED* - cc ${backendLeadTag}\n`;
      if (slaExceeded) text += `• Average Latency: ${summary.benchmarks.apiLatencyMs}ms\n`;
      slowTables.forEach(([table, latency]) => {
          text += `• Table "${table}" is slow: ${latency}ms\n`;
      });
  }

  const message = {
    text,
    attachments: [
      {
        color: (slaExceeded || slowTables.length > 0) ? '#ef4444' : (optimizations.length > 0 ? '#f59e0b' : '#10b981'),
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
 * Scans for dead code (unused local variables)
 */
function scanForDeadCode(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const output = runGrep("const\\s+\\w+\\s*=|let\\s+\\w+\\s*=");
        const fileVars: Record<string, { var: string; line: string }[]> = {};

        output.forEach(line => {
            const parts = line.split(':');
            if (parts.length < 3) return;
            const [file, lineNum, ...contentParts] = parts;
            const content = contentParts.join(':');
            const match = content.match(/(?:const|let)\s+(\w+)\s*=/);
            if (match) {
                if (!fileVars[file]) fileVars[file] = [];
                fileVars[file].push({ var: match[1], line: lineNum });
            }
        });

        Object.entries(fileVars).forEach(([file, vars]) => {
            const content = fs.readFileSync(file, 'utf8');
            const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // Simple comment strip

            vars.forEach(v => {
                // Ignore common iterators and exported vars
                if (['i', 'j', 'k', 'idx', 'index'].includes(v.var)) return;
                if (content.includes(`export const ${v.var}`) || content.includes(`export function ${v.var}`)) return;

                const regex = new RegExp(`\\b${v.var}\\b`, 'g');
                const matches = cleanContent.match(regex);
                if (matches && matches.length === 1) {
                    results.push({
                        category: 'logic',
                        description: `Detected potentially unused variable "${v.var}"`,
                        impact: 'Redundant code increases bundle size and cognitive load',
                        file,
                        line: v.line
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
 * Scans for potential nested loops
 */
function scanForNestedLoops(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const output = execSync('grep -rnE "(\\.map|\\.forEach|for\\s*\\(|while\\s*\\()" src/ supabase/functions/ || true').toString();
        const lines = output.split('\n').filter(Boolean);
        const fileMap: Record<string, number[]> = {};

        lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length < 2) return;
            const file = parts[0];
            const lineNum = parts[1];
            if (!fileMap[file]) fileMap[file] = [];
            fileMap[file].push(parseInt(lineNum));
        });

        const contentMap: Record<string, string[]> = {};

        Object.entries(fileMap).forEach(([file, lineNums]) => {
            if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file.includes('.test.') || file.includes('node_modules')) return;

            // Skip streaming/processing patterns that naturally use nested loops
            if (file.includes('process-') || file.includes('extract-')) return;

            if (!contentMap[file]) {
                contentMap[file] = fs.readFileSync(file, 'utf8').split('\n');
            }
            const fileLines = contentMap[file];

            for (let i = 0; i < lineNums.length - 1; i++) {
                const lineA = lineNums[i];
                const lineB = lineNums[i+1];

                // If two loops are within 8 lines of each other
                if (lineB - lineA < 8) {
                    const contentA = fileLines[lineA - 1];
                    const contentB = fileLines[lineB - 1];
                    const indentA = contentA.search(/\S/);
                    const indentB = contentB.search(/\S/);

                    // If the second loop is more indented than the first, it's likely nested
                    if (indentB > indentA) {
                        results.push({
                            category: 'logic',
                            description: 'Potential nested loop detected',
                            impact: 'May lead to O(n^2) complexity',
                            file,
                            line: lineA.toString()
                        });
                    }
                }
            }
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

  const allIssues = [
    ...inefficientQueries,
    ...n1Issues,
    ...indexIssues,
    ...memoIssues,
    ...mergeIssues,
    ...logicIssues,
    ...deadCodeIssues
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
