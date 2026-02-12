import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const COLOR_FIX_MAP: Record<string, string> = {
  '#3b82f6': 'hsl(var(--primary))',
  '#ef4444': 'hsl(var(--destructive))',
  '#10b981': 'hsl(var(--success))',
  '#f59e0b': 'hsl(var(--warning))',
  '#3b82f7': 'hsl(var(--primary))', // Common slight variation
};

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
 * Scans for raw <button> tags instead of using the standard Button component
 */
function scanInconsistentButtons(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const files = execSync('find src -name "*.tsx" | grep -v "src/shared/components/ui"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const buttonRegex = /<button[\s\S]*?>/g;
      let match;
      while ((match = buttonRegex.exec(content)) !== null) {
        // Skip if it's in a comment or a string that's clearly not a tag
        const tag = match[0];
        const lineNum = content.substring(0, match.index).split('\n').length;
        issues.push({
          type: 'consistency',
          severity: 'low',
          description: 'Raw <button> tag used; consider using the standard Button component',
          file,
          line: lineNum,
          autoFixable: false
        });
      }
    }
  } catch (e) {
    console.error('Error scanning for inconsistent buttons:', e);
  }
  return issues;
}

/**
 * Scans for hardcoded pixel values or fonts in Tailwind classes
 */
function scanInconsistentStyles(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    // Detect hardcoded pixel values in tailwind classes like px-[13px]
    const pixelOutput = execSync('grep -rn "\\[[0-9]\\+px\\]" src/ --include="*.tsx" || true').toString();
    if (pixelOutput) {
      pixelOutput.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum, ...rest] = line.split(':');
        issues.push({
          type: 'styling',
          severity: 'low',
          description: `Hardcoded pixel value found in Tailwind class: ${rest.join(':').trim()}`,
          file,
          line: parseInt(lineNum),
          autoFixable: false
        });
      });
    }

    // Detect hardcoded fonts
    const fontOutput = execSync('grep -rn "font-\\[" src/ --include="*.tsx" || true').toString();
    if (fontOutput) {
      fontOutput.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum, ...rest] = line.split(':');
        issues.push({
          type: 'styling',
          severity: 'low',
          description: `Hardcoded font found: ${rest.join(':').trim()}`,
          file,
          line: parseInt(lineNum),
          autoFixable: false
        });
      });
    }
  } catch (e) {
    console.error('Error scanning for inconsistent styles:', e);
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
        const [file, lineNum, ...rest] = line.split(':');
        const content = rest.join(':').trim();
        // Filter out some common false positives or intentional ones if needed
        if (!file.includes('constants.ts') && !file.includes('utils.ts')) {
          let canFix = false;
          let hexFound = '';
          for (const hex of Object.keys(COLOR_FIX_MAP)) {
            if (content.toLowerCase().includes(hex)) {
              canFix = true;
              hexFound = hex;
              break;
            }
          }

          issues.push({
            type: 'styling',
            severity: 'medium',
            description: `Hardcoded hex color found: ${content}${canFix ? ` (auto-fix available for ${hexFound})` : ''}`,
            file,
            line: parseInt(lineNum),
            autoFixable: canFix
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

      const processSuite = (suite: any) => {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              if (result.status === 'failed') {
                issues.push({
                  type: 'accessibility',
                  severity: 'high',
                  description: `Runtime audit failure: ${spec.title}`,
                  autoFixable: false
                });
              }
            }
          }
        }
        for (const childSuite of suite.suites || []) {
          processSuite(childSuite);
        }
      };

      for (const suite of results.suites || []) {
        processSuite(suite);
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

      // Sort issues by line number in reverse to avoid offset issues when modifying
      const sortedIssues = [...fileIssues].sort((a, b) => (b.line || 0) - (a.line || 0));

      for (const issue of sortedIssues) {
        if (issue.description.includes('Missing alt attribute')) {
          const lines = content.split('\n');
          const lineIndex = issue.line! - 1;

          const lookAhead = lines.slice(lineIndex, lineIndex + 10).join('\n');
          const imgMatch = lookAhead.match(/<img[\s\S]*?>/);

          if (imgMatch && !imgMatch[0].includes('alt=')) {
            const fixedTag = imgMatch[0].replace('<img', '<img alt=""');

            const linesBefore = lines.slice(0, lineIndex);
            const linesAfter = lines.slice(lineIndex);
            const joinedAfter = linesAfter.join('\n');
            const newJoinedAfter = joinedAfter.replace(imgMatch[0], fixedTag);

            content = [...linesBefore, newJoinedAfter].join('\n');
            modified = true;
            console.log(`Fixed missing alt in ${file}:${issue.line}`);
          }
        } else if (issue.description.includes('Hardcoded hex color found')) {
          const lines = content.split('\n');
          const lineIndex = issue.line! - 1;
          let lineContent = lines[lineIndex];

          for (const [hex, replacement] of Object.entries(COLOR_FIX_MAP)) {
            if (lineContent.toLowerCase().includes(hex)) {
              // Be careful with case sensitivity when replacing
              const regex = new RegExp(hex, 'gi');
              lineContent = lineContent.replace(regex, replacement);
              lines[lineIndex] = lineContent;
              content = lines.join('\n');
              modified = true;
              console.log(`Fixed hardcoded hex color ${hex} in ${file}:${issue.line}`);
            }
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
  const fixableCount = issues.filter(i => i.autoFixable).length;

  // Tag Design and QA leads for critical issues
  const mentionLeads = criticalIssues.length > 0
    ? '\n<!channel> 🚨 *Attention needed:* @Design-Lead @QA-Lead - Critical UI/Accessibility issues detected!'
    : '';

  const prText = prUrl ? `\n\n*View Pull Request:* ${prUrl}` : '\n\n_Note: No automated PR was created for this run._';

  const message = {
    text: `🖌️ *Daily UI/UX Quality Audit Report* - ${new Date().toLocaleDateString()}`,
    attachments: [
      {
        color: criticalIssues.length > 0 ? '#ef4444' : (issues.length > 0 ? '#3b82f6' : '#10b981'),
        title: 'Audit Summary',
        text: issues.length > 0
          ? `*Total Issues:* ${issues.length}\n*Auto-fixed:* ${fixableCount}\n*Remaining:* ${issues.length - fixableCount}${mentionLeads}\n\n*Top Issues:*\n${issues.slice(0, 10).map(i => `• [${i.severity.toUpperCase()}] ${i.description} in \`${i.file || 'runtime'}\``).join('\n')}${issues.length > 10 ? `\n...and ${issues.length - 10} more.` : ''}${prText}`
          : `No UI/UX inconsistencies detected. The design system is in excellent shape! 🌟${prText}`
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
  const buttonIssues = scanInconsistentButtons();
  const styleIssues = scanInconsistentStyles();

  let allIssues = [...altIssues, ...colorIssues, ...buttonIssues, ...styleIssues];

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
  const fixableIssues = allIssues.filter(i => i.autoFixable);
  const unfixableIssues = allIssues.filter(i => !i.autoFixable);

  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: allIssues.length,
      fixable: fixableIssues.length,
      unfixable: unfixableIssues.length,
      severities: {
        critical: allIssues.filter(i => i.severity === 'critical').length,
        high: allIssues.filter(i => i.severity === 'high').length,
        medium: allIssues.filter(i => i.severity === 'medium').length,
        low: allIssues.filter(i => i.severity === 'low').length,
      }
    },
    issues: allIssues
  }, null, 2));

  // If notify flag is set, send the notification (used in post-PR step)
  if (process.argv.includes('--notify')) {
    await sendSlackNotification(allIssues);
  }

  console.log(`Audit completed. Report saved to ${reportPath}`);
}

main().catch(console.error);
