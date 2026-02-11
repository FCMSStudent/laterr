import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface UIIssue {
  type: 'accessibility' | 'styling' | 'consistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
}

/**
 * Scans for missing alt attributes in images
 */
function scanMissingAlt(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const imgRegex = /<img[\s\S]*?>/g;
      let match;
      while ((match = imgRegex.exec(content)) !== null) {
        const tag = match[0];
        if (!tag.includes('alt=')) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          issues.push({
            type: 'accessibility',
            severity: 'medium',
            description: 'Missing alt attribute on <img> tag',
            file,
            line: lineNum,
            autoFixable: true
          });
        }
      }
    }
  } catch (e) {
    console.error('Error scanning for missing alt:', e);
  }
  return issues;
}

/**
 * Scans for hardcoded hex colors that should potentially be theme variables
 */
function scanHardcodedColors(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    // Look for hex colors in TSX files that aren't in constants or utils
    const output = execSync('grep -rn "#[0-9a-fA-F]\\{6\\}" src/ --include="*.tsx" | grep -v "var(" || true').toString();
    if (output) {
      output.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum] = line.split(':');
        // Filter out some common false positives or intentional ones if needed
        if (!file.includes('constants.ts') && !file.includes('utils.ts')) {
          issues.push({
            type: 'styling',
            severity: 'low',
            description: 'Hardcoded hex color found; consider using Tailwind theme colors',
            file,
            line: parseInt(lineNum),
            autoFixable: false // Set to false initially, can be complex to auto-fix reliably
          });
        }
      });
    }
  } catch (e) {
    console.error('Error scanning for hardcoded colors:', e);
  }
  return issues;
}

/**
 * Runs the Playwright UI audit and returns issues found
 */
function runRuntimeAudit(): UIIssue[] {
  console.log('Running runtime UI audit...');
  const resultsPath = path.join(process.cwd(), 'playwright-results.json');
  const issues: UIIssue[] = [];

  try {
    execSync(`npx playwright test tests/ui-audit.spec.ts --reporter=json > ${resultsPath} 2>/dev/null || true`);

    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      // Parse Playwright JSON results and convert to UIIssue format
      // This is a simplified parsing, would need to be more robust
      for (const suite of results.suites || []) {
        for (const test of suite.specs || []) {
          for (const result of test.tests?.[0]?.results || []) {
            if (result.status === 'failed') {
              issues.push({
                type: 'accessibility',
                severity: 'high',
                description: `Runtime audit failure: ${test.title}`,
                autoFixable: false
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to run or parse runtime audit:', e);
  }
  return issues;
}

/**
 * Automatically fixes minor UI issues
 */
function applyAutoFixes(issues: UIIssue[]) {
  console.log('Applying auto-fixes...');
  const fixableIssues = issues.filter(i => i.autoFixable);

  // Group by file to avoid multiple writes
  const fileGroups: Record<string, UIIssue[]> = {};
  for (const issue of fixableIssues) {
    if (issue.file) {
      if (!fileGroups[issue.file]) fileGroups[issue.file] = [];
      fileGroups[issue.file].push(issue);
    }
  }

  for (const [file, fileIssues] of Object.entries(fileGroups)) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      for (const issue of fileIssues) {
        if (issue.description.includes('Missing alt attribute')) {
          // Re-verify the missing alt in the content at the given line
          const lines = content.split('\n');
          const lineIndex = issue.line! - 1;
          const tagStart = lines.slice(lineIndex).join('\n');
          const imgMatch = tagStart.match(/<img[\s\S]*?>/);

          if (imgMatch && !imgMatch[0].includes('alt=')) {
            const fixedTag = imgMatch[0].replace('<img', '<img alt=""');
            content = content.replace(imgMatch[0], fixedTag);
            modified = true;
            console.log(`Fixed missing alt in ${file}:${issue.line}`);
          }
        }
      }

      if (modified) {
        fs.writeFileSync(file, content);
      }
    } catch (e) {
      console.error(`Failed to fix ${file}:`, e);
    }
  }
}

/**
 * Sends Slack notification via webhook
 */
async function sendSlackNotification(issues: UIIssue[]) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const prUrl = process.env.PULL_REQUEST_URL;

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
  const mentionLeads = criticalIssues.length > 0 ? '\n<!here> CC: Design and QA leads - Critical UI issues detected!' : '';
  const prText = prUrl ? `\n\n*Pull Request:* ${prUrl}` : '';

  const message = {
    text: `🖌️ *UI/UX Maintenance Audit Report* - ${new Date().toLocaleDateString()}`,
    attachments: [
      {
        color: issues.length > 0 ? '#3b82f6' : '#10b981',
        title: 'Audit Summary',
        text: issues.length > 0
          ? `Found ${issues.length} UI/UX inconsistencies.${mentionLeads}\n${issues.slice(0, 10).map(i => `• [${i.type}] ${i.description} in ${i.file || 'runtime'}`).join('\n')}${issues.length > 10 ? `\n...and ${issues.length - 10} more.` : ''}${prText}`
          : `No UI/UX inconsistencies detected. Design system is well-maintained.${prText}`
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
  console.log('Starting UI/UX maintenance audit...');

  const altIssues = scanMissingAlt();
  const colorIssues = scanHardcodedColors();

  let allIssues = [...altIssues, ...colorIssues];

  if (process.argv.includes('--fix')) {
    applyAutoFixes(allIssues);
  }

  // Run runtime audit and collect issues
  if (process.argv.includes('--runtime')) {
    const runtimeIssues = runRuntimeAudit();
    allIssues = [...allIssues, ...runtimeIssues];
  }

  console.log(`Total issues identified: ${allIssues.length}`);

  // Save report
  const reportPath = path.join(process.cwd(), 'ui-maintenance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    issues: allIssues
  }, null, 2));

  // If notify flag is set, send the notification (used in post-PR step)
  if (process.argv.includes('--notify')) {
    await sendSlackNotification(allIssues);
  }

  console.log(`Audit completed. Report saved to ${reportPath}`);
}

main().catch(console.error);
