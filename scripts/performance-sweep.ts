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
 * Finds the index of the closing brace for a block starting at startIdx
 */
function findClosingBrace(content: string, startIdx: number): number {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let commentType = ''; // '//' or '/*'

    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (inComment) {
            if (commentType === '//' && char === '\n') {
                inComment = false;
            } else if (commentType === '/*' && char === '*' && nextChar === '/') {
                inComment = false;
                i++;
            }
            continue;
        }

        if (inString) {
            if (char === stringChar && content[i - 1] !== '\\') {
                inString = false;
            }
            continue;
        }

        if (char === '/' && nextChar === '/') {
            inComment = true;
            commentType = '//';
            i++;
            continue;
        }
        if (char === '/' && nextChar === '*') {
            inComment = true;
            commentType = '/*';
            i++;
            continue;
        }

        if ((char === "'" || char === '"' || char === '`') && content[i - 1] !== '\\') {
            inString = true;
            stringChar = char;
            continue;
        }

        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                return i;
            }
        }
    }
    return -1;
}

/**
 * Checks if a position in content is inside a React hook
 */
function isInsideHook(content: string, pos: number): boolean {
    // Look back for hook declarations
    let braceCount = 0;
    for (let i = pos; i >= 0; i--) {
        const char = content[i];
        if (char === '}') braceCount++;
        if (char === '{') {
            if (braceCount === 0) {
                // Potential start of a block (function or hook)
                // Look back for hook names
                const lookback = content.substring(Math.max(0, i - 100), i);
                if (lookback.match(/\b(useMemo|useCallback|useEffect|useState)\s*\(/)) return true;
                if (lookback.match(/\b(const|function)\s+[A-Z][a-zA-Z0-9]*\b/)) return false; // Inside component but not hook
            }
            braceCount--;
        }
    }
    return false;
}

/**
 * Finds the insertion point for a hook inside a React component
 */
function findHookInsertionPoint(content: string, componentName: string): number {
    const componentRegex = new RegExp(`(const|function)\\s+${componentName}\\b[^={]*[={]`);
    const match = content.match(componentRegex);
    if (match) {
        const startIdx = match.index! + match[0].length;
        // Skip any initial comments or whitespace
        let i = startIdx;
        while (i < content.length && (content[i] === ' ' || content[i] === '\n' || content[i] === '\t')) i++;
        return i;
    }
    return -1;
}

/**
 * Gets the character offset for a specific line number
 */
function getLineOffset(lines: string[], lineNum: number): number {
    let offset = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
        offset += lines[i].length + 1; // +1 for newline
    }
    return offset;
}

/**
 * Helper to run grep and filter for logic files only
 */
function runGrep(pattern: string, searchPath: string = 'src/'): string[] {
  try {
    // Expand search path to include supabase functions if we are at root
    let finalPath = searchPath;
    if (searchPath === 'src/') {
        finalPath = 'src/ supabase/functions/';
    }

    // Escape double quotes for the shell command
    const escapedPattern = pattern.replace(/"/g, '\\"');
    const output = execSync(`grep -rnE "${escapedPattern}" ${finalPath} || true`).toString();
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
    runGrep("\\bcreateSignedUrl\\b").forEach(line => {
        const [file, lineNumStr] = line.split(':');
        const lineNum = parseInt(lineNumStr);
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        // Check if it's inside a loop or .map
        let isInsideLoop = false;
        for (let i = lineNum - 1; i >= Math.max(0, lineNum - 10); i--) {
            if (lines[i].match(/(\.map|for\s*\(|while\s*\(|\.forEach)/)) {
                isInsideLoop = true;
                break;
            }
        }

        if (isInsideLoop) {
            results.push({
                category: 'backend_api',
                description: 'Detected createSignedUrl inside a loop/mapping',
                impact: 'High network overhead; use createSignedUrls (batched) instead',
                file,
                line: lineNum.toString(),
                suggestedFix: 'Use createSignedUrls for batching'
            });
        }
    });

    // 2d. await in loops specifically with block boundary tracking
    runGrep("\\bawait\\b").forEach(line => {
        const [file, lineNumStr] = line.split(':');
        const lineNum = parseInt(lineNumStr);
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        let isInsideLoop = false;
        for (let i = lineNum - 1; i >= Math.max(0, lineNum - 10); i--) {
            if (lines[i].match(/(\.map|for\s*\(|while\s*\(|\.forEach)/)) {
                isInsideLoop = true;
                break;
            }
        }

        if (isInsideLoop) {
            results.push({
                category: 'backend_api',
                description: 'Detected await inside loop (Potential N+1)',
                impact: 'Sequential execution of async operations; consider batching',
                file,
                line: lineNum.toString()
            });
        }
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
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const lineIdx = parseInt(lineNum) - 1;
        if (isNaN(lineIdx) || lineIdx < 0) return;

        const pos = getLineOffset(lines, lineIdx + 1);
        if (!isInsideHook(content, pos)) {
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
                                if (!def.includes('react')) {
                                     def = `import { memo } from 'react';\n` + def;
                                } else if (!def.includes('memo')) {
                                     def = def.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/, (m, p1) => `import { ${p1.trim()}, memo } from 'react'`);
                                }

                                // 2. Wrap definition (supporting arrow components and traditional functions)
                                const exportArrowMatch = def.match(/export const (\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/);
                                const exportFuncMatch = def.match(/export function (\w+)\s*\(([^)]*)\)\s*\{/);

                                if (exportArrowMatch && exportArrowMatch[1] === componentName) {
                                    const startIdx = def.indexOf(exportArrowMatch[0]);
                                    const openingBraceIdx = def.indexOf('{', startIdx);
                                    const closingBraceIdx = findClosingBrace(def, openingBraceIdx);

                                    if (closingBraceIdx !== -1) {
                                        const before = def.substring(0, startIdx);
                                        const componentDef = def.substring(startIdx, closingBraceIdx + 1);
                                        const after = def.substring(closingBraceIdx + 1);

                                        const wrappedDef = componentDef
                                            .replace(`export const ${componentName} = (`, `export const ${componentName} = memo((`)
                                            .replace(/};$/, '});');

                                        let newDef = before + wrappedDef + after;
                                        if (!newDef.includes(`${componentName}.displayName`)) {
                                            newDef += `\n\n${componentName}.displayName = "${componentName}";\n`;
                                        }
                                        fs.writeFileSync(resolvedPath, newDef);
                                        console.log(`✅ Automatically wrapped ${componentName} (arrow) in memo() in ${resolvedPath}`);
                                    }
                                } else if (exportFuncMatch && exportFuncMatch[1] === componentName) {
                                    // For traditional functions, rename and export memoized constant
                                    const originalName = `_${componentName}Internal`;
                                    def = def.replace(`export function ${componentName}`, `function ${originalName}`);
                                    def += `\n\nexport const ${componentName} = memo(${originalName});\n`;
                                    def += `${componentName}.displayName = "${componentName}";\n`;
                                    fs.writeFileSync(resolvedPath, def);
                                    console.log(`✅ Automatically wrapped ${componentName} (function) in memo() in ${resolvedPath}`);
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

                    // Find the component name to determine the insertion point
                    const componentNameMatch = content.match(/(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/);
                    if (componentNameMatch) {
                        const componentName = componentNameMatch[1];
                        const hookInsertionPoint = findHookInsertionPoint(content, componentName);

                        if (hookInsertionPoint > 0 && !content.includes(handlerName)) {
                            let newContent = content.substring(0, hookInsertionPoint) +
                                `\n  const ${handlerName} = useCallback(() => ${setterName}(${setterVal}), [${setterName}]);` +
                                content.substring(hookInsertionPoint);

                            newContent = newContent.replace(fullMatch, `${propName}={${handlerName}}`);

                            // Add useCallback to imports if missing
                            if (!newContent.includes('useCallback') && newContent.includes("from 'react'")) {
                                newContent = newContent.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/, (m, p1) => `import { ${p1.trim()}, useCallback } from 'react'`);
                            }

                            fs.writeFileSync(opt.file, newContent);
                            console.log(`✅ Automatically refactored ${propName} to useCallback in ${opt.file}`);
                        }
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
async function runApiBenchmarks(): Promise<{ apiResponseTimeMs: number; status: string; slowTables: string[] }> {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        return { apiResponseTimeMs: 0, status: 'skipped (no credentials)', slowTables: [] };
    }

    try {
        const supabase = createClient(url, key);
        const tables = ['items', 'subscriptions', 'health_measurements'];
        let totalLatency = 0;
        let successCount = 0;
        const slowTables: string[] = [];

        for (const table of tables) {
            const start = Date.now();
            const { error } = await supabase.from(table).select('id').limit(1);
            const end = Date.now();

            if (!error) {
                const latency = end - start;
                totalLatency += latency;
                successCount++;

                if (latency > API_RESPONSE_THRESHOLD_MS) {
                    slowTables.push(table);
                }
            }
        }

        if (successCount === 0) {
            return { apiResponseTimeMs: 0, status: 'failed', slowTables: [] };
        }

        return {
            apiResponseTimeMs: Math.round(totalLatency / successCount),
            status: 'success',
            slowTables
        };
    } catch (e) {
        console.error('Benchmark error:', e);
        return { apiResponseTimeMs: 0, status: 'error' };
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
    slowTables: apiBenchmark.slowTables
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
  // Keep only the last 20 runs as requested
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: {
  optimizations: OptimizationResult[];
  benchmarks: {
    apiLatencyMs: number;
    beforeLatencyMs?: number;
    before?: { apiLatencyMs: number };
    after?: { apiLatencyMs: number };
  };
}, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const optimizations = summary.optimizations;
  const benchmarks = summary.benchmarks;

  // Handle both single benchmark and before/after comparison
  const currentLatency = benchmarks.after?.apiLatencyMs ?? benchmarks.apiLatencyMs ?? 0;
  const beforeLatency = benchmarks.before?.apiLatencyMs ?? summary.benchmarks.beforeLatencyMs;

  const slaExceeded = currentLatency > API_RESPONSE_THRESHOLD_MS ||
                     optimizations.some(o => o.description.includes('exceeded SLA threshold'));

  const backendLeadId = process.env.BACKEND_LEAD_SLACK_ID || "backend-lead";
  const backendLeadTag = `<@${backendLeadId}>`;

  let text = `🚀 *Nightly Performance Sweep Report* - ${new Date().toLocaleDateString()}\n`;
  if (beforeLatency !== undefined && beforeLatency !== currentLatency) {
      const delta = currentLatency - beforeLatency;
      text += `⏱️ *Latency Delta:* ${beforeLatency}ms → ${currentLatency}ms (${delta >= 0 ? '+' : ''}${delta}ms)\n`;
  } else {
      text += `⏱️ *Current Latency:* ${currentLatency}ms\n`;
  }
  if (prUrl) {
      text += `📦 *Pull Request:* ${prUrl}\n`;
  }

  if (slaExceeded) {
      text += `⚠️ *SLA THRESHOLD EXCEEDED (Latency: ${currentLatency}ms)* - cc ${backendLeadTag}\n`;
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
 * Scans for dead code (unused variables or functions)
 */
function scanForDeadCode(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    const searchPaths = ['src/', 'supabase/functions/'];

    try {
        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) continue;

            const declarations = execSync(`grep -rnE "(const|let|var|function)\\s+\\w+" ${searchPath} || true`).toString();
            const lines = declarations.split('\n').filter(Boolean);

            const candidateMap: Record<string, { file: string, line: string, name: string }> = {};

            lines.forEach(line => {
                const parts = line.split(':');
                if (parts.length < 3) return;
                const file = parts[0];
                const lineNum = parts[1];
                const content = parts.slice(2).join(':');

                const match = content.match(/\b(const|let|var|function)\s+([a-zA-Z0-9_$]+)/);
                if (match) {
                    const [, , name] = match;
                    if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file.includes('node_modules') || file.includes('.test.')) return;

                    // Skip common iterators, exports and known globals/hook names
                    if (['i', 'j', 'k', 'index', 'idx', 'res', 'req', 'next', 'err', 'error'].includes(name)) return;
                    if (content.includes('export ')) return;
                    if (name.startsWith('use')) return; // Hooks might be used in ways grep missed

                    candidateMap[`${file}:${lineNum}:${name}`] = { file, line: lineNum, name };
                }
            });

            Object.values(candidateMap).forEach(candidate => {
                try {
                    const content = fs.readFileSync(candidate.file, 'utf8');
                    // Strip comments before counting
                    const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

                    const regex = new RegExp(`\\b${candidate.name}\\b`, 'g');
                    const matches = cleanContent.match(regex);

                    if (matches && matches.length === 1) {
                        results.push({
                            category: 'logic',
                            description: `Potential dead code: unused variable/function "${candidate.name}"`,
                            impact: 'Increases bundle size and reduces maintainability',
                            file: candidate.file,
                            line: candidate.line,
                            suggestedFix: 'Remove the unused declaration'
                        });
                    }
                } catch (e) {
                    // Ignore file read errors
                }
            });
        }
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

        Object.entries(fileMap).forEach(([file, lineNums]) => {
            if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file.includes('.test.') || file.includes('node_modules')) return;

            const content = fs.readFileSync(file, 'utf8');
            const fileLines = content.split('\n');

            // Robust nested loop detection using fresh regex instances for inner scans
            for (let i = 0; i < lineNums.length; i++) {
                const lineNum = lineNums[i];
                const lineIdx = lineNum - 1;
                const lineContent = fileLines[lineIdx];

                // Heuristic: check if this loop contains another loop within its block
                const startPos = getLineOffset(fileLines, lineNum);
                const closingBracePos = findClosingBrace(content, startPos);

                if (closingBracePos !== -1) {
                    const blockContent = content.substring(startPos, closingBracePos);
                    const innerLoopRegex = /(\.map|\.forEach|for\s*\(|while\s*\(|for\s+await)/g;

                    // Skip the loop declaration itself by slicing after the first match if necessary
                    // or just check if there are matches in the block after the initial declaration
                    const matches = blockContent.match(innerLoopRegex);
                    if (matches && matches.length > 1) {
                        results.push({
                            category: 'logic',
                            description: 'Detected O(n^2) logic (nested loop)',
                            impact: 'Significant performance degradation with large datasets',
                            file,
                            line: lineNum.toString()
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
  if (beforeBenchmarks.apiStatus === 'success' && beforeBenchmarks.slowTables?.length > 0) {
      beforeBenchmarks.slowTables.forEach((table: string) => {
          allIssues.push({
              category: 'backend_api',
              description: `API endpoint/table "${table}" exceeded SLA threshold (500ms)`,
              impact: 'Slow response times affecting user experience',
              suggestedFix: 'Optimize query or add indexes'
          });
      });
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
