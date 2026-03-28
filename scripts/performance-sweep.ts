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
            // Skip trivial operations
            if (lines[lineIdx].includes('.filter(Boolean)')) return;

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

    // 4. Inline objects/arrays in props
    runGrep("<[A-Z][a-zA-Z0-9]*[^>]*\\w+\\s*=\\s*\\{\\s*(\\[|\\]|\\{|\\})").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const match = line.match(/<([A-Z][a-zA-Z0-9]*)[^>]*(\w+)\s*=\s*\{(\[\]|\{\})\}/);
        if (match) {
            const [, componentName, propName] = match;
            const skipComponents = ['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2', 'TabsTrigger', 'TabsList'];
            if (skipComponents.includes(componentName)) return;

            results.push({
                category: 'frontend_react',
                description: `Detected inline empty ${match[3] === '[]' ? 'array' : 'object'} in prop "${propName}" of <${componentName}>`,
                impact: 'Causes re-render on every parent render due to new reference',
                file,
                line: lineNum,
                suggestedFix: 'Move to a constant outside component or use useMemo'
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

    // Group optimizations by file and process in descending line order to avoid offset corruption
    const fileGroups: Record<string, OptimizationResult[]> = {};
    optimizations.forEach(opt => {
        if (!opt.file || !opt.line) return;
        if (!fileGroups[opt.file]) fileGroups[opt.file] = [];
        fileGroups[opt.file].push(opt);
    });

    Object.entries(fileGroups).forEach(([filePath, opts]) => {
        // Sort descending by line number
        const sortedOpts = opts.sort((a, b) => parseInt(b.line!) - parseInt(a.line!));

        sortedOpts.forEach(opt => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
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
                    const importLines = execSync(`grep -rnE "import.*${componentName}.*from" ${opt.file} || true`).toString();
                    const pathMatch = importLines.match(/from\s+["'](.+)["']/);
                    if (pathMatch) {
                        const importPath = pathMatch[1];
                        let resolvedPath: string | null = null;
                        if (importPath.startsWith('@/')) resolvedPath = importPath.replace('@/', 'src/') + '.tsx';
                        else if (importPath.startsWith('.')) resolvedPath = path.join(path.dirname(opt.file), importPath) + '.tsx';

                        if (resolvedPath && fs.existsSync(resolvedPath)) {
                            let def = fs.readFileSync(resolvedPath, 'utf8');
                            if (!def.includes('memo(') && !def.includes('React.memo(')) {
                                def = ensureReactImport(def, 'memo');

                                // Case 1: Arrow function component
                                const arrowMatch = def.match(new RegExp(`export const ${componentName}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                if (arrowMatch) {
                                    const startIdx = arrowMatch.index!;
                                    const closingBraceIdx = findClosingBrace(def, startIdx + arrowMatch[0].indexOf('{'));

                                    if (closingBraceIdx !== -1) {
                                        const replacement = `export const ${componentName} = memo((${arrowMatch[1]}) => {${def.substring(startIdx + arrowMatch[0].indexOf('{') + 1, closingBraceIdx)}});`;
                                        def = def.substring(0, startIdx) + replacement + def.substring(closingBraceIdx + 1);

                                        if (!def.includes(`${componentName}.displayName`)) {
                                            def += `\n\n${componentName}.displayName = "${componentName}";\n`;
                                        }
                                        console.log(`✅ Automatically wrapping arrow component ${componentName} in memo() in ${resolvedPath}`);
                                        fs.writeFileSync(resolvedPath, def);
                                    }
                                }
                                // Case 2: Traditional function component
                                else {
                                    const funcMatch = def.match(new RegExp(`export function ${componentName}\\s*\\(([^)]*)\\)\\s*\\{`));
                                    if (funcMatch) {
                                        const startIdx = funcMatch.index!;
                                        const closingBraceIdx = findClosingBrace(def, startIdx + funcMatch[0].indexOf('{'));

                                        if (closingBraceIdx !== -1) {
                                            const body = def.substring(startIdx + funcMatch[0].indexOf('{') + 1, closingBraceIdx);
                                            // Rename original to avoid conflict
                                            const replacement = `const ${componentName}Base = (${funcMatch[1]}) => {${body}};\n\nexport const ${componentName} = memo(${componentName}Base);`;
                                            def = def.substring(0, startIdx) + replacement + def.substring(closingBraceIdx + 1);

                                            if (!def.includes(`${componentName}.displayName`)) {
                                                def += `\n\n${componentName}.displayName = "${componentName}";\n`;
                                            }
                                            console.log(`✅ Automatically wrapping traditional component ${componentName} in memo() in ${resolvedPath}`);
                                            fs.writeFileSync(resolvedPath, def);
                                        }
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

                    const offset = getLineOffset(content, parseInt(opt.line));
                    const componentOffset = content.lastIndexOf('export const', offset);

                    if (componentOffset !== -1) {
                        const insertionPoint = findHookInsertionPoint(content, componentOffset);
                        if (insertionPoint !== -1) {
                            let updatedContent = ensureReactImport(content, 'useCallback');

                            // Re-calculate offsets after import change
                            const currentContent = fs.readFileSync(opt.file, 'utf8');
                            const offsetDiff = updatedContent.length - currentContent.length;
                            const newInsertionPoint = insertionPoint + offsetDiff;
                            const newOffset = offset + offsetDiff;

                            const hookCode = `  const ${handlerName} = useCallback(() => ${setterName}(${setterVal}), [${setterName}]);\n`;

                            // 1. Insert Hook
                            updatedContent = updatedContent.substring(0, newInsertionPoint) + hookCode + updatedContent.substring(newInsertionPoint);

                            // 2. Replace inline call with handler (adjusting for hook insertion)
                            const lineWithHook = updatedContent.split('\n')[parseInt(opt.line) - 1 + (hookCode.split('\n').length - 1)];
                            const updatedLine = lineWithHook.replace(setterMatch[0], `${propName}={${handlerName}}`);

                            const contentLines = updatedContent.split('\n');
                            contentLines[parseInt(opt.line) - 1 + (hookCode.split('\n').length - 1)] = updatedLine;

                            fs.writeFileSync(opt.file, contentLines.join('\n'));
                            console.log(`✅ Automatically refactored inline ${propName} to useCallback in ${opt.file}`);
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
        return { apiResponseTimeMs: 0, status: 'error', slowTables: [] };
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
    status: optimizations.length > 0 ? 'optimizations_found' : 'healthy',
    prUrl: process.env.PR_URL
  };

  logs.unshift(summary);
  // Keep only the last 2 runs to avoid bloat in the repository
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 2), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: { optimizations: OptimizationResult[]; benchmarks: { apiLatencyMs: number; beforeLatencyMs?: number; slowTables?: string[] } }, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const optimizations = summary.optimizations;
  const slowTables = summary.benchmarks.slowTables || [];
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
 * Helper to get character offset of a line number
 */
function getLineOffset(content: string, lineNum: number): number {
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNum - 1; i++) {
        offset += lines[i].length + 1;
    }
    return offset;
}

/**
 * Finds the closing brace of a block starting at startIdx
 * Handles strings, comments, nested braces, and template literal interpolation.
 */
function findClosingBrace(content: string, startIdx: number): number {
    let depth = 0;
    let stack: string[] = []; // tracks '`', '"', "'", 'INTERPOLATION'
    let isEscaped = false;
    let inComment: 'single' | 'multi' | null = null;

    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (isEscaped) {
            isEscaped = false;
            continue;
        }
        if (char === '\\') {
            isEscaped = true;
            continue;
        }

        const top = stack.length > 0 ? stack[stack.length - 1] : null;

        if (inComment) {
            if (inComment === 'single' && char === '\n') inComment = null;
            if (inComment === 'multi' && char === '*' && nextChar === '/') {
                inComment = null;
                i++;
            }
            continue;
        }

        if (top === '"' || top === "'") {
            if (char === top) stack.pop();
            continue;
        }

        if (top === '`') {
            if (char === '`') stack.pop();
            else if (char === '$' && nextChar === '{') {
                stack.push('INTERPOLATION');
                depth++;
                i++;
            }
            continue;
        }

        // We are in "JS" mode (stack is empty or top is INTERPOLATION)
        if (char === '/' && nextChar === '/') {
            inComment = 'single';
            i++;
            continue;
        }
        if (char === '/' && nextChar === '*') {
            inComment = 'multi';
            i++;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            stack.push(char);
            continue;
        }

        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (top === 'INTERPOLATION') stack.pop();
            if (depth === 0) return i;
        }
    }
    return -1;
}

/**
 * Checks if the current offset is inside a React hook
 */
function isInsideHook(content: string, offset: number): boolean {
    const lookback = content.substring(Math.max(0, offset - 1000), offset);
    // Look for useMemo, useCallback, useEffect, etc.
    const hookMatch = lookback.match(/use[A-Z][a-zA-Z]+\s*\(/g);
    if (!hookMatch) return false;

    // Check if the last hook found actually contains our offset
    const lastHook = hookMatch[hookMatch.length - 1];
    const lastHookIdx = lookback.lastIndexOf(lastHook);
    const absoluteHookIdx = Math.max(0, offset - 1000) + lastHookIdx;

    const closingBraceIdx = findClosingBrace(content, absoluteHookIdx);
    return closingBraceIdx > offset;
}

/**
 * Checks if the current offset is inside a React component
 */
function isInsideComponent(content: string, offset: number): boolean {
    const lookback = content.substring(Math.max(0, offset - 2000), offset);
    const lines = lookback.split('\n');

    // Look back for component declaration
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line.match(/(const|function)\s+[A-Z][a-zA-Z0-9]*\s*(=|\()/)) {
            return true;
        }
    }
    return false;
}

/**
 * Ensures a React hook or component is imported
 */
function ensureReactImport(content: string, hookName: string): string {
    if (content.includes(`import { ${hookName} }`) || content.includes(`, ${hookName} }`)) return content;

    if (content.includes("import {") && content.includes("} from 'react'")) {
        return content.replace(/import\s+\{([^}]+)\}\s+from\s+'react'/, (m, p1) => {
            const imports = p1.split(',').map((s: string) => s.trim());
            if (!imports.includes(hookName)) imports.push(hookName);
            return `import { ${imports.join(', ')} } from 'react'`;
        });
    }

    if (content.includes("import React")) {
        return content.replace("import React", `import React, { ${hookName} }`);
    }

    return `import { ${hookName} } from 'react';\n` + content;
}

/**
 * Finds a safe insertion point for a hook at the top of a component
 */
function findHookInsertionPoint(content: string, componentOffset: number): number {
    const componentBodyStart = content.indexOf('{', componentOffset);
    if (componentBodyStart === -1) return -1;

    // Find the first line after the opening brace that isn't a comment or empty
    let searchIdx = componentBodyStart + 1;
    while (searchIdx < content.length) {
        const char = content[searchIdx];
        if (char === '\n') {
            const nextLineStart = searchIdx + 1;
            const nextLineEnd = content.indexOf('\n', nextLineStart);
            const line = content.substring(nextLineStart, nextLineEnd === -1 ? content.length : nextLineEnd).trim();
            if (line && !line.startsWith('//') && !line.startsWith('/*')) {
                return nextLineStart;
            }
        }
        searchIdx++;
    }
    return componentBodyStart + 1;
}

/**
 * Scans for dead code (unused variables or functions)
 */
function scanForDeadCode(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    // Look for const/let/function declarations
    const declarations = runGrep("(const|let|function)\\s+([a-zA-Z0-9_]+)");

    declarations.forEach(line => {
      const parts = line.split(':');
      if (parts.length < 3) return;
      const [file, lineNum, content] = parts;

      const match = content.match(/(const|let|function)\s+([a-zA-Z0-9_]+)/);
      if (!match) return;

      const name = match[2];
      const type = match[1];

      // Skip common patterns
      const skipNames = ['i', 'j', 'k', 'index', 'idx', 'val', 'value', 'item', 'key', 'error', 'err', 'props', 'params'];
      if (skipNames.includes(name) || content.includes('export')) return;

      // Check if name is used elsewhere in the same file
      const fileContent = fs.readFileSync(file, 'utf8');

      // Strip comments for usage counting
      const cleanContent = fileContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      const usageCount = (cleanContent.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;

      // usageCount should be > 1 because it's at least used in the declaration
      if (usageCount <= 1) {
        results.push({
          category: 'maintenance',
          description: `Potential dead code: unused ${type} "${name}"`,
          impact: 'Increases bundle size and maintainability overhead',
          file,
          line: lineNum,
          suggestedFix: 'Remove unused declaration'
        });
      }
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

        const contentMap: Record<string, string> = {};

        Object.entries(fileMap).forEach(([file, lineNums]) => {
            if ((!file.endsWith('.ts') && !file.endsWith('.tsx')) || file.includes('.test.') || file.includes('node_modules')) return;

            if (!contentMap[file]) {
                contentMap[file] = fs.readFileSync(file, 'utf8');
            }
            const content = contentMap[file];
            const fileLines = content.split('\n');

            for (const lineNum of lineNums) {
                const startIdx = getLineOffset(content, lineNum);
                const loopMatch = fileLines[lineNum - 1].match(/(\.map|\.forEach|for\s*\(|while\s*\(|for\s+await)/);
                if (!loopMatch) continue;

                // Find the closing brace of this loop
                const closingIdx = findClosingBrace(content, startIdx);
                if (closingIdx === -1) continue;

                const loopBody = content.substring(startIdx, closingIdx);

                // Use a fresh regex instance for inner scan
                const innerLoopRegex = /(\.map|\.forEach|for\s*\(|while\s*\(|for\s+await)/g;
                let innerMatch;
                while ((innerMatch = innerLoopRegex.exec(loopBody)) !== null) {
                    // Ignore standard streaming/buffer patterns that use loops correctly
                    if (loopBody.includes('ReadableStream') || loopBody.includes('Uint8Array')) continue;

                    results.push({
                        category: 'logic',
                        description: 'Potential nested loop (O(n^2) complexity risk)',
                        impact: 'Quadratic time complexity can severely degrade performance on large datasets',
                        file,
                        line: lineNum.toString()
                    });
                    break; // Only report once per outer loop
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

  console.log('Running performance benchmarks...');
  const beforeBenchmarks = await runBenchmarks();

  const inefficientQueries = scanForInefficientQueries();
  const n1Issues = scanForN1Queries();
  const indexIssues = scanForMissingIndexes();
  const memoIssues = scanForMissingMemo();
  const mergeIssues = reviewRecentMerges();
  const logicIssues = scanForNestedLoops();
  const deadCodeIssues = scanForDeadCode();

  const apiIssues: OptimizationResult[] = (beforeBenchmarks as any).slowTables?.map((table: string) => ({
    category: 'backend_api',
    description: `Database table "${table}" response time exceeds SLA (${API_RESPONSE_THRESHOLD_MS}ms)`,
    impact: 'Degraded user experience and potential timeout risks',
    suggestedFix: 'Consider adding indexes or optimizing the query pattern'
  })) || [];

  const allIssues = [
    ...inefficientQueries,
    ...n1Issues,
    ...indexIssues,
    ...memoIssues,
    ...mergeIssues,
    ...logicIssues,
    ...deadCodeIssues,
    ...apiIssues
  ];

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
