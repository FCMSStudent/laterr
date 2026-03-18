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
 * Checks if a given position is inside a React component.
 */
function isInsideComponent(content: string, position: number): boolean {
    const lookBack = content.slice(0, position);
    const componentRegex = /(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g;
    let match;
    let lastComponentStart = -1;

    while ((match = componentRegex.exec(lookBack)) !== null) {
        lastComponentStart = match.index;
    }

    if (lastComponentStart === -1) return false;

    const braceIndex = content.indexOf('{', lastComponentStart);
    if (braceIndex === -1 || braceIndex > position) return false;

    const closingBrace = findClosingBrace(content, braceIndex);
    return closingBrace !== -1 && closingBrace > position;
}

/**
 * Checks if a given position is inside a React hook.
 */
function isInsideHook(content: string, position: number): boolean {
    const lookBack = content.slice(Math.max(0, position - 500), position);
    return /use[A-Z][a-zA-Z0-9]*\s*\(/.test(lookBack) || /use[A-Z][a-zA-Z0-9]*\s*\(/.test(content.slice(position, position + 50));
}

/**
 * Finds the correct insertion point for a new hook at the top level of a component body.
 */
function findHookInsertionPoint(content: string, position: number): number {
    const lookBack = content.slice(0, position);
    const componentRegex = /(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/g;
    let match;
    let lastComponentStart = -1;

    while ((match = componentRegex.exec(lookBack)) !== null) {
        lastComponentStart = match.index;
    }

    if (lastComponentStart === -1) return -1;

    const braceIndex = content.indexOf('{', lastComponentStart);
    if (braceIndex === -1) return -1;

    return braceIndex + 1;
}

/**
 * Ensures that specific React hooks are imported in a file.
 */
function ensureReactImport(content: string, hooks: string[]): string {
  if (!content.includes("from 'react'") && !content.includes('from "react"')) {
    return `import { ${hooks.join(', ')} } from 'react';\n` + content;
  }

  let updatedContent = content;
  hooks.forEach(hook => {
    const reactImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]react['"]/;
    const match = updatedContent.match(reactImportRegex);

    if (match) {
      const existingHooks = match[1].split(',').map(h => h.trim());
      if (!existingHooks.includes(hook)) {
        const newHooks = [...existingHooks, hook].join(', ');
        updatedContent = updatedContent.replace(reactImportRegex, `import { ${newHooks} } from 'react'`);
      }
    } else {
        // Handle case where react is imported as default or with *
        if (updatedContent.includes("import React") && !updatedContent.includes(hook)) {
            // If React is already there, we might need to add named imports
            updatedContent = updatedContent.replace(/import\s+React\s+from\s+['"]react['"]/, `import React, { ${hook} } from 'react'`);
        }
    }
  });

  return updatedContent;
}

/**
 * Finds the index of the closing brace for a given opening brace in a string.
 * Handles nested braces, strings, comments, and template literals.
 */
function findClosingBrace(content: string, openBraceIndex: number): number {
  let depth = 0;
  let inString: string | null = null;
  let inComment: 'single' | 'multi' | null = null;
  let isEscaped = false;
  const templateLiteralDepth = 0;

  for (let i = openBraceIndex; i < content.length; i++) {
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

    // Handle strings and template literals
    if (!inComment) {
      if (inString) {
        if (char === inString) {
          if (char === '`' && templateLiteralDepth > 0) {
            // We don't really need to track templateLiteralDepth for findClosingBrace
            // unless we care about ${} inside them, but let's keep it simple for now.
          }
          inString = null;
        } else if (inString === '`' && char === '$' && nextChar === '{') {
           // This would be tricky as it starts a new JS context.
           // For simple brace counting, we can just treat it as another {
        }
        continue;
      } else if (char === "'" || char === '"' || char === '`') {
        inString = char;
        continue;
      }
    }

    // Handle comments
    if (!inString) {
      if (inComment === 'single') {
        if (char === '\n') inComment = null;
        continue;
      } else if (inComment === 'multi') {
        if (char === '*' && nextChar === '/') {
          inComment = null;
          i++;
        }
        continue;
      } else if (char === '/' && nextChar === '/') {
        inComment = 'single';
        i++;
        continue;
      } else if (char === '/' && nextChar === '*') {
        inComment = 'multi';
        i++;
        continue;
      }
    }

    // Handle braces
    if (!inString && !inComment) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
  }

  return -1;
}

/**
 * Calculates the character offset for a given line number.
 */
function getLineOffset(content: string, lineNum: number): number {
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for \n
  }
  return offset;
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

    // 2b. Await inside for/while loops using brace tracking
    runGrep("(for|while)\\s*\\(").forEach(line => {
        const [file, lineNumStr] = line.split(':');
        const lineNum = parseInt(lineNumStr);
        const content = fs.readFileSync(file, 'utf8');
        const linesOfFile = content.split('\n');
        const currentLine = linesOfFile[lineNum - 1];

        const openBraceIdxInLine = currentLine.indexOf('{');
        if (openBraceIdxInLine === -1) return;

        const globalOpenBraceIdx = getLineOffset(content, lineNum) + openBraceIdxInLine;
        const closingBraceIdx = findClosingBrace(content, globalOpenBraceIdx);

        if (closingBraceIdx !== -1) {
            const loopBody = content.slice(globalOpenBraceIdx, closingBraceIdx);
            if (loopBody.includes('await ')) {
                results.push({
                    category: 'backend_api',
                    description: 'Detected await inside for/while loop (Potential N+1)',
                    impact: 'Sequential execution of async operations; consider batching',
                    file,
                    line: lineNum.toString()
                });
            }
        }
    });

    // 2c. createSignedUrl in loops specifically
    runGrep("\\.(map|forEach)\\(.*createSignedUrl").forEach(line => {
        const [file, lineNum] = line.split(':');
        results.push({
            category: 'backend_api',
            description: 'Detected createSignedUrl inside .map() or .forEach()',
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
    runGrep("\\.(map|forEach)\\(.*supabase\\.(from|upsert|delete)").forEach(line => {
        const [file, lineNum] = line.split(':');
        results.push({
          category: 'backend_api',
          description: 'Detected Supabase query inside .map() or .forEach() (N+1)',
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
        const lineNum = parseInt(lineNumStr);
        if (!file.endsWith('.tsx')) return;

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const lineIdx = lineNum - 1;
        if (isNaN(lineIdx) || lineIdx < 0) return;

        const currentLine = lines[lineIdx];
        // Skip trivial operations like .filter(Boolean)
        if (currentLine.includes('.filter(Boolean)') || currentLine.includes('.filter(b => b)')) return;

        const offset = getLineOffset(content, lineNum);
        if (!isInsideComponent(content, offset) || isInsideHook(content, offset)) return;

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

  } catch (e) {
    console.error('Error scanning for missing memo:', e);
  }
  return results;
}

/**
 * Applies automated fixes where safe.
 * Processes file-by-file in descending order of line numbers (bottom-up) to prevent offset corruption.
 */
function applyFixes(optimizations: OptimizationResult[]) {
    if (!APPLY_FIXES) return;

    console.log('Applying automated fixes...');

    // Group by file and sort by line descending
    const byFile: Record<string, OptimizationResult[]> = {};
    optimizations.forEach(opt => {
        if (!opt.file || !opt.line) return;
        if (!byFile[opt.file]) byFile[opt.file] = [];
        byFile[opt.file].push(opt);
    });

    Object.entries(byFile).forEach(([file, opts]) => {
        opts.sort((a, b) => parseInt(b.line!) - parseInt(a.line!));

        opts.forEach(opt => {
            try {
                const content = fs.readFileSync(opt.file!, 'utf8');
                const lines = content.split('\n');
                const lineIdx = parseInt(opt.line!) - 1;
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
                // Automated useMemo for simple assignments: const items = data.filter(...)
                const assignmentMatch = line.match(/const\s+(\w+)\s*=\s*(.+);?$/);
                if (assignmentMatch) {
                    const [, varName, expression] = assignmentMatch;
                    // Filter out expressions that are already wrapped or too simple
                    if (!expression.includes('useMemo') && expression.includes('.')) {
                        let newContent = ensureReactImport(content, ['useMemo']);
                        // Heuristic: use varName as a simple dependency if it's likely a collection
                        const depMatch = expression.match(/(\w+)\./);
                        const dep = depMatch ? depMatch[1] : '';
                        const memoized = `const ${varName} = useMemo(() => ${expression}, [${dep}]);`;
                        newContent = newContent.replace(line, memoized);
                        fs.writeFileSync(opt.file, newContent);
                        console.log(`✅ Automatically wrapped "${varName}" in useMemo in ${opt.file}`);
                    }
                } else {
                    console.log(`Recommendation: Wrap expensive operation in useMemo in ${opt.file}:${opt.line}`);
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
                                def = ensureReactImport(def, ['memo']);

                                // 2. Wrap definition
                                // Arrow function: export const Component = (props) => { ... }
                                const arrowMatch = def.match(new RegExp(`export const ${componentName}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                if (arrowMatch) {
                                    const openBraceIdx = def.indexOf('{', arrowMatch.index);
                                    const closingBraceIdx = findClosingBrace(def, openBraceIdx);
                                    if (closingBraceIdx !== -1) {
                                        const original = def.slice(arrowMatch.index, closingBraceIdx + 1);
                                        const memoized = `export const ${componentName} = memo((${arrowMatch[1]}) => {\n${def.slice(openBraceIdx + 1, closingBraceIdx)}\n});`;
                                        def = def.replace(original, memoized);
                                        if (!def.includes(`${componentName}.displayName`)) {
                                            def += `\n\n${componentName}.displayName = "${componentName}";\n`;
                                        }
                                        fs.writeFileSync(resolvedPath, def);
                                        console.log(`✅ Automatically wrapping arrow component ${componentName} in memo() in ${resolvedPath}`);
                                    }
                                } else {
                                    // Traditional function: export function Component(props) { ... }
                                    const funcMatch = def.match(new RegExp(`export function ${componentName}\\s*\\(([^)]*)\\)\\s*\\{`));
                                    if (funcMatch) {
                                        const openBraceIdx = def.indexOf('{', funcMatch.index);
                                        const closingBraceIdx = findClosingBrace(def, openBraceIdx);
                                        if (closingBraceIdx !== -1) {
                                            const original = def.slice(funcMatch.index, closingBraceIdx + 1);
                                            // Handle traditional functions by renaming the original and exporting a memoized constant
                                            const memoized = `function ${componentName}Internal(${funcMatch[1]}) {\n${def.slice(openBraceIdx + 1, closingBraceIdx)}\n}\n\nexport const ${componentName} = memo(${componentName}Internal);`;
                                            def = def.replace(original, memoized);
                                            if (!def.includes(`${componentName}.displayName`)) {
                                                def += `\n\n${componentName}.displayName = "${componentName}";\n`;
                                            }
                                            fs.writeFileSync(resolvedPath, def);
                                            console.log(`✅ Automatically wrapping traditional component ${componentName} in memo() in ${resolvedPath}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (opt.category === 'frontend_react' && opt.description.includes('inline arrow function')) {
                // Automated useCallback for simple patterns: onClick={() => setOpen(false)}
                const setterMatch = line.match(/(\w+)\s*=\s*\{\(\)\s*=>\s*(\w+)\(([^)]*)\)\}/);
                if (setterMatch) {
                    const [fullMatch, propName, setterName, setterVal] = setterMatch;
                    const handlerName = `handle${propName.charAt(0).toUpperCase() + propName.slice(1)}`;

                    const insertionPoint = findHookInsertionPoint(content, getLineOffset(content, lineIdx + 1));
                    if (insertionPoint !== -1) {
                        let newContent = ensureReactImport(content, ['useCallback']);
                        const callback = `\n  const ${handlerName} = useCallback(() => ${setterName}(${setterVal}), [${setterName}]);\n`;
                        newContent = newContent.slice(0, insertionPoint) + callback + newContent.slice(insertionPoint);
                        newContent = newContent.replace(fullMatch, `${propName}={${handlerName}}`);
                        fs.writeFileSync(opt.file, newContent);
                        console.log(`✅ Refactored inline ${propName} to ${handlerName} (useCallback) in ${opt.file}`);
                    }
                } else {
                    console.log(`Recommendation: Wrap complex inline arrow function in useCallback in ${opt.file}:${opt.line}`);
                }
            }
            } catch (e) {
                console.error(`Failed to apply fix in ${opt.file}:`, e);
            }
        });
    });
}

/**
 * Reviews recent merges for performance regressions.
 * Identifies files changed in recent merges and scans them for new inefficiencies.
 */
function reviewRecentMerges(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const lookback = process.env.GITHUB_ACTIONS ? "24 hours ago" : "7 days ago";
        const merges = execSync(`git log --merges --since="${lookback}" --pretty=format:"%h" || true`).toString().split('\n').filter(Boolean);

        const changedFiles = new Set<string>();
        merges.forEach(hash => {
            const files = execSync(`git diff-tree --no-commit-id --name-only -r ${hash} || true`).toString().split('\n').filter(Boolean);
            files.forEach(f => {
                if ((f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('node_modules') && !f.includes('.test.')) {
                    changedFiles.add(f);
                }
            });
        });

        changedFiles.forEach(file => {
            if (!fs.existsSync(file)) return;
            const content = fs.readFileSync(file, 'utf8');

            // Scan specifically for expensive hooks or loops added in this file
            if (content.includes('useEffect') || content.includes('.map(') || content.includes('supabase.')) {
                results.push({
                    category: 'process',
                    description: `File "${file}" changed in recent merge needs performance review`,
                    impact: 'New hooks or data-fetching patterns might introduce regressions',
                    file
                });
            }
        });
    } catch (e) {
        console.error('Error reviewing merges:', e);
    }
    return results;
}

/**
 * Benchmarks actual API response times if credentials are available
 */
async function runApiBenchmarks(): Promise<{ apiResponseTimeMs: number; status: string }> {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        return { apiResponseTimeMs: 0, status: 'skipped (no credentials)' };
    }

    try {
        const supabase = createClient(url, key);
        const tables = ['items', 'subscriptions', 'health_measurements'];
        let totalLatency = 0;
        let successCount = 0;

        const results: OptimizationResult[] = [];
        for (const table of tables) {
            const start = Date.now();
            const { error } = await supabase.from(table).select('id').limit(1);
            const end = Date.now();

            if (!error) {
                const latency = end - start;
                totalLatency += latency;
                successCount++;

                if (latency > API_RESPONSE_THRESHOLD_MS) {
                    results.push({
                        category: 'backend_api',
                        description: `Slow table detected: "${table}" (Latency: ${latency}ms)`,
                        impact: `Exceeds 500ms SLA threshold`
                    });
                }
            }
        }

        if (successCount === 0) {
            return { apiResponseTimeMs: 0, status: 'failed' };
        }

        return {
            apiResponseTimeMs: Math.round(totalLatency / successCount),
            status: 'success'
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
    optimizations,
    benchmarks,
    status: optimizations.length > 0 ? 'optimizations_found' : 'healthy'
  };

  logs.unshift(summary);
  // Keep only the last 20 runs to avoid bloat in the repository
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
  const slowApiOptimizations = optimizations.filter(o => o.category === 'backend_api' && o.description.includes('Latency:'));

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

  if (slaExceeded || slowApiOptimizations.length > 0) {
      text += `⚠️ *SLA THRESHOLD EXCEEDED* - cc ${backendLeadTag}\n`;
      slowApiOptimizations.forEach(o => {
          text += `  • *SLOW TABLE:* ${o.description}\n`;
      });
  }

  const message = {
    text,
    attachments: [
      {
        color: (slaExceeded || slowApiOptimizations.length > 0) ? '#ef4444' : (optimizations.length > 0 ? '#f59e0b' : '#10b981'),
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
 * Scans for potential nested loops using brace counting for better accuracy.
 */
function scanForNestedLoops(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const loopPatterns = ['\\.map\\(', '\\.forEach\\(', 'for\\s*\\(', 'while\\s*\\('];
        const lines = runGrep(`(${loopPatterns.join('|')})`);

        lines.forEach(line => {
            const [file, lineNumStr] = line.split(':');
            const lineNum = parseInt(lineNumStr);
            const content = fs.readFileSync(file, 'utf8');
            const linesOfFile = content.split('\n');
            const lineIdx = lineNum - 1;
            const currentLine = linesOfFile[lineIdx];

            // Ignore standard streaming buffer and processing patterns
            if (currentLine.includes('stream') || currentLine.includes('buffer') || currentLine.includes('chunk')) return;

            const openBraceIdxInLine = currentLine.indexOf('{');
            if (openBraceIdxInLine === -1) return;

            const globalOpenBraceIdx = getLineOffset(content, lineNum) + openBraceIdxInLine;
            const closingBraceIdx = findClosingBrace(content, globalOpenBraceIdx);

            if (closingBraceIdx !== -1) {
                const loopBody = content.slice(globalOpenBraceIdx, closingBraceIdx);
                // Search for nested loops inside the loop body using a fresh regex instance
                const nestedLoopRegex = new RegExp(`(${loopPatterns.join('|')})`, 'g');
                let match;
                while ((match = nestedLoopRegex.exec(loopBody)) !== null) {
                    results.push({
                        category: 'logic',
                        description: 'Potential nested loop detected (O(n^2))',
                        impact: 'May lead to performance degradation with large data sets',
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
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const apiIssues: OptimizationResult[] = [];

  if (url && key) {
      const supabase = createClient(url, key);
      const tables = ['items', 'subscriptions', 'health_measurements'];
      for (const table of tables) {
          const start = Date.now();
          const { error } = await supabase.from(table).select('id').limit(1);
          const end = Date.now();
          if (!error) {
              const latency = end - start;
              if (latency > API_RESPONSE_THRESHOLD_MS) {
                  apiIssues.push({
                      category: 'backend_api',
                      description: `Slow table detected: "${table}" (Latency: ${latency}ms)`,
                      impact: `Exceeds 500ms SLA threshold`
                  });
              }
          }
      }
  }

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

  const allIssues = [
    ...inefficientQueries,
    ...n1Issues,
    ...indexIssues,
    ...memoIssues,
    ...mergeIssues,
    ...logicIssues,
    ...apiIssues
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
