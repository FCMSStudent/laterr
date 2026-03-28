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
  fixed?: boolean;
}

/**
 * Helper to run grep and filter for logic files only
 */
function runGrep(pattern: string, searchPath: string | string[] = 'src/'): string[] {
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
 * Robust stack-based brace matching that handles comments, strings, and template literals
 */
function findClosingBrace(content: string, startPos: number): number {
    let depth = 0;
    let inString: string | null = null;
    let inComment: 'single' | 'multi' | null = null;
    let isEscaped = false;

    for (let i = startPos; i < content.length; i++) {
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
            if (char === '\\') {
                isEscaped = true;
            } else if (char === inString) {
                // Handle template literal interpolation
                if (char === '`' && content[i-1] === '$') {
                    // This is handled by depth for ${}
                } else {
                    inString = null;
                }
            }
            continue;
        }

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

        if (char === "'" || char === '"' || char === '`') {
            inString = char;
            continue;
        }

        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

/**
 * Converts line number to character offset
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
 * Ensures a React hook is imported from 'react'
 */
function ensureReactImport(content: string, hookName: string): string {
    if (content.includes(`${hookName}`)) return content;

    const reactImportRegex = /import\s+([\w\s,{}*]+)\s+from\s+['"]react['"]/;
    const match = content.match(reactImportRegex);

    if (match) {
        const imports = match[1].trim();
        if (imports.startsWith('{') && imports.endsWith('}')) {
            const inner = imports.slice(1, -1).trim();
            const newInner = inner ? `${inner}, ${hookName}` : hookName;
            return content.replace(match[0], `import { ${newInner} } from 'react'`);
        } else if (!imports.includes(hookName)) {
            // Mixed import or default import
            return content.replace(match[0], `import ${imports}, { ${hookName} } from 'react'`);
        }
    } else {
        return `import { ${hookName} } from 'react';\n` + content;
    }
    return content;
}

/**
 * Heuristic to check if a line is inside a React component
 */
function isInsideComponent(lines: string[], lineIdx: number): boolean {
    for (let i = lineIdx; i >= 0; i--) {
        const line = lines[i];
        if (line.match(/(export\s+)?(const|function)\s+[A-Z]\w+/)) return true;
        if (line.includes('return (') || line.includes('return <')) return false; // Already in JSX
    }
    return false;
}

/**
 * Heuristic to check if a line is already inside a hook
 */
function isInsideHook(lines: string[], lineIdx: number): boolean {
    // Check current line for hook declaration
    if (lines[lineIdx].match(/\buse(Memo|Callback|Effect)\(/)) return true;

    for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 10); i--) {
        const line = lines[i];
        if (line.match(/\buse(Memo|Callback|Effect)\(/)) return true;
        if (line.includes('export const') || line.includes('function ')) break;
    }
    return false;
}

/**
 * Finds the best place to insert a hook (top of component)
 */
function findHookInsertionPoint(lines: string[], startLineIdx: number): number {
    for (let i = startLineIdx; i >= 0; i--) {
        if (lines[i].match(/(export\s+)?(const|function)\s+[A-Z]\w+.*=>\s*\{/)) {
            return i + 1;
        }
    }
    return -1;
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
    runGrep("\\.select\\(['\"]\\*['\"],\\s*\\{[^}]*count:", ['src/', 'supabase/functions/']).forEach(line => {
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
  const paths = ['src/', 'supabase/functions/'];
  try {
    // 1. Storage removals in map
    runGrep("\\.map\\(.*removeItemStorageObjects", paths).forEach(line => {
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
    runGrep("\\.(map|forEach)\\(async", paths).forEach(line => {
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
    const awaitInLoops = execSync(`grep -rnE "(for|while)\\s*\\(" ${paths.join(' ')} -A 10 | grep "await" || true`).toString();
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
    runGrep("\\.map\\(.*createSignedUrl", paths).forEach(line => {
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
    runGrep("\\.map\\(.*supabase\\.(from|upsert|delete)", paths).forEach(line => {
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
        runGrep("\\.(eq|in|gt|lt|gte|lte|neq|like|ilike|match)\\('[a-zA-Z0-9_]+'", ['src/', 'supabase/functions/']).forEach(line => {
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

        // Skip trivial operations like .filter(Boolean)
        if (lines[lineIdx].includes('.filter(Boolean)')) return;

        // Use new helpers
        if (isInsideComponent(lines, lineIdx) && !isInsideHook(lines, lineIdx)) {
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

    // 4. Inline object/array props
    runGrep("<[A-Z][a-zA-Z0-9]*[^>]*\\w+\\s*=\\s*\\{\\s*(\\[\\]|\\{\\})\\s*\\}").forEach(line => {
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
                impact: 'Causes unnecessary re-renders as the reference changes every time',
                file,
                line: lineNum,
                suggestedFix: 'Extract to a constant or use useMemo'
            });
        }
    });

  } catch (e) {
    console.error('Error scanning for missing memo:', e);
  }
  return results;
}

/**
 * Scans for unused code (Heuristic)
 */
function scanForDeadCode(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        // Find local variables/functions: const x = ..., function y() {
        const patterns = [
            { regex: "const\\s+(\\w+)\\s*=", category: 'variable' },
            { regex: "function\\s+(\\w+)\\s*\\(", category: 'function' }
        ];

        patterns.forEach(p => {
            const matches = runGrep(p.regex, 'src/');
            const fileMap: Record<string, {name: string, line: string}[]> = {};

            matches.forEach(m => {
                const parts = m.split(':');
                const file = parts[0];
                const lineNum = parts[1];
                const lineContent = parts.slice(2).join(':');
                const nameMatch = lineContent.match(new RegExp(p.regex));

                if (nameMatch && nameMatch[1]) {
                    const name = nameMatch[1];
                    // Skip exported, common names, and react hooks
                    if (lineContent.includes('export ') ||
                        ['i', 'j', 'k', 'err', 'error', 'props', 'params'].includes(name) ||
                        name.startsWith('use')) return;

                    if (!fileMap[file]) fileMap[file] = [];
                    fileMap[file].push({ name, line: lineNum });
                }
            });

            Object.entries(fileMap).forEach(([file, names]) => {
                const content = fs.readFileSync(file, 'utf8');
                // Strip comments for usage counting
                const strippedContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

                names.forEach(n => {
                    const usageRegex = new RegExp(`\\b${n.name}\\b`, 'g');
                    const usageCount = (strippedContent.match(usageRegex) || []).length;

                    if (usageCount <= 1) { // 1 means only definition
                        results.push({
                            category: 'dead_code',
                            description: `Potential unused ${p.category} "${n.name}"`,
                            impact: 'Increases bundle size and maintainability overhead',
                            file,
                            line: n.line,
                            suggestedFix: 'Remove if truly unused'
                        });
                    }
                });
            });
        });
    } catch (e) {
        console.error('Error scanning for dead code:', e);
    }
    return results;
}

/**
 * Applies automated fixes where safe
 */
function applyFixes(optimizations: OptimizationResult[]) {
    if (!APPLY_FIXES) return;

    console.log('Applying automated fixes...');
    // Process optimizations file-by-file, descending order of line numbers to prevent offset corruption
    const byFile: Record<string, OptimizationResult[]> = {};
    optimizations.forEach(o => {
        if (o.file) {
            if (!byFile[o.file]) byFile[o.file] = [];
            byFile[o.file].push(o);
        }
    });

    Object.keys(byFile).forEach(file => {
        const fileOpts = byFile[file].sort((a, b) => parseInt(b.line || '0') - parseInt(a.line || '0'));

        fileOpts.forEach(opt => {
            if (!opt.line) return;

            try {
                let content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');
                const lineIdx = parseInt(opt.line) - 1;
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
                } else if (opt.category === 'frontend_react' && opt.description.includes('used in list mapping')) {
                    // Automated memo() wrapping for components
                    const componentName = opt.description.match(/<(\w+)>/)?.[1];
                    if (componentName) {
                        // Try to find the component definition file
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
                                    // 1. Add import
                                    def = ensureReactImport(def, 'memo');

                                    // 2. Wrap definition - support both arrow and traditional functions
                                    const arrowMatch = def.match(new RegExp(`export\\s+const\\s+${componentName}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                    const funcMatch = def.match(new RegExp(`export\\s+function\\s+${componentName}\\s*\\(([^)]*)\\)\\s*\\{`));

                                    if (arrowMatch) {
                                        const startIdx = def.indexOf(arrowMatch[0]);
                                        const bodyStart = startIdx + arrowMatch[0].length - 1;
                                        const endIdx = findClosingBrace(def, bodyStart);

                                        if (endIdx !== -1) {
                                            const body = def.slice(bodyStart, endIdx + 1);
                                            const params = arrowMatch[1];
                                            const newDef = `export const ${componentName} = memo((${params}) => ${body});\n\n${componentName}.displayName = "${componentName}";`;
                                            def = def.slice(0, startIdx) + newDef + def.slice(endIdx + 1);
                                            fs.writeFileSync(resolvedPath, def);
                                            opt.fixed = true;
                                        }
                                    } else if (funcMatch) {
                                        // For traditional functions, we rename and export memoized constant
                                        const startIdx = def.indexOf(funcMatch[0]);
                                        const bodyStart = def.indexOf('{', startIdx);
                                        const endIdx = findClosingBrace(def, bodyStart);

                                        if (endIdx !== -1) {
                                            def = def.replace(`export function ${componentName}`, `function _${componentName}`);
                                            def += `\n\nexport const ${componentName} = memo(_${componentName});\n${componentName}.displayName = "${componentName}";`;
                                            fs.writeFileSync(resolvedPath, def);
                                            opt.fixed = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (opt.category === 'frontend_react' && opt.description.includes('inline arrow function')) {
                    // Simple automated useCallback for: onClick={() => setOpen(false)}
                    const setterMatch = line.match(/(\w+)\s*=\s*\{\(\)\s*=>\s*(\/\*.*\*\/)?\s*(\w+)\((.*)\)\}/);
                    if (setterMatch) {
                        const [fullMatch, propName, , setterName, setterVal] = setterMatch;
                        const handlerName = `handle${propName.charAt(0).toUpperCase() + propName.slice(1)}`;

                        if (isInsideComponent(lines, lineIdx)) {
                            const insertionIdx = findHookInsertionPoint(lines, lineIdx);
                            if (insertionIdx !== -1) {
                                content = ensureReactImport(content, 'useCallback');
                                const newLines = content.split('\n');
                                const hookCall = `  const ${handlerName} = useCallback(() => ${setterName}(${setterVal}), [${setterName}]);`;
                                newLines.splice(insertionIdx, 0, hookCall);
                                // Adjust lineIdx because we added a line
                                const updatedLineIdx = lineIdx + 1;
                                newLines[updatedLineIdx] = newLines[updatedLineIdx].replace(fullMatch, `${propName}={${handlerName}}`);
                                fs.writeFileSync(file, newLines.join('\n'));
                                opt.fixed = true;
                            }
                        }
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
                        if (fs.existsSync(sqlFile)) {
                            existingSql = fs.readFileSync(sqlFile, 'utf8');
                        }

                        if (!existingSql.includes(sqlStatement)) {
                            fs.appendFileSync(sqlFile, sql);
                            opt.fixed = true;
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
            const latency = end - start;

            if (!error) {
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
    PR_URL: process.env.PR_URL || null
  };

  logs.unshift(summary);
  // Keep only the last 20 runs
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
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
  const slaExceeded = summary.benchmarks.apiLatencyMs > API_RESPONSE_THRESHOLD_MS || (summary.benchmarks.slowTables && summary.benchmarks.slowTables.length > 0);

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
      const slowTablesInfo = summary.benchmarks.slowTables && summary.benchmarks.slowTables.length > 0
          ? ` (Tables: ${summary.benchmarks.slowTables.join(', ')})`
          : '';
      text += `⚠️ *SLA THRESHOLD EXCEEDED (Latency: ${summary.benchmarks.apiLatencyMs}ms)${slowTablesInfo}* - cc ${backendLeadTag}\n`;
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
        const loopRegex = /(\.map|\.forEach|for\s*\(|while\s*\()/g;
        const output = execSync(`grep -rnE "(\\.map|\\.forEach|for\\s*\\(|while\\s*\\()" src/ || true`).toString();
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

            if (!contentMap[file]) {
                contentMap[file] = fs.readFileSync(file, 'utf8').split('\n');
            }
            const fileLines = contentMap[file];

            for (let i = 0; i < lineNums.length - 1; i++) {
                const lineA = lineNums[i];
                const lineB = lineNums[i+1];

                // Skip standard streaming buffer or processing patterns
                if (fileLines[lineA-1].includes('chunk') || fileLines[lineA-1].includes('buffer')) continue;

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

  // If any slow tables found, add them to backend_api results
  if (beforeBenchmarks.slowTables && beforeBenchmarks.slowTables.length > 0) {
      beforeBenchmarks.slowTables.forEach(table => {
          allIssues.push({
              category: 'backend_api',
              description: `Table "${table}" exceeded latency threshold (>500ms)`,
              impact: 'Slow API responses for this table',
              suggestedFix: 'Check for missing indexes or optimize query pattern'
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
                beforeLatencyMs: beforeBenchmarks.apiLatencyMs,
                slowTables: afterBenchmarks.slowTables
            }
          });
      }
      console.log('Performance sweep completed with auto-fixes.', { before: beforeBenchmarks, after: afterBenchmarks });
  } else {
      logResults(allIssues, beforeBenchmarks);

      if (process.env.SLACK_WEBHOOK_URL && !process.env.GITHUB_ACTIONS) {
          await sendSlackNotification({
            optimizations: allIssues,
            benchmarks: {
                apiLatencyMs: beforeBenchmarks.apiLatencyMs,
                slowTables: beforeBenchmarks.slowTables
            }
          });
      }
      console.log('Performance sweep completed.', { benchmarks: beforeBenchmarks });
  }
}

main().catch(console.error);
