import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Performance thresholds
const API_RESPONSE_THRESHOLD_MS = 500;
const APPLY_FIXES = process.argv.includes('--apply-fixes');
const GENERATE_PR_BODY = process.argv.includes('--generate-pr-body');

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
function runGrep(pattern: string, searchPath: string = 'src/'): string[] {
  try {
    const shellPattern = pattern.replace(/"/g, '\\"');
    const output = execSync(`grep -rnE "${shellPattern}" ${searchPath} || true`).toString();
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
    const awaitInLoops = execSync('grep -rnE "(for|while)\\s*\\(" src/ -A 10 | grep "await" || true').toString();
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
        runGrep("\\.(eq|in|gt|lt|gte|lte|neq|like|ilike|match)\\('[a-zA-Z0-9_]+'").forEach(line => {
            const match = line.match(/^([^:]+):([0-9]+):.*?\.(eq|in|gt|lt|gte|lte|neq|like|ilike|match)\('([a-zA-Z0-9_]+)'/);
            if (match) {
                const [, file, lineNum, , column] = match;
                if (knownIndexedColumns.includes(column) || column.endsWith('_id')) return;

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
                } catch (e) {}

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
 * Scans for inefficient database queries (e.g., select(*))
 */
function scanForInefficientQueries(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        runGrep("\\.select\\(['\"]\\*['\"]\\)").forEach(line => {
            const [file, lineNum] = line.split(':');
            results.push({
                category: 'database',
                description: 'Detected select(*) query pattern',
                impact: 'Over-fetching data; impacts bandwidth and memory',
                file,
                line: lineNum,
                suggestedFix: 'Specify only the columns needed'
            });
        });
    } catch (e) {
        console.error('Error scanning for inefficient queries:', e);
    }
    return results;
}

/**
 * Scans for potential nested loops or O(n^2) logic
 */
function scanForNestedLoops(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    try {
        const files = execSync('find src -name "*.tsx" -o -name "*.ts" | grep -v node_modules').toString().split('\n').filter(Boolean);

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('.map(') || line.includes('.forEach(')) {
                    let hasCallback = false;
                    for (let k = i; k < Math.min(i + 3, lines.length); k++) {
                        if (lines[k].includes('=>')) {
                            hasCallback = true;
                            break;
                        }
                    }

                    if (hasCallback) {
                        let braceLevel = 0;
                        for (let k = i; k < lines.length; k++) {
                            const l = lines[k];
                            braceLevel += (l.match(/\{/g) || []).length;
                            braceLevel -= (l.match(/\}/g) || []).length;

                            if (k > i) {
                                if (l.includes('.filter(') || l.includes('.sort(') ||
                                    l.includes('.reduce(') || l.includes('.find(') ||
                                    l.includes('.map(')) {

                                    results.push({
                                        category: 'logic',
                                        description: 'Detected potential O(n^2) nested array operation',
                                        impact: 'Performance scales quadratically with collection size',
                                        file,
                                        line: (i + 1).toString(),
                                        suggestedFix: 'Move the inner operation outside the loop or use a Map for lookups'
                                    });
                                    break;
                                }
                            }
                            if (braceLevel <= 0 && k > i) break;
                            if (k - i > 20) break;
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error scanning for nested loops:', e);
    }
    return results;
}

/**
 * Scans for missing memoization in React components
 */
function scanForMissingMemo(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    runGrep("\\.(filter|sort|reduce)\\(").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const lineIdx = parseInt(lineNum) - 1;
        if (isNaN(lineIdx) || lineIdx < 0) return;

        let isInsideHook = false;
        for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 50); i--) {
            const l = lines[i];
            if (l.includes('useMemo') || l.includes('useCallback') || l.includes('useEffect')) {
                isInsideHook = true;
                break;
            }
            if (l.includes('export const') || l.includes('function ')) break;
        }

        if (!isInsideHook) {
            results.push({
                category: 'frontend_react',
                description: `Expensive operation (${lines[lineIdx].includes('filter') ? 'filter' : 'sort/reduce'}) outside useMemo`,
                impact: 'Calculation runs on every render',
                file,
                line: lineNum,
                suggestedFix: 'Wrap in useMemo'
            });
        }
    });

    runGrep("\\.map\\(.*=>.*<[A-Z]").forEach(line => {
        const [file, lineNum] = line.split(':');
        if (!file.endsWith('.tsx')) return;

        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match) {
            const componentName = match[1];
            const skipComponents = ['Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar', 'Loader2'];
            if (skipComponents.includes(componentName)) return;

            results.push({
                category: 'frontend_react',
                description: `Component <${componentName}> used in list mapping`,
                impact: 'May cause redundant re-renders if not memoized',
                file,
                line: lineNum,
                suggestedFix: `Check if <${componentName}> is memoized`
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

            if (opt.category === 'database' && opt.description.includes('select(*)')) {
                if (line.includes('.select("*", { count: "exact"') || line.includes(".select('*', { count: 'exact'")) {
                    lines[lineIdx] = line.replace(/select\(['"]\*['"]/, "select('id'");
                    fs.writeFileSync(opt.file, lines.join('\n'));
                    console.log(`✅ Fixed inefficient count query in ${opt.file}`);
                }
            }
        } catch (e) {}
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
                if (diff.includes('useEffect') || diff.includes('supabase') || diff.includes('.map')) {
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
async function runApiBenchmarks(): Promise<{ apiResponseTimeMs: number; status: string }> {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        return { apiResponseTimeMs: 0, status: 'skipped (no credentials)' };
    }

    try {
        const supabase = createClient(url, key);
        const tables = ['items', 'subscriptions', 'health_measurements', 'health_goals', 'profiles'];
        let totalLatency = 0;
        let successCount = 0;

        for (const table of tables) {
            try {
                const start = Date.now();
                await supabase.from(table).select('id').limit(1);
                const end = Date.now();
                totalLatency += (end - start);
                successCount++;
            } catch (e) {}
        }

        if (successCount === 0) return { apiResponseTimeMs: 0, status: 'failed' };

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
  const apiBenchmark = await runApiBenchmarks();
  const metrics = {
    bundleSizeKB: 0,
    timestamp: new Date().toISOString(),
    apiLatencyMs: apiBenchmark.apiResponseTimeMs,
    apiStatus: apiBenchmark.status
  };

  try {
    if (fs.existsSync('dist')) {
      const files = execSync('find dist -name "*.js"').toString().split('\n').filter(Boolean);
      let totalSize = 0;
      files.forEach(file => {
        totalSize += fs.statSync(file).size;
      });
      metrics.bundleSizeKB = Math.round(totalSize / 1024);
    }
  } catch (e) {}

  return metrics;
}

/**
 * Logs the results
 */
function logResults(optimizations: OptimizationResult[], benchmarks: any) {
  const logPath = path.join(process.cwd(), 'performance-logs.json');
  let logs = [];
  if (fs.existsSync(logPath)) {
    try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch (e) {}
  }

  const summary = {
    timestamp: new Date().toISOString(),
    type: 'nightly_sweep',
    optimizations,
    benchmarks,
    status: optimizations.length > 0 ? 'optimizations_found' : 'healthy'
  };

  logs.unshift(summary);
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 10), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Generates PR Body Markdown
 */
function generatePrBody(summary: any) {
    const { benchmarks, optimizations } = summary;
    const latencyBefore = benchmarks.before?.apiLatencyMs || benchmarks.apiLatencyMs;
    const latencyAfter = benchmarks.after?.apiLatencyMs || benchmarks.apiLatencyMs;
    const bsizeBefore = benchmarks.before?.bundleSizeKB || benchmarks.bundleSizeKB;
    const bsizeAfter = benchmarks.after?.bundleSizeKB || benchmarks.bundleSizeKB;

    const deltaLatency = latencyAfter - latencyBefore;
    const deltaBsize = bsizeAfter - bsizeBefore;

    let body = `## 🚀 Nightly Performance Sweep Report\n\n`;
    body += `Automated performance optimizations found and applied.\n\n`;
    body += `### 📊 Metrics Comparison\n\n`;
    body += `| Metric | Before | After | Delta |\n`;
    body += `| --- | --- | --- | --- |\n`;
    body += `| API Latency | ${latencyBefore}ms | ${latencyAfter}ms | ${deltaLatency}ms |\n`;
    body += `| Bundle Size | ${bsizeBefore}KB | ${bsizeAfter}KB | ${deltaBsize}KB |\n\n`;

    body += `### 🔍 Optimizations Identified\n\n`;
    if (optimizations.length > 0) {
        optimizations.forEach((o: any) => {
            body += `- [${o.category}] ${o.description} in \`${o.file}${o.line ? `:${o.line}` : ''}\`\n`;
        });
    } else {
        body += `No major issues identified in this sweep.\n`;
    }

    fs.writeFileSync('performance-pr-body.md', body);
    console.log('PR body generated in performance-pr-body.md');
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: any, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { benchmarks, optimizations } = summary;
  const currentLatency = benchmarks.after?.apiLatencyMs || benchmarks.apiLatencyMs;
  const slaExceeded = currentLatency > API_RESPONSE_THRESHOLD_MS;
  const backendLeadSlackId = process.env.BACKEND_LEAD_SLACK_ID || 'backend-lead';

  let text = `🚀 *Nightly Performance Sweep Report* - ${new Date().toLocaleDateString()}\n`;
  text += `⏱️ *Current Latency:* ${currentLatency}ms\n`;
  if (prUrl) text += `📦 *Pull Request:* ${prUrl}\n`;

  if (slaExceeded) {
      text += `⚠️ *SLA THRESHOLD EXCEEDED* - cc <@${backendLeadSlackId}>\n`;
  }

  const message = {
    text,
    attachments: [{
        color: slaExceeded ? '#ef4444' : (optimizations.length > 0 ? '#f59e0b' : '#10b981'),
        title: 'Summary',
        text: optimizations.length > 0
          ? `Found ${optimizations.length} optimizations.\n` + optimizations.slice(0, 5).map((o: any) => `• [${o.category}] ${o.description}`).join('\n')
          : 'System is healthy and within SLA.'
    }]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

async function main() {
  if (GENERATE_PR_BODY) {
      if (!fs.existsSync('performance-summary.json')) return;
      const summary = JSON.parse(fs.readFileSync('performance-summary.json', 'utf8'));
      generatePrBody(summary);
      return;
  }

  if (process.env.SEND_NOTIFICATION_ONLY) {
    if (!fs.existsSync('performance-summary.json')) return;
    const summary = JSON.parse(fs.readFileSync('performance-summary.json', 'utf8'));
    await sendSlackNotification(summary, process.env.PR_URL);
    return;
  }

  console.log('Starting nightly performance sweep...');
  const issues = [
    ...scanForN1Queries(),
    ...scanForMissingIndexes(),
    ...scanForMissingMemo(),
    ...scanForInefficientQueries(),
    ...scanForNestedLoops(),
    ...reviewRecentMerges()
  ];

  const beforeBenchmarks = await runBenchmarks();

  if (APPLY_FIXES && issues.length > 0) {
      applyFixes(issues);
      const afterBenchmarks = await runBenchmarks();
      logResults(issues, { before: beforeBenchmarks, after: afterBenchmarks });
  } else {
      logResults(issues, beforeBenchmarks);
  }
  console.log('Performance sweep completed.');
}

main().catch(console.error);
