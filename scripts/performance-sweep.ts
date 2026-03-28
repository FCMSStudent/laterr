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
 * Helper to get character offset of a line
 */
function getLineOffset(content: string, lineNum: number): number {
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
        offset += lines[i].length + 1; // +1 for newline
    }
    return offset;
}

/**
 * Robustly finds the closing brace matching an opening one at a given offset
 */
function findClosingBrace(content: string, startOffset: number): number {
    let depth = 0;
    let i = startOffset;
    let inString: string | null = null;
    let inComment: 'single' | 'multi' | null = null;
    let escaped = false;

    while (i < content.length) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (escaped) {
            escaped = false;
            i++;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            i++;
            continue;
        }

        if (!inString && !inComment) {
            if (char === '/' && nextChar === '/') {
                inComment = 'single';
                i += 2;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                inComment = 'multi';
                i += 2;
                continue;
            }
            if (char === "'" || char === '"' || char === '`') {
                inString = char;
                i++;
                continue;
            }
            if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;
                if (depth === 0) return i;
            }
        } else if (inComment === 'single') {
            if (char === '\n') inComment = null;
        } else if (inComment === 'multi') {
            if (char === '*' && nextChar === '/') {
                inComment = null;
                i += 2;
                continue;
            }
        } else if (inString) {
            if (char === inString) {
                inString = null;
            } else if (inString === '`' && char === '$' && nextChar === '{') {
                // Template literal interpolation
                // We need to find the closing brace of the interpolation
                const closingBrace = findClosingBrace(content, i + 1);
                i = closingBrace + 1;
                continue;
            }
        }
        i++;
    }
    return -1;
}

/**
 * Checks if a position is inside a React hook (useMemo, useCallback, etc.)
 */
function isInsideHook(content: string, offset: number): boolean {
    const lookback = content.slice(Math.max(0, offset - 1000), offset);
    const hookMatch = lookback.match(/(useMemo|useCallback|useEffect|useState|useQuery)\s*\(/g);
    if (!hookMatch) return false;

    // More robust: find the last hook declaration and see if its closing brace is after offset
    let lastIndex = -1;
    const hookRegex = /(useMemo|useCallback|useEffect|useState|useQuery)\s*\(/g;
    let m;
    while ((m = hookRegex.exec(lookback)) !== null) {
        lastIndex = m.index + (offset - lookback.length);
    }

    if (lastIndex !== -1) {
        const openingBrace = content.indexOf('{', lastIndex);
        if (openingBrace !== -1 && openingBrace < offset) {
            const closingBrace = findClosingBrace(content, openingBrace);
            return closingBrace > offset;
        }
    }
    return false;
}

/**
 * Checks if a position is inside a React component
 */
function isInsideComponent(content: string, offset: number): boolean {
    const lookback = content.slice(0, offset);
    // Matches: export const MyComponent = ... or function MyComponent ...
    const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g;
    let lastMatch;
    let m;
    while ((m = componentRegex.exec(lookback)) !== null) {
        lastMatch = m;
    }

    if (lastMatch) {
        const componentStart = lastMatch.index;
        const openingBrace = content.indexOf('{', componentStart);
        if (openingBrace !== -1 && openingBrace < offset) {
            const closingBrace = findClosingBrace(content, openingBrace);
            return closingBrace > offset;
        }
    }
    return false;
}

/**
 * Finds the best line index to insert a hook (after other hooks, start of component)
 */
function findHookInsertionPoint(content: string, lineNum: number): number {
    const lines = content.split('\n');
    let componentStartLine = -1;

    // Find the start of the component body
    for (let i = lineNum - 1; i >= 0; i--) {
        if (lines[i].match(/(?:export\s+)?(?:const|function)\s+[A-Z]/)) {
            componentStartLine = i;
            break;
        }
    }

    if (componentStartLine === -1) return -1;

    // Find the opening brace of the component
    let openingBraceLine = -1;
    for (let i = componentStartLine; i < lines.length; i++) {
        if (lines[i].includes('{')) {
            openingBraceLine = i;
            break;
        }
    }

    if (openingBraceLine === -1) return -1;

    // Skip initial hooks if they exist
    let insertionLine = openingBraceLine + 1;
    for (let i = insertionLine; i < lines.length; i++) {
        if (lines[i].match(/^\s*(use[A-Z]|const\s+\[.*\]\s*=\s*use)/)) {
            insertionLine = i + 1;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('//')) {
            break;
        }
    }

    return insertionLine;
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
 * Scans for dead code (unused variables or functions)
 */
function scanForDeadCode(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        // Find all local variable declarations (const x =, let y =)
        const declarations = runGrep("const\\s+\\w+\\s*=|let\\s+\\w+\\s*=");
        const usageCount: Record<string, { count: number, file: string, line: string }> = {};

        declarations.forEach(line => {
            const match = line.match(/^([^:]+):([0-9]+):.*?(const|let)\s+(\w+)\s*=/);
            if (match) {
                const [, file, lineNum, , varName] = match;
                // Skip common iterators and exported variables (heuristic)
                if (['i', 'j', 'k', 'index', 'idx', 'item', 'key', 'val', 'value'].includes(varName)) return;

                const key = `${file}:${varName}`;
                if (!usageCount[key]) {
                    usageCount[key] = { count: 0, file, line: lineNum };
                }
            }
        });

        // Heuristic: Check usage in the same file
        Object.keys(usageCount).forEach(key => {
            const [file, varName] = key.split(':');
            try {
                const content = fs.readFileSync(file, 'utf8');
                // Strip comments for accurate usage count
                const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
                const regex = new RegExp(`\\b${varName}\\b`, 'g');
                const matches = cleanContent.match(regex);

                // If usage count is 1, it's just the declaration
                if (matches && matches.length === 1) {
                    results.push({
                        category: 'logic',
                        description: `Potential dead code: unused variable "${varName}"`,
                        impact: 'Reduces code maintainability and slightly increases bundle size',
                        file,
                        line: usageCount[key].line
                    });
                }
            } catch (e) {
                // Ignore errors reading files
            }
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
    // 1. .select('*', { count: ... })
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
        const [file, lineNumStr] = line.split(':');
        if (!file.endsWith('.tsx')) return;
        const lineNum = parseInt(lineNumStr);

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const lineIdx = lineNum - 1;
        const offset = getLineOffset(content, lineNum);

        if (isInsideHook(content, offset)) return;
        if (!isInsideComponent(content, offset)) return;

        // Filter out trivial operations like .filter(Boolean) on simple arrays
        if (content.slice(offset, offset + 50).includes('.filter(Boolean)')) {
            const lineContent = lines[lineIdx];
            if (lineContent.includes('=[]') || lineContent.includes('= []')) return;
        }

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

    // 4. Inline object/array props
    runGrep("<[A-Z][a-zA-Z0-9]*[^>]*\\w+\\s*=\\s*\\{\\s*(\\[\\]|\\{\\s*\\})\\s*\\}").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match) {
            const componentName = match[1];
            const skipComponents = ['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2'];
            if (skipComponents.includes(componentName)) return;

            results.push({
                category: 'frontend_react',
                description: `Detected inline object/array prop passed to <${componentName}>`,
                impact: 'Causes re-render on every cycle; lift to top level or useMemo',
                file,
                line: lineNum
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
    optimizations.forEach(opt => {
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
                                if (!def.includes('import {') || !def.includes('react')) {
                                     def = `import { memo } from 'react';\n` + def;
                                } else if (!def.includes('memo')) {
                                     def = def.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/, (m, p1) => `import { ${p1.trim()}, memo } from 'react'`);
                                }

                                // 2. Wrap definition (Supports both arrow and traditional functions)
                                const arrowMatch = def.match(new RegExp(`export const ${componentName}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                const tradMatch = def.match(new RegExp(`export function ${componentName}\\s*\\(([^)]*)\\)\\s*\\{`));

                                if (arrowMatch) {
                                    const openingBraceIdx = def.indexOf('{', arrowMatch.index);
                                    const closingBraceIdx = findClosingBrace(def, openingBraceIdx);
                                    if (closingBraceIdx !== -1) {
                                        const body = def.slice(openingBraceIdx, closingBraceIdx + 1);
                                        const memoized = `export const ${componentName} = memo((${arrowMatch[1]}) => ${body});`;
                                        def = def.slice(0, arrowMatch.index) + memoized + def.slice(closingBraceIdx + 1);
                                        if (!def.includes(`${componentName}.displayName`)) def += `\n${componentName}.displayName = "${componentName}";\n`;
                                        fs.writeFileSync(resolvedPath, def);
                                        console.log(`✅ Wrapped arrow component ${componentName} in memo()`);
                                    }
                                } else if (tradMatch) {
                                    // For traditional functions, rename and export memoized constant to mitigate hoisting issues
                                    const openingBraceIdx = def.indexOf('{', tradMatch.index);
                                    const closingBraceIdx = findClosingBrace(def, openingBraceIdx);
                                    if (closingBraceIdx !== -1) {
                                        const internalName = `_${componentName}`;
                                        const updatedFunc = def.slice(tradMatch.index, closingBraceIdx + 1).replace(`function ${componentName}`, `function ${internalName}`);
                                        const memoExport = `\nexport const ${componentName} = memo(${internalName});\n${componentName}.displayName = "${componentName}";\n`;
                                        def = def.slice(0, tradMatch.index) + updatedFunc + memoExport + def.slice(closingBraceIdx + 1);
                                        fs.writeFileSync(resolvedPath, def);
                                        console.log(`✅ Refactored traditional function ${componentName} to use memo()`);
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

                    // Use robust helpers to find insertion point
                    const componentContent = fs.readFileSync(opt.file, 'utf8');
                    const insertionLine = findHookInsertionPoint(componentContent, parseInt(opt.line));

                    if (insertionLine !== -1) {
                        const lines = componentContent.split('\n');
                        // check for naming collision
                        let finalHandlerName = handlerName;
                        if (componentContent.includes(`const ${finalHandlerName}`)) {
                            finalHandlerName = `${handlerName}Generated`;
                        }

                        const callbackHook = `  const ${finalHandlerName} = useCallback(() => ${setterName}(${setterVal}), [${setterName}${setterVal.match(/^\w+$/) ? `, ${setterVal}` : ''}]);`;
                        lines.splice(insertionLine - 1, 0, callbackHook);

                        // Update the prop in the JSX
                        const updatedLineIdx = parseInt(opt.line); // Offset by 1 because of insertion
                        lines[updatedLineIdx] = lines[updatedLineIdx].replace(fullMatch, `${propName}={${finalHandlerName}}`);

                        // Ensure useCallback is imported
                        let finalContent = lines.join('\n');
                        if (!finalContent.includes('useCallback') && finalContent.includes("from 'react'")) {
                            finalContent = finalContent.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/, (m, p1) => `import { ${p1.trim()}, useCallback } from 'react'`);
                        }

                        fs.writeFileSync(opt.file, finalContent);
                        console.log(`✅ Refactored inline handler to useCallback: ${finalHandlerName} in ${opt.file}`);
                    }
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
async function runApiBenchmarks(): Promise<{ apiResponseTimeMs: number; status: string; findings: OptimizationResult[] }> {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const findings: OptimizationResult[] = [];

    if (!url || !key) {
        return { apiResponseTimeMs: 0, status: 'skipped (no credentials)', findings: [] };
    }

    try {
        const supabase = createClient(url, key);
        const tables = ['items', 'subscriptions', 'health_measurements'];
        let totalLatency = 0;
        let successCount = 0;

        for (const table of tables) {
            const start = Date.now();
            const { error } = await supabase.from(table).select('id').limit(1);
            const end = Date.now();

            if (!error) {
                const latency = end - start;
                totalLatency += latency;
                successCount++;

                if (latency > API_RESPONSE_THRESHOLD_MS) {
                    findings.push({
                        category: 'backend_api',
                        description: `Database table "${table}" response time (${latency}ms) exceeds SLA`,
                        impact: 'Slow API response times; check for missing indexes or complex queries',
                    });
                }
            }
        }

        if (successCount === 0) {
            return { apiResponseTimeMs: 0, status: 'failed', findings: [] };
        }

        return {
            apiResponseTimeMs: Math.round(totalLatency / successCount),
            status: 'success',
            findings
        };
    } catch (e) {
        console.error('Benchmark error:', e);
        return { apiResponseTimeMs: 0, status: 'error', findings: [] };
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
    apiLatencyMs: apiBenchmark.apiResponseTimeMs,
    apiStatus: apiBenchmark.status,
    findings: apiBenchmark.findings
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
    optimizations,
    benchmarks,
    status: optimizations.length > 0 ? 'optimizations_found' : 'healthy'
  };

  logs.unshift(summary);
  // Keep only the last 20 runs to maintain a history without excessive bloat
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: { optimizations: OptimizationResult[]; benchmarks: { apiLatencyMs: number; beforeLatencyMs?: number } }, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const optimizations = summary.optimizations;
  const slaExceeded = summary.benchmarks.apiLatencyMs > API_RESPONSE_THRESHOLD_MS;

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
      text += `⚠️ *SLA THRESHOLD EXCEEDED (Latency: ${summary.benchmarks.apiLatencyMs}ms)* - cc ${backendLeadTag}\n`;
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
 * Scans for potential nested loops using brace counting for O(n^2) logic
 */
function scanForNestedLoops(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const paths = ['src/', 'supabase/functions/'];
        const output = execSync(`grep -rnE "(\\.map|\\.forEach|for\\s*\\(|while\\s*\\()" ${paths.join(' ')} || true`).toString();
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

        Object.entries(fileMap).forEach(([file, lineNums]) => {
            if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file.includes('.test.') || file.includes('node_modules')) return;

            const content = fs.readFileSync(file, 'utf8');
            const fileLines = content.split('\n');

            for (const lineNum of lineNums) {
                const offset = getLineOffset(content, lineNum);
                const openingBrace = content.indexOf('{', offset);
                if (openingBrace === -1) continue;

                const closingBrace = findClosingBrace(content, openingBrace);
                if (closingBrace === -1) continue;

                const loopBody = content.slice(openingBrace, closingBrace);

                // Heuristic: Check for another loop pattern inside this loop's body
                // Use a fresh regex for the inner scan to avoid lastIndex state pollution
                const innerLoopRegex = /(\.map|\.forEach|for\s*\(|while\s*\(|filter\(|find\()/g;
                let m;
                while ((m = innerLoopRegex.exec(loopBody)) !== null) {
                    // Ignore standard streaming buffer and processing patterns
                    const matchText = m[0];
                    if (loopBody.includes('chunk') || loopBody.includes('buffer') || loopBody.includes('Stream')) continue;

                    results.push({
                        category: 'logic',
                        description: 'Robust O(n^2) logic detected',
                        impact: 'Quadratic complexity can significantly degrade performance',
                        file,
                        line: lineNum.toString()
                    });
                    break; // Only flag once per outer loop
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
  const deadCode = scanForDeadCode();

  const allIssues = [
    ...inefficientQueries,
    ...n1Issues,
    ...indexIssues,
    ...memoIssues,
    ...mergeIssues,
    ...logicIssues,
    ...deadCode
  ];

  const beforeBenchmarks = await runBenchmarks();
  if (beforeBenchmarks.findings) {
      allIssues.push(...beforeBenchmarks.findings);
  }

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
