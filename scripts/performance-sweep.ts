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
 * Scans for N+1 queries (async calls in loops)
 */
function scanForN1Queries(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    // 1. Storage removals in map
    const storageMap = execSync('grep -rnE "\\.map\\(.*removeItemStorageObjects" src/ || true').toString();
    if (storageMap) {
      storageMap.split('\n').filter(Boolean).forEach(line => {
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
    }

    // 2. Generic async calls in loops (map/forEach with await)
    const asyncLoops = execSync('grep -rnE "\\.(map|forEach)\\(async" src/ || true').toString();
    if (asyncLoops) {
      asyncLoops.split('\n').filter(Boolean).forEach(line => {
        const parts = line.split(':');
        if (parts.length < 2) return;
        const [file, lineNum] = parts;
        if (!file.includes('node_modules') && !file.includes('.test.')) {
          results.push({
            category: 'backend_api',
            description: 'Detected async operation inside loop (Potential N+1)',
            impact: 'Serial or parallel individual API calls instead of batching',
            file,
            line: lineNum
          });
        }
      });
    }

    // 2b. Await inside for/while loops
    const awaitInLoops = execSync('grep -rnE "(for|while)\\s*\\(" src/ -A 10 | grep "await" || true').toString();
    if (awaitInLoops) {
        // This is a bit noisy due to -A 10, so we strictly parse grep headers (file:line:...)
        const lines = awaitInLoops.split('\n');
        lines.forEach(rawLine => {
            const line = rawLine.trim();
            if (!line) {
                return;
            }
            // Expect standard grep -n output: filename:lineNumber:matchedText
            const match = line.match(/^([^:]+):([0-9]+):/);
            if (!match) {
                return;
            }
            const [, file, lineNum] = match;
            if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
                return;
            }
            if (file.includes('node_modules') || file.includes('.test.')) {
                return;
            }
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
    const signedUrlInLoops = execSync('grep -rnE "\\.map\\(.*createSignedUrl" src/ || true').toString();
    if (signedUrlInLoops) {
        signedUrlInLoops.split('\n').filter(Boolean).forEach(line => {
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
    }

    // 3. Supabase calls inside loops (Heuristic)
    const supabaseInLoops = execSync('grep -rnE "\\b(supabase|from)\\(" src/ || true').toString();
    const supabaseUsage: Record<string, number> = {};
    supabaseInLoops.split('\n').filter(Boolean).forEach(line => {
      const file = line.split(':')[0];
      if (!file.includes('node_modules') && !file.includes('.test.')) {
        supabaseUsage[file] = (supabaseUsage[file] || 0) + 1;
      }
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
    const supabaseInMap = execSync('grep -rnE "\\.map\\(.*supabase\\.from" src/ || true').toString();
    if (supabaseInMap) {
      supabaseInMap.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum] = line.split(':');
        results.push({
          category: 'backend_api',
          description: 'Detected Supabase query inside .map() (N+1)',
          impact: 'Executes one query per item in the collection',
          file,
          line: lineNum,
          suggestedFix: 'Use .in() filter to batch the query'
        });
      });
    }

  } catch (e) {
    console.error('Error scanning for N+1:', e);
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
    const expensiveOps = execSync('grep -rnE "\\.(filter|sort|reduce)\\(" src/ || true').toString();
    expensiveOps.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum] = line.split(':');
        if (file.endsWith('.tsx') && !file.includes('.test.')) {
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
                results.push({
                    category: 'frontend_react',
                    description: `Detected expensive operation (${lines[lineIdx].includes('filter') ? 'filter' : 'sort/reduce'}) outside useMemo`,
                    impact: 'Calculation runs on every render',
                    file,
                    line: lineNum,
                    suggestedFix: 'Wrap in useMemo'
                });
            }
        }
    });

    // 2. Components used in lists that might need memoization
    const listComponents = execSync('grep -rnE "\\.map\\(.*=>.*<[A-Z]" src/ || true').toString();
    listComponents.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum] = line.split(':');
        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match && file.endsWith('.tsx')) {
            const componentName = match[1];
            // Skip common components that are already fast or don't benefit much from memoization
            const skipComponents = [
                'Button', 'Badge', 'Icon', 'Separator', 'Skeleton', 'Avatar',
                'ItemCardSkeleton', 'SkeletonCard', 'CardSkeleton', 'Loader2'
            ];
            if (skipComponents.includes(componentName)) return;

            // Check if component is likely memoized by searching for memo( in its source file
            // First we need to find the file where it's defined. This is hard with grep,
            // so we'll just check if it's imported from a local file and then check that file.
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
                // Ignore errors during local file check
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
    const arrowProps = execSync('grep -rnE "<[A-Z][a-zA-Z0-9]*[^>]*\\w+\\s*=\\s*\\{\\s*\\([^)]*\\)\\s*=>" src/ || true').toString();
    arrowProps.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum] = line.split(':');
        const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match && file.endsWith('.tsx') && !file.includes('.test.')) {
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
                // Replace items.map(item => removeItemStorageObjects(item)) with removeMultipleItemsStorageObjects(items)
                const match = line.match(/(\w+)\.map\(\w+\s*=>\s*removeItemStorageObjects\(\w+\)\)/);
                if (match) {
                    const collectionName = match[1];
                    lines[lineIdx] = line.replace(match[0], `removeMultipleItemsStorageObjects(${collectionName})`);
                    fs.writeFileSync(opt.file, lines.join('\n'));
                    console.log(`✅ Fixed N+1 storage removal in ${opt.file}`);
                }
            } else if (opt.category === 'frontend_react' && opt.description.includes('outside useMemo')) {
                // NOTE: Automated useMemo rewrite is intentionally disabled for safety.
                // Wrapping filter/sort/reduce in useMemo requires accurate dependency tracking.
                // Heuristic-based dependency arrays can easily lead to stale closure bugs.
                // We provide the recommendation, but require manual developer implementation.
                console.log(
                    `Recommendation: Wrap expensive operation in useMemo in ${opt.file}:${opt.line}`
                );
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

                // Scan the diff for performance-related changes
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

        for (const table of tables) {
            const start = Date.now();
            const { error } = await supabase.from(table).select('id').limit(1);
            const end = Date.now();

            if (!error) {
                totalLatency += (end - start);
                successCount++;
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
  // Keep only last 20 runs
  fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));
  fs.writeFileSync('performance-summary.json', JSON.stringify(summary));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(summary: { optimizations: OptimizationResult[]; benchmarks: { apiLatencyMs: number } }, prUrl?: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const optimizations = summary.optimizations;
  const slaExceeded = summary.benchmarks.apiLatencyMs > API_RESPONSE_THRESHOLD_MS;

  const backendLeadTag = "<@backend-lead>";

  let text = `🚀 *Nightly Performance Sweep Report* - ${new Date().toLocaleDateString()}\n`;
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

async function main() {
  if (process.env.SEND_NOTIFICATION_ONLY) {
    if (!fs.existsSync('performance-summary.json')) return;
    const summary = JSON.parse(fs.readFileSync('performance-summary.json', 'utf8'));
    await sendSlackNotification(summary, process.env.PR_URL);
    return;
  }

  console.log('Starting nightly performance sweep...');

  const n1Issues = scanForN1Queries();
  const memoIssues = scanForMissingMemo();
  const mergeIssues = reviewRecentMerges();

  const allIssues = [...n1Issues, ...memoIssues, ...mergeIssues];
  const benchmarks = await runBenchmarks();

  logResults(allIssues, benchmarks);

  if (APPLY_FIXES) {
      applyFixes(allIssues);
  }

  if (process.env.SLACK_WEBHOOK_URL && !process.env.GITHUB_ACTIONS) {
      await sendSlackNotification({
        optimizations: allIssues,
        benchmarks: { apiLatencyMs: benchmarks.apiLatencyMs }
      });
  }

  console.log('Performance sweep completed.', { benchmarks });
}

main().catch(console.error);
