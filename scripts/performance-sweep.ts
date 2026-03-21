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
 * Helper to calculate character offset from line number
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
 * Helper to run grep and filter for logic files only
 */
function runGrep(pattern: string, searchPaths: string | string[] = ['src/', 'supabase/functions/']): string[] {
  try {
    const paths = Array.isArray(searchPaths) ? searchPaths : [searchPaths];
    const existingPaths = paths.filter(p => fs.existsSync(p));
    if (existingPaths.length === 0) return [];

    const escapedPattern = pattern.replace(/"/g, '\\"');
    const output = execSync(`grep -rnE "${escapedPattern}" ${existingPaths.join(' ')} || true`).toString();
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
 * Helper to find the closing brace of a block
 */
function findClosingBrace(lines: string[], startLine: number, startOffset: number): { line: number, offset: number } | null {
  let depth = 0;
  let inString: string | null = null;
  let inComment: 'single' | 'multi' | null = null;
  let inTemplateLiteral = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (let j = (i === startLine ? startOffset : 0); j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (inComment === 'single') {
        if (j === line.length - 1) inComment = null;
        continue;
      }
      if (inComment === 'multi') {
        if (char === '*' && nextChar === '/') { inComment = null; j++; }
        continue;
      }
      if (inString) {
        if (char === inString && line[j - 1] !== '\\') inString = null;
        continue;
      }
      if (inTemplateLiteral) {
        if (char === '`' && line[j - 1] !== '\\') inTemplateLiteral = false;
        else if (char === '$' && nextChar === '{') depth++;
        continue;
      }

      if (char === '/' && nextChar === '/') { inComment = 'single'; continue; }
      if (char === '/' && nextChar === '*') { inComment = 'multi'; j++; continue; }
      if (char === "'" || char === '"') { inString = char; continue; }
      if (char === '`') { inTemplateLiteral = true; continue; }

      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) return { line: i, offset: j };
      }
    }
  }
  return null;
}

/**
 * Ensures React hooks are imported
 */
function ensureReactImport(content: string, hookName: string): string {
  if (content.includes(`{ ${hookName} }`) || content.includes(`, ${hookName} }`) || content.includes(`{ ${hookName},`)) return content;
  const reactImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
  if (reactImportMatch) {
    const imports = reactImportMatch[1].split(',').map(i => i.trim());
    if (!imports.includes(hookName)) return content.replace(reactImportMatch[0], `import { ${imports.join(', ')}, ${hookName} } from 'react'`);
  } else if (!content.includes("from 'react'")) {
    return `import { ${hookName} } from 'react';\n` + content;
  }
  return content;
}

/**
 * Finds the insertion point for hooks in a component body
 */
function findHookInsertionPoint(lines: string[], startIdx: number): number {
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('useMemo') || lines[i].includes('useCallback') || lines[i].includes('useState') || lines[i].includes('useEffect')) {
       let lastHookIdx = i;
       for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
         if (lines[j].includes('const ') && (lines[j].includes('use') || lines[j].includes('='))) lastHookIdx = j;
         else if (lines[j].trim() === '') continue;
         else break;
       }
       return lastHookIdx + 1;
    }
    if (lines[i].includes('return') || lines[i].includes('<')) return i;
  }
  return startIdx + 1;
}

/**
 * Scans for inefficient Supabase queries
 */
function scanForInefficientQueries(searchPaths?: string[]): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  runGrep("\\.select\\(['\"]\\*['\"],\\s*\\{[^}]*count:", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    results.push({
      category: 'backend_api',
      description: 'Detected .select("*") with count option',
      impact: 'Unnecessary bandwidth overhead; use .select("id") instead',
      file, line: lineNum,
      suggestedFix: 'Use .select("id", { count: ... })'
    });
  });
  return results;
}

/**
 * Scans for N+1 queries
 */
function scanForN1Queries(searchPaths?: string[]): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  runGrep("\\.map\\(.*removeItemStorageObjects", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    results.push({
      category: 'backend_api',
      description: 'Detected potential N+1 storage removal pattern',
      impact: 'Multiple storage API calls in a loop',
      file, line: lineNum,
      suggestedFix: 'Use removeMultipleItemsStorageObjects instead'
    });
  });

  runGrep("\\.(map|forEach)\\(async", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    results.push({
      category: 'backend_api',
      description: 'Detected async operation inside loop (Potential N+1)',
      impact: 'Serial or parallel individual API calls instead of batching',
      file, line: lineNum
    });
  });

  const forLoops = runGrep("(for|while)\\s*\\(", searchPaths);
  forLoops.forEach(loopLine => {
    const [file, lineNum] = loopLine.split(':');
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const lineIdx = parseInt(lineNum) - 1;
    const startOffset = lines[lineIdx].indexOf('{');
    if (startOffset === -1) return;
    const closing = findClosingBrace(lines, lineIdx, startOffset);
    if (closing) {
      for (let i = lineIdx; i <= closing.line; i++) {
        if (lines[i].includes('await ') && !lines[i].includes('Promise.all')) {
          results.push({
            category: 'backend_api',
            description: 'Detected await inside for/while loop (Potential N+1)',
            impact: 'Sequential execution of async operations; consider batching',
            file, line: (i + 1).toString()
          });
          break;
        }
      }
    }
  });

  runGrep("\\.map\\(.*createSignedUrl", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    results.push({
      category: 'backend_api',
      description: 'Detected createSignedUrl inside .map()',
      impact: 'High network overhead; use createSignedUrls (batched) instead',
      file, line: lineNum,
      suggestedFix: 'Use createSignedUrls for batching'
    });
  });

  return results;
}

/**
 * Scans for missing database indexes
 */
function scanForMissingIndexes(searchPaths?: string[]): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    const knownIndexed = ['id', 'created_at', 'user_id', 'updated_at', 'email', 'slug', 'status', 'active', 'type', 'role', 'name'];
    runGrep("\\.(eq|in|gt|lt|gte|lte|neq|like|ilike|match)\\('[a-zA-Z0-9_]+'", searchPaths).forEach(line => {
        const match = line.match(/^([^:]+):([0-9]+):.*?\.(eq|in|gt|lt|gte|lte|neq|like|ilike|match)\('([a-zA-Z0-9_]+)'/);
        if (match) {
            const [, file, lineNum, , column] = match;
            if (knownIndexed.includes(column) || column.endsWith('_id')) return;
            let tableName = 'table_name_here';
            try {
                 const content = fs.readFileSync(file, 'utf8');
                 const lines = content.split('\n');
                 const lineIdx = parseInt(lineNum) - 1;
                 for (let i = lineIdx; i >= Math.max(0, lineIdx - 10); i--) {
                     const fromMatch = lines[i].match(/\.from\(['"]([^'"]+)['"]\)/);
                     if (fromMatch) { tableName = fromMatch[1]; break; }
                 }
            } catch (e) {}
            results.push({
                category: 'database',
                description: `Potential missing index for column "${column}" in table "${tableName}"`,
                impact: 'Queries on this column may cause full table scans',
                file, line: lineNum,
                suggestedFix: `CREATE INDEX IF NOT EXISTS idx_${tableName}_${column} ON ${tableName} (${column});`
            });
        }
    });
    return results;
}

/**
 * Scans for missing memoization in React components
 */
function scanForMissingMemo(searchPaths?: string[]): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  runGrep("\\.(filter|sort|reduce)\\(", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    if (!file.endsWith('.tsx') || line.includes('.filter(Boolean)') || line.includes('.filter(b => !!b)')) return;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const lineIdx = parseInt(lineNum) - 1;
    let isInsideHook = false;
    for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 100); i--) {
        const l = lines[i];
        if (l.includes('useMemo') || l.includes('useCallback') || l.includes('useEffect')) { isInsideHook = true; break; }
        if (l.includes('export const') || l.includes('function ') || l.includes('return ')) break;
    }
    if (!isInsideHook) {
        let actualIdx = lineIdx;
        if (!lines[lineIdx].includes('const ') && lineIdx > 0 && lines[lineIdx-1].includes('const ')) actualIdx = lineIdx - 1;
        const match = lines[actualIdx].match(/const\s+(\w+)/);
        results.push({
            category: 'frontend_react',
            description: `Detected expensive operation outside useMemo${match ? ` for "${match[1]}"` : ''}`,
            impact: 'Calculation runs on every render',
            file, line: (actualIdx + 1).toString()
        });
    }
  });

  runGrep("\\.map\\(.*=>.*<[A-Z]", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    if (!file.endsWith('.tsx')) return;
    const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
    if (match) {
        const name = match[1];
        if (['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2'].some(s => name.includes(s))) return;
        let isMemoized = false;
        try {
            const importLine = execSync(`grep -rnE "import.*${name}.*from" ${file} || true`).toString();
            const pathMatch = importLine.match(/from\s+["'](.+)["']/);
            if (pathMatch) {
                let res = pathMatch[1].startsWith('@/') ? pathMatch[1].replace('@/', 'src/') + '.tsx' : path.join(path.dirname(file), pathMatch[1]) + '.tsx';
                if (fs.existsSync(res) && fs.readFileSync(res, 'utf8').match(/memo\(|React\.memo\(/)) isMemoized = true;
            }
        } catch (e) {}
        if (!isMemoized) results.push({ category: 'frontend_react', description: `Component <${name}> used in list mapping`, impact: 'May cause redundant re-renders', file, line: lineNum });
    }
  });

  runGrep("<[A-Z][a-zA-Z0-9]*[^>]*\\w+\\s*=\\s*\\{\\s*\\([^)]*\\)\\s*=>", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    if (!file.endsWith('.tsx')) return;
    const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
    if (match && !['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2'].some(s => match[1].includes(s))) {
        results.push({ category: 'frontend_react', description: `Detected inline arrow function passed to <${match[1]}>`, impact: 'Causes re-render even if memoized', file, line: lineNum });
    }
  });
  return results;
}

/**
 * Scans for dead code
 */
function scanForDeadCode(searchPaths?: string[]): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  const paths = searchPaths || ['src/'];
  const files = execSync(`find ${paths.join(' ')} -name "*.ts" -o -name "*.tsx" | grep -v "node_modules" | grep -v ".test."`).toString().split('\n').filter(Boolean);
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    Array.from(content.matchAll(/import\s+\{([^}]+)\}\s+from/g)).forEach(match => {
      match[1].split(',').map(i => i.trim().split(' as ')[0]).forEach(imp => {
        if (imp && imp !== '*' && !imp.startsWith('{') && (content.match(new RegExp(`\\b${imp}\\b`, 'g')) || []).length === 1) {
          results.push({ category: 'dead_code', description: `Unused import "${imp}"`, impact: 'Increases bundle size', file });
        }
      });
    });
    Array.from(content.matchAll(/const\s+(\w+)\s*=/g)).forEach(match => {
      const name = match[1];
      if (!['i','j','k','index','item','err','error'].includes(name) && (content.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length === 1 && !content.includes(`export const ${name}`)) {
          results.push({ category: 'dead_code', description: `Potential unused local variable "${name}"`, impact: 'Redundant logic', file });
      }
    });
  });
  return results;
}

/**
 * Scans for potential nested loops
 */
function scanForNestedLoops(searchPaths?: string[]): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    runGrep("\\.map|\\.forEach|for\\s*\\(|while\\s*\\(", searchPaths).forEach(line => {
        const [file, lineNum] = line.split(':');
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        const idx = parseInt(lineNum) - 1;
        const offset = lines[idx].indexOf('{');
        if (offset === -1) return;
        const closing = findClosingBrace(lines, idx, offset);
        if (closing) {
            for (let i = idx + 1; i < closing.line; i++) {
                if (lines[i].match(/\.map|\.forEach|for\s*\(|while\s*\(/)) {
                    results.push({ category: 'logic', description: 'Detected nested loop (Potential O(n^2))', impact: 'Performance degradation', file, line: (i + 1).toString() });
                    break;
                }
            }
        }
    });
    return results;
}

/**
 * Applies automated fixes
 */
function applyFixes(optimizations: OptimizationResult[]) {
    if (!APPLY_FIXES) return;
    const sorted = [...optimizations].sort((a, b) => {
        if (!a.file || !b.file) return 0;
        return a.file !== b.file ? a.file.localeCompare(b.file) : parseInt(b.line || '0') - parseInt(a.line || '0');
    });

    sorted.forEach(opt => {
        if (!opt.file || !opt.line) return;
        try {
            let content = fs.readFileSync(opt.file, 'utf8');
            const lines = content.split('\n');
            const idx = parseInt(opt.line) - 1;
            const line = lines[idx];

            if (opt.category === 'backend_api' && opt.description.includes('N+1 storage removal')) {
                const m = line.match(/(\w+)\.map\(\w+\s*=>\s*removeItemStorageObjects\(\w+\)\)/);
                if (m) { lines[idx] = line.replace(m[0], `removeMultipleItemsStorageObjects(${m[1]})`); fs.writeFileSync(opt.file, lines.join('\n')); }
            } else if (opt.category === 'backend_api' && opt.description.includes('select("*") with count option')) {
                const m = line.match(/\.select\((["'])\*(\1),\s*(\{[^}]*count:[^}]*\})\)/);
                if (m) { lines[idx] = line.replace(m[0], `.select(${m[1]}id${m[1]}, ${m[3]})`); fs.writeFileSync(opt.file, lines.join('\n')); }
            } else if (opt.category === 'database' && opt.description.includes('Potential missing index')) {
                const col = opt.description.match(/column "([^"]+)"/)?.[1];
                const table = opt.description.match(/table "([^"]+)"/)?.[1] || 'table_name_here';
                if (col) {
                    const sqlFile = 'supabase/migrations/performance_indexes_suggestion.sql';
                    const stmt = `CREATE INDEX IF NOT EXISTS idx_${table}_${col} ON ${table} (${col});`;
                    if (!fs.existsSync(path.dirname(sqlFile))) fs.mkdirSync(path.dirname(sqlFile), { recursive: true });
                    let existing = fs.existsSync(sqlFile) ? fs.readFileSync(sqlFile, 'utf8') : '';
                    if (!existing.includes(stmt)) fs.appendFileSync(sqlFile, `-- Suggested index\n-- File: ${opt.file}\n${stmt}\n\n`);
                }
            } else if (opt.category === 'frontend_react' && opt.description.includes('used in list mapping')) {
                const name = opt.description.match(/<(\w+)>/)?.[1];
                if (name) {
                    const imp = execSync(`grep -rnE "import.*${name}.*from" ${opt.file} || true`).toString();
                    const pm = imp.match(/from\s+["'](.+)["']/);
                    if (pm) {
                        let res = pm[1].startsWith('@/') ? pm[1].replace('@/', 'src/') + '.tsx' : path.join(path.dirname(opt.file), pm[1]) + '.tsx';
                        if (fs.existsSync(res)) {
                            let def = fs.readFileSync(res, 'utf8');
                            if (!def.includes('memo(')) {
                                def = ensureReactImport(def, 'memo');
                                if (def.includes(`export const ${name} = (`)) {
                                    def = def.replace(`export const ${name} = (`, `export const ${name} = memo((`);
                                    const dLines = def.split('\n');
                                    const sIdx = dLines.findIndex(l => l.includes(`export const ${name} = memo(`));
                                    const cl = findClosingBrace(dLines, sIdx, dLines[sIdx].indexOf('{'));
                                    if (cl) { dLines[cl.line] = dLines[cl.line].substring(0, cl.offset + 1) + ');' + dLines[cl.line].substring(cl.offset + 2); def = dLines.join('\n'); }
                                } else if (def.includes(`export function ${name}`)) {
                                    def = def.replace(`export function ${name}`, `function ${name}Internal`).concat(`\n\nexport const ${name} = memo(${name}Internal);\n${name}.displayName = "${name}";\n`);
                                }
                                fs.writeFileSync(res, def);
                            }
                        }
                    }
                }
            } else if (opt.category === 'frontend_react' && opt.description.includes('inline arrow function')) {
                // Simplified fix: suggest manual refactoring due to dependency risks
                console.log(`Recommendation: Refactor inline handler in ${opt.file}:${opt.line} to useCallback`);
            }
        } catch (e) {}
    });
}

/**
 * Reviews recent merges
 */
function reviewRecentMerges(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const lookback = process.env.GITHUB_ACTIONS ? "24 hours ago" : "7 days ago";
        const merges = execSync(`git log --merges --since="${lookback}" --pretty=format:"%h %s" || true`).toString();
        merges.split('\n').filter(Boolean).forEach(merge => {
            const hash = merge.split(' ')[0];
            const changed = execSync(`git diff --name-only ${hash}^..${hash} || true`).toString().split('\n').filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && fs.existsSync(f));
            if (changed.length > 0) {
                results.push(...scanForInefficientQueries(changed), ...scanForN1Queries(changed), ...scanForMissingIndexes(changed), ...scanForMissingMemo(changed), ...scanForNestedLoops(changed));
            }
        });
    } catch (e) {}
    return results;
}

/**
 * Benchmarks API
 */
async function runApiBenchmarks(): Promise<{ apiLatencyMs: number; tableBenchmarks: any[]; status: string; issues: OptimizationResult[] }> {
    const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { apiLatencyMs: 0, tableBenchmarks: [], status: 'skipped', issues: [] };
    try {
        const supabase = createClient(url, key), tables = ['items', 'subscriptions', 'health_measurements'], benchmarks = [], issues: OptimizationResult[] = [];
        let total = 0;
        for (const t of tables) {
            const s = Date.now();
            const { error } = await supabase.from(t).select('id').limit(1);
            const l = Date.now() - s;
            benchmarks.push({ table: t, latency: l, success: !error });
            if (!error) total += l;
            if (l > API_RESPONSE_THRESHOLD_MS) issues.push({ category: 'backend_api', description: `Slow table latency (${l}ms) for "${t}"`, impact: 'Exceeds SLA threshold', suggestedFix: 'Check indexing or query plan' });
        }
        return { apiLatencyMs: Math.round(total / tables.length), tableBenchmarks: benchmarks, status: 'success', issues };
    } catch (e) { return { apiLatencyMs: 0, tableBenchmarks: [], status: 'error', issues: [] }; }
}

/**
 * Sends Slack Notification
 */
async function sendSlackNotification(summary: any, prUrl?: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;
    const slaExceeded = summary.benchmarks.apiLatencyMs > API_RESPONSE_THRESHOLD_MS || summary.benchmarks.tableBenchmarks?.some((b: any) => b.latency > API_RESPONSE_THRESHOLD_MS);
    const tag = `<@${process.env.BACKEND_LEAD_SLACK_ID || "backend-lead"}>`;
    let text = `🚀 *Nightly Performance Sweep Report*\n`;
    if (summary.benchmarks.before) text += `⏱️ *Latency Delta:* ${summary.benchmarks.before.apiLatencyMs}ms → ${summary.benchmarks.after.apiLatencyMs}ms\n`;
    else text += `⏱️ *Current Latency:* ${summary.benchmarks.apiLatencyMs}ms\n`;
    if (prUrl) text += `📦 *Pull Request:* ${prUrl}\n`;
    if (slaExceeded) text += `⚠️ *SLA VIOLATION* - cc ${tag}\n`;
    const msg = { text, attachments: [{ color: slaExceeded ? '#ef4444' : '#10b981', title: 'Optimization Summary', text: summary.optimizations.slice(0, 8).map((o: any) => `• [${o.category}] ${o.description}`).join('\n') || 'Healthy' }] };
    await fetch(webhookUrl, { method: 'POST', body: JSON.stringify(msg) });
}

async function main() {
  if (process.env.SEND_NOTIFICATION_ONLY) {
    if (fs.existsSync('performance-summary.json')) {
      const summary = JSON.parse(fs.readFileSync('performance-summary.json', 'utf8'));
      await sendSlackNotification(summary, process.env.PR_URL);
    }
    return;
  }

  console.log('Starting nightly performance sweep...');
  const api = await runApiBenchmarks();
  const allIssues = [...api.issues, ...scanForInefficientQueries(), ...scanForN1Queries(), ...scanForMissingIndexes(), ...scanForMissingMemo(), ...reviewRecentMerges(), ...scanForNestedLoops(), ...scanForDeadCode()];

  const before: any = { timestamp: new Date().toISOString(), apiLatencyMs: api.apiLatencyMs, tableBenchmarks: api.tableBenchmarks, apiStatus: api.status, bundleSizeKB: 0 };
  try { if (fs.existsSync('dist')) {
      const fsiz = execSync('find dist -name "*.js"').toString().split('\n').filter(Boolean).reduce((acc, f) => acc + fs.statSync(f).size, 0);
      before.bundleSizeKB = Math.round(fsiz / 1024);
  }} catch(e){}

  if (APPLY_FIXES && allIssues.length > 0) {
      applyFixes(allIssues);
      const after = { ...before, timestamp: new Date().toISOString() };
      const logPath = path.join(process.cwd(), 'performance-logs.json');
      let logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
      const summary = { timestamp: new Date().toISOString(), type: 'nightly_sweep', optimizations: allIssues, benchmarks: { before, after }, status: 'optimizations_found' };
      logs.unshift(summary);
      fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
      fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
  } else {
      const summary = { timestamp: new Date().toISOString(), type: 'nightly_sweep', optimizations: allIssues, benchmarks: before, status: allIssues.length > 0 ? 'optimizations_found' : 'healthy' };
      const logPath = path.join(process.cwd(), 'performance-logs.json');
      let logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
      logs.unshift(summary);
      fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
      fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
  }
  console.log('Performance sweep completed.');
}

main().catch(console.error);
