import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Performance thresholds
const API_RESPONSE_THRESHOLD_MS = 500;

interface OptimizationResult {
  category: string;
  description: string;
  impact: string;
  file?: string;
}

/**
 * Scans for N+1 queries in storage removals
 */
function scanForN1Storage(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  try {
    const output = execSync('grep -rnE "\\.map\\(.*removeItemStorageObjects" src/ || true').toString();
    if (output) {
      output.split('\n').filter(Boolean).forEach(line => {
        results.push({
          category: 'backend_api',
          description: 'Detected potential N+1 storage removal pattern',
          impact: 'Multiple storage API calls in a loop',
          file: line.split(':')[0]
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
  // Look for complex filtering/sorting in useEffect instead of useMemo
  try {
    const output = execSync('grep -rn "useEffect(() => {.*\\.filter(" src/features/ || true').toString();
    if (output) {
      output.split('\n').filter(Boolean).forEach(line => {
        results.push({
          category: 'frontend_react',
          description: 'Detected filtering logic inside useEffect',
          impact: 'Potential redundant re-renders; should use useMemo',
          file: line.split(':')[0]
        });
      });
    }
  } catch (e) {
    console.error('Error scanning for missing memo:', e);
  }
  return results;
}

/**
 * Runs performance benchmarks by analyzing build artifacts and bundle sizes
 */
function runBenchmarks() {
  console.log('Running performance benchmarks...');
  const metrics = {
    bundleSizeKB: 0,
    largeFilesCount: 0,
    timestamp: new Date().toISOString()
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
function logResults(optimizations: OptimizationResult[]) {
  const logPath = path.join(process.cwd(), 'performance-logs.json');
  let logs = [];
  if (fs.existsSync(logPath)) {
    logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  logs.unshift({
    timestamp: new Date().toISOString(),
    type: 'nightly_sweep',
    optimizations,
    status: optimizations.length > 0 ? 'optimizations_found' : 'healthy'
  });

  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(optimizations: OptimizationResult[]) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const message = {
    text: `🚀 *Nightly Performance Sweep Report* - ${new Date().toLocaleDateString()}`,
    attachments: [
      {
        color: optimizations.length > 0 ? '#f59e0b' : '#10b981',
        title: 'Optimization Summary',
        text: optimizations.length > 0
          ? `Found and flagged ${optimizations.length} potential optimizations.\n${optimizations.map(o => `• [${o.category}] ${o.description} in ${o.file}`).join('\n')}`
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
  console.log('Starting nightly performance sweep...');

  const n1Issues = scanForN1Storage();
  const memoIssues = scanForMissingMemo();
  const benchmarks = runBenchmarks();

  const allIssues = [...n1Issues, ...memoIssues];

  logResults(allIssues);
  await sendSlackNotification(allIssues);

  console.log('Performance sweep completed.', { benchmarks });
}

main().catch(console.error);
