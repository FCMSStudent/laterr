import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * Utility to find the closing brace for a block starting at a given offset.
 * Tracks nested braces, strings, and comments to ensure accuracy.
 */
function findClosingBrace(content: string, startOffset: number): number {
  let depth = 0;
  let inString: string | null = null;
  let inComment: 'single' | 'multi' | null = null;
  let isEscaped = false;

  for (let i = startOffset; i < content.length; i++) {
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
        inString = null;
      } else if (inString === '`' && char === '$' && nextChar === '{') {
        // Template literal interpolation: we treat this as a nested block
        // findClosingBrace for this ${...} block then continue
        const interpolationEnd = findClosingBrace(content, i + 1);
        i = interpolationEnd;
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inComment = 'single';
      i++;
    } else if (char === '/' && nextChar === '*') {
      inComment = 'multi';
      i++;
    } else if (char === '"' || char === "'" || char === '`') {
      inString = char;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Helper to convert line number to character offset
 */
function getLineOffset(content: string, lineNum: number): number {
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < lineNum - 1; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  return offset;
}

/**
 * Heuristic to check if an offset is inside a React component
 */
function isInsideComponent(content: string, offset: number): boolean {
  const textBefore = content.substring(0, offset);
  // Look for component declarations: export const Component = ..., function Component(...)
  const lastComponentDecl = Math.max(
    textBefore.lastIndexOf('export const '),
    textBefore.lastIndexOf('function ')
  );

  if (lastComponentDecl === -1) return false;

  const declText = textBefore.substring(lastComponentDecl);
  const nameMatch = declText.match(/(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/);
  if (!nameMatch) return false;

  // Check if the component body hasn't closed yet
  const bodyStart = content.indexOf('{', lastComponentDecl + nameMatch[0].length);
  if (bodyStart === -1 || bodyStart > offset) return false;

  const bodyEnd = findClosingBrace(content, bodyStart);
  return bodyEnd === -1 || bodyEnd > offset;
}

/**
 * Heuristic to check if an offset is inside a React hook
 */
function isInsideHook(content: string, offset: number): boolean {
  const textBefore = content.substring(Math.max(0, offset - 500), offset);
  // Check if we are inside useMemo, useCallback, useEffect
  const lastHookCall = Math.max(
    textBefore.lastIndexOf('useMemo('),
    textBefore.lastIndexOf('useCallback('),
    textBefore.lastIndexOf('useEffect(')
  );

  if (lastHookCall === -1) return false;

  const absoluteHookOffset = offset - (textBefore.length - lastHookCall);
  const bodyStart = content.indexOf('{', absoluteHookOffset);
  if (bodyStart === -1 || bodyStart > offset) return false;

  const bodyEnd = findClosingBrace(content, bodyStart);
  return bodyEnd === -1 || bodyEnd > offset;
}

/**
 * Finds the insertion point for a hook at the top of a component
 */
function findHookInsertionPoint(content: string, offset: number): number {
  const textBefore = content.substring(0, offset);
  const lastComponentDecl = Math.max(
    textBefore.lastIndexOf('export const '),
    textBefore.lastIndexOf('function ')
  );

  if (lastComponentDecl === -1) return -1;

  const bodyStart = content.indexOf('{', lastComponentDecl);
  if (bodyStart === -1) return -1;

  // Find the first line after the opening brace that isn't a hook or variable declaration
  const lines = content.substring(bodyStart + 1).split('\n');
  let currentOffset = bodyStart + 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('use')) {
      currentOffset += line.length + 1;
      continue;
    }
    return currentOffset;
  }

  return bodyStart + 1;
}

/**
 * Ensures required React imports exist
 */
function ensureReactImport(content: string, hooks: string[]): string {
  let updatedContent = content;
  hooks.forEach(hook => {
    if (!updatedContent.includes(hook)) {
      if (updatedContent.includes("import {") && updatedContent.includes("} from 'react'")) {
        updatedContent = updatedContent.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/, (m, p1) => {
          if (p1.includes(hook)) return m;
          return `import { ${p1.trim()}, ${hook} } from 'react'`;
        });
      } else if (!updatedContent.includes("from 'react'")) {
        updatedContent = `import { ${hook} } from 'react';\n` + updatedContent;
      }
    }
  });
  return updatedContent;
}

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
  const searchPaths = ['src/', 'supabase/functions/'];
  try {
    // 1. Storage removals in map
    runGrep("\\.map\\(.*removeItemStorageObjects", searchPaths).forEach(line => {
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
    runGrep("\\.(map|forEach)\\(async", searchPaths).forEach(line => {
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
    const paths = searchPaths.join(' ');
    const awaitInLoops = execSync(`grep -rnE "(for|while)\\s*\\(" ${paths} -A 10 | grep "await" || true`).toString();
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
    runGrep("\\.map\\(.*createSignedUrl", searchPaths).forEach(line => {
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
    runGrep("\\b(supabase|from)\\(", searchPaths).forEach(line => {
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
    runGrep("\\.map\\(.*supabase\\.(from|upsert|delete)", searchPaths).forEach(line => {
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
        const [file, lineNumStr] = line.split(':');
        const lineNum = parseInt(lineNumStr);
        if (!file.endsWith('.tsx')) return;

        const content = fs.readFileSync(file, 'utf8');
        const offset = getLineOffset(content, lineNum);

        // Skip trivial operations like .filter(Boolean) on simple arrays
        const lineText = content.split('\n')[lineNum - 1];
        if (lineText.includes('.filter(Boolean)') && !lineText.includes('const')) return;

        if (isInsideComponent(content, offset) && !isInsideHook(content, offset)) {
            const lines = content.split('\n');
            const lineIdx = lineNum - 1;

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

            // Re-read file to get full content for offset calculations
            const fullContent = fs.readFileSync(opt.file, 'utf8');

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
                                def = ensureReactImport(def, ['memo']);

                                // 2. Wrap definition (handles both arrow components and traditional functions)
                                const arrowMatch = def.match(new RegExp(`export const ${componentName}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                const functionMatch = def.match(new RegExp(`export function ${componentName}\\s*\\(([^)]*)\\)\\s*\\{`));

                                if (arrowMatch) {
                                    const startIdx = arrowMatch.index!;
                                    const bodyStart = def.indexOf('{', startIdx);
                                    const bodyEnd = findClosingBrace(def, bodyStart);
                                    if (bodyEnd !== -1) {
                                        const original = def.substring(startIdx, bodyEnd + 1);
                                        const wrapped = original.replace(`export const ${componentName} = (`, `export const ${componentName} = memo((`)
                                                                 .replace(/\};?$/, '});');
                                        def = def.substring(0, startIdx) + wrapped + def.substring(bodyEnd + 1);
                                        if (!def.includes(`${componentName}.displayName`)) {
                                            def += `\n\n${componentName}.displayName = "${componentName}";\n`;
                                        }
                                        fs.writeFileSync(resolvedPath, def);
                                        console.log(`✅ Wrapped arrow component ${componentName} in memo() in ${resolvedPath}`);
                                    }
                                } else if (functionMatch) {
                                    const startIdx = functionMatch.index!;
                                    const bodyStart = def.indexOf('{', startIdx);
                                    const bodyEnd = findClosingBrace(def, bodyStart);
                                    if (bodyEnd !== -1) {
                                        // Rename original function and export memoized version
                                        const original = def.substring(startIdx, bodyEnd + 1);
                                        const renamed = original.replace(`export function ${componentName}`, `function ${componentName}Raw`);
                                        const memoized = `\n\nexport const ${componentName} = memo(${componentName}Raw);\n${componentName}.displayName = "${componentName}";\n`;
                                        def = def.substring(0, startIdx) + renamed + memoized + def.substring(bodyEnd + 1);
                                        fs.writeFileSync(resolvedPath, def);
                                        console.log(`✅ Memoized traditional function ${componentName} in ${resolvedPath}`);
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

                    const offset = getLineOffset(fullContent, parseInt(opt.line));
                    const insertionPoint = findHookInsertionPoint(fullContent, offset);

                    if (insertionPoint !== -1) {
                        let updated = ensureReactImport(fullContent, ['useCallback']);
                        const hookCode = `\n  const ${handlerName} = useCallback(() => {\n    ${setterName}(${setterVal});\n  }, [${setterName}]);\n`;

                        // Insert hook
                        updated = updated.substring(0, insertionPoint) + hookCode + updated.substring(insertionPoint);
                        // Replace inline handler
                        updated = updated.replace(fullMatch, `${propName}={${handlerName}}`);

                        fs.writeFileSync(opt.file, updated);
                        console.log(`✅ Refactored inline ${propName} to useCallback in ${opt.file}`);
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
        const tables = ['items', 'subscriptions', 'health_measurements', 'profiles', 'bookmarks'];
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
  // Keep only the last 20 runs to avoid bloat in the repository
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: any, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const optimizations = summary.optimizations || [];

  let currentLatency = 0;
  let beforeLatency: number | undefined = undefined;

  if (summary.benchmarks?.after?.apiLatencyMs !== undefined) {
      currentLatency = summary.benchmarks.after.apiLatencyMs;
      beforeLatency = summary.benchmarks.before?.apiLatencyMs;
  } else if (summary.benchmarks?.apiLatencyMs !== undefined) {
      currentLatency = summary.benchmarks.apiLatencyMs;
  }

  const slaExceeded = currentLatency > API_RESPONSE_THRESHOLD_MS;
  const backendLeadId = process.env.BACKEND_LEAD_SLACK_ID || "backend-lead";
  const backendLeadTag = `<@${backendLeadId}>`;

  let text = `🚀 *Nightly Performance Sweep Report* - ${new Date().toLocaleDateString()}\n`;
  if (beforeLatency !== undefined) {
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
            optimizations.slice(0, 8).map((o: any) => `• [${o.category}] ${o.description} in ${o.file || 'multiple locations'}`).join('\n') +
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
    const searchPaths = ['src/', 'supabase/functions/'];
    const paths = searchPaths.join(' ');
    try {
        const output = execSync(`grep -rnE "(\\.map|\\.forEach|for\\s*\\(|while\\s*\\()" ${paths} || true`).toString();
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

                // If two loops are within 8 lines of each other
                if (lineB - lineA < 8) {
                    const contentA = fileLines[lineA - 1];
                    const contentB = fileLines[lineB - 1];
                    const indentA = contentA.search(/\S/);
                    const indentB = contentB.search(/\S/);

                    // If the second loop is more indented than the first, it's likely nested
                    if (indentB > indentA) {
                        // Ignore standard streaming buffer and processing patterns
                        if (contentA.includes('chunk') || contentA.includes('buffer') ||
                            contentB.includes('chunk') || contentB.includes('buffer')) continue;

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

/**
 * Scans for unused local variables (dead code)
 */
function scanForDeadCode(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    const searchPaths = ['src/', 'supabase/functions/'];
    try {
        // Find all const/let declarations
        const decls = runGrep("(const|let)\\s+(\\w+)\\s*=", searchPaths);
        const fileToDecls: Record<string, {name: string, line: string}[]> = {};

        decls.forEach(line => {
            const parts = line.split(':');
            if (parts.length < 3) return;
            const file = parts[0];
            const lineNum = parts[1];
            const content = parts.slice(2).join(':');

            const match = content.match(/(const|let)\s+(\w+)\s*=/);
            if (match) {
                const name = match[2];
                // Skip common iterators and short names
                if (['i', 'j', 'k', 'index', 'err', 'error', 'req', 'res', 'val', 'key', 'item'].includes(name)) return;
                if (!fileToDecls[file]) fileToDecls[file] = [];
                fileToDecls[file].push({ name, line: lineNum });
            }
        });

        Object.entries(fileToDecls).forEach(([file, items]) => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                // Basic heuristic: strip comments before counting usage
                const cleanContent = content.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

                items.forEach(item => {
                    const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const usageRegex = new RegExp(`\\b${escapedName}\\b`, 'g');
                    const matches = cleanContent.match(usageRegex);

                    if (matches && matches.length === 1) {
                        // Double check it's not exported
                        if (!content.includes(`export const ${item.name}`) &&
                            !content.includes(`export let ${item.name}`) &&
                            !content.includes(`export { ${item.name}`)) {
                            results.push({
                                category: 'dead_code',
                                description: `Potential unused variable "${item.name}"`,
                                impact: 'Unnecessary code bloat',
                                file,
                                line: item.line
                            });
                        }
                    }
                });
            } catch (e) {}
        });
    } catch (e) {
        console.error('Error scanning for dead code:', e);
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

  // Inject slow table results into allIssues if they exceed SLA
  if (beforeBenchmarks.slowTables && beforeBenchmarks.slowTables.length > 0) {
      beforeBenchmarks.slowTables.forEach(table => {
          allIssues.push({
              category: 'backend_api',
              description: `API Latency SLA exceeded for table "${table}"`,
              impact: `Response time > ${API_RESPONSE_THRESHOLD_MS}ms`
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
