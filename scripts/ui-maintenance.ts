import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const COLOR_FIX_MAP: Record<string, string> = {
  '#3b82f6': 'hsl(var(--primary))',
  '#ef4444': 'hsl(var(--destructive))',
  '#10b981': 'hsl(var(--success))',
  '#f59e0b': 'hsl(var(--warning))',
  '#3b82f7': 'hsl(var(--primary))',
  '#ffffff': 'hsl(var(--background))',
  '#fff': 'hsl(var(--background))',
  '#000000': 'hsl(var(--foreground))',
  '#000': 'hsl(var(--foreground))',
  '#cccccc': 'hsl(var(--muted-foreground))',
  '#ccc': 'hsl(var(--muted-foreground))',
};

interface UIIssue {
  type: 'accessibility' | 'styling' | 'consistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
  offset?: number;
  originalText?: string;
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
            autoFixable: true,
            offset: match.index,
            originalText: tag
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
 * Scans for missing accessible labels on form elements
 */
function scanMissingFormLabels(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const files = execSync('find src -name "*.tsx" | grep -v "src/shared/components/ui"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const formRegex = /<(input|select|textarea)([\s\S]*?)(\/?>)/g;
      let match;
      while ((match = formRegex.exec(content)) !== null) {
        const tag = match[1];
        const attributes = match[2];

        // Skip hidden inputs
        if (attributes.includes('type="hidden"') || attributes.includes("type='hidden'")) continue;

        const hasAriaLabel = attributes.includes('aria-label') || attributes.includes('aria-labelledby');
        const hasId = /id=["'](.+?)["']/.test(attributes);
        let hasLabel = false;

        if (hasId) {
          const idMatch = attributes.match(/id=["'](.+?)["']/);
          const id = idMatch ? idMatch[1] : null;
          if (id) {
            const labelRegex = new RegExp(`<label[^>]*htmlFor=["']${id}["']`, 'g');
            if (labelRegex.test(content)) {
              hasLabel = true;
            }
          }
        }

        // Check if nested in label
        if (!hasLabel) {
           const contentBefore = content.substring(0, match.index);
           const lastLabelStart = contentBefore.lastIndexOf('<label');
           const lastLabelEnd = contentBefore.lastIndexOf('</label>');
           if (lastLabelStart > lastLabelEnd) {
             hasLabel = true;
           }
        }

        if (!hasAriaLabel && !hasLabel) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          issues.push({
            type: 'accessibility',
            severity: 'high',
            description: `Form element <${tag}> missing accessible label (label, aria-label, or aria-labelledby)`,
            file,
            line: lineNum,
            autoFixable: false
          });
        }
      }
    }
  } catch (e) {
    console.error('Error scanning for missing form labels:', e);
  }
  return issues;
}

/**
 * Scans for missing aria-labels on icon-only buttons
 */
function scanMissingAriaLabels(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      // Look for Button or button tags
      const buttonRegex = /<(Button|button)([^>]*?)>([\s\S]*?)<\/\1>/g;
      let match;
      while ((match = buttonRegex.exec(content)) !== null) {
        const attributes = match[2];
        const children = match[3];

        if (!attributes.includes('aria-label') && !attributes.includes('aria-labelledby')) {
          // Check if children contain an icon (Lucide common icons) but no obvious text
          const hasIcon = children.includes('Icon') || /<[A-Z][a-zA-Z]+/.test(children);
          const textContent = children.replace(/<[^>]*>?/gm, '').trim();

          if (hasIcon && !textContent) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'accessibility',
              severity: 'high',
              description: 'Icon-only button missing aria-label',
              file,
              line: lineNum,
              autoFixable: false
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error scanning for missing aria-labels:', e);
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
    const pixelOutput = execSync('grep -rn "\\[[0-9]\\+px\\]" src/ --include="*.tsx" || true').toString();
    if (pixelOutput) {
      pixelOutput.split('\n').filter(Boolean).forEach(line => {
        const [file, lineNum, ...rest] = line.split(':');
        const description = rest.join(':').trim();
        issues.push({
          type: 'styling',
          severity: 'low',
          description: `Hardcoded pixel value found in Tailwind class: ${description}`,
          file,
          line: parseInt(lineNum),
          autoFixable: false
        });
      });
    }

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
    const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      // Skip files that should have hardcoded colors or where auto-fixing might break things
      if (file.includes('constants.ts') ||
          file.includes('utils.ts') ||
          file.includes('src/shared/components/ui/advanced/chart.tsx')) continue;

      const content = fs.readFileSync(file, 'utf8');
      const hexRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
      let match;
      while ((match = hexRegex.exec(content)) !== null) {
        const hex = match[0];
        const lineNum = content.substring(0, match.index).split('\n').length;

        // Skip if it's already a theme variable
        const lineContent = content.split('\n')[lineNum - 1];
        if (lineContent.includes('var(')) continue;

        // Skip CSS attribute selectors like stroke="#fff" or fill="#000"
        if (/ (stroke|fill)=["']#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})["']/.test(lineContent)) {
           continue;
        }

        let canFix = false;
        if (COLOR_FIX_MAP[hex.toLowerCase()]) {
          canFix = true;
        }

        issues.push({
          type: 'styling',
          severity: 'medium',
          description: `Hardcoded hex color found: ${hex}${canFix ? ` (auto-fix available)` : ''}`,
          file,
          line: lineNum,
          autoFixable: canFix,
          offset: match.index,
          originalText: hex
        });
      }
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
                const failures = result.errors || [];
                for (const fail of failures) {
                  const failureMessage = fail.message || 'Unknown failure';
                  issues.push({
                    type: 'accessibility',
                    severity: failureMessage.toLowerCase().includes('accessibility') ? 'high' : 'critical',
                    description: `Runtime audit failure in "${spec.title}": ${failureMessage.split('\n')[0]}`,
                    autoFixable: false
                  });
                }
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
  const fixableIssues = issues.filter(i => i.autoFixable && i.offset !== undefined);

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

      const sortedIssues = [...fileIssues].sort((a, b) => (b.offset || 0) - (a.offset || 0));

      for (const issue of sortedIssues) {
        const offset = issue.offset!;
        const originalText = issue.originalText!;

        if (content.substring(offset, offset + originalText.length) === originalText) {
          let replacement = '';
          if (issue.description.includes('Missing alt attribute')) {
            replacement = originalText.replace('<img', '<img alt=""');
          } else if (issue.description.includes('Hardcoded hex color found')) {
            replacement = COLOR_FIX_MAP[originalText.toLowerCase()] || originalText;
          }

          if (replacement && replacement !== originalText) {
            content = content.substring(0, offset) + replacement + content.substring(offset + originalText.length);
            modified = true;
            console.log(`Fixed issue at ${file}:${issue.line}`);
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
 * Generates a human-readable Markdown report
 */
function generateMarkdownReport(issues: UIIssue[], summary: any): string {
  let md = `# UI Maintenance Audit Report\n\n`;
  md += `**Date:** ${new Date().toLocaleString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| Category | Count |\n`;
  md += `| --- | --- |\n`;
  md += `| Total Issues | ${summary.total} |\n`;
  md += `| Auto-fixable | ${summary.fixable} |\n`;
  md += `| Critical | ${summary.severities.critical} |\n`;
  md += `| High | ${summary.severities.high} |\n`;
  md += `| Medium | ${summary.severities.medium} |\n`;
  md += `| Low | ${summary.severities.low} |\n\n`;

  if (issues.length === 0) {
    md += `No issues found! Everything looks great. ✨\n`;
    return md;
  }

  md += `## Detailed Issues\n\n`;
  md += `| Severity | Type | Description | File:Line | Auto-fixable |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;

  for (const issue of issues) {
    const fileLoc = issue.file ? `\`${issue.file}${issue.line ? `:${issue.line}` : ''}\`` : '`runtime`';
    md += `| ${issue.severity.toUpperCase()} | ${issue.type} | ${issue.description} | ${fileLoc} | ${issue.autoFixable ? '✅' : '❌'} |\n`;
  }

  return md;
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

  const mentionLeads = criticalIssues.length > 0
    ? '\n<!channel> 🚨 *Attention needed:* <@Design-Lead> <@QA-Lead> - Critical UI/Accessibility issues detected!'
    : '';

  const prText = prUrl ? `\n\n*View Pull Request:* ${prUrl}` : '\n\n_Note: No automated PR was created for this run._';

  const message = {
    text: `🖌️ *Daily UI/UX Quality Audit Report* - ${new Date().toLocaleDateString()}`,
    attachments: [
      {
        color: criticalIssues.length > 0 ? '#ef4444' : (issues.length > 0 ? '#3b82f6' : '#10b981'),
        title: 'Audit Summary',
        text: issues.length > 0
          ? `*Total Issues:* ${issues.length}\n*Auto-fixable:* ${fixableCount}\n*Non-auto-fixable:* ${issues.length - fixableCount}${mentionLeads}\n\n*Top Issues:*\n${issues.slice(0, 10).map(i => `• [${i.severity.toUpperCase()}] ${i.description} in \`${i.file || 'runtime'}\``).join('\n')}${issues.length > 10 ? `\n...and ${issues.length - 10} more.` : ''}${prText}`
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
  const ariaIssues = scanMissingAriaLabels();
  const formIssues = scanMissingFormLabels();
  const colorIssues = scanHardcodedColors();
  const buttonIssues = scanInconsistentButtons();
  const styleIssues = scanInconsistentStyles();

  let allIssues = [...altIssues, ...ariaIssues, ...formIssues, ...colorIssues, ...buttonIssues, ...styleIssues];

  if (process.argv.includes('--fix')) {
    applyAutoFixes(allIssues);
  }

  if (process.argv.includes('--runtime')) {
    const runtimeIssues = runRuntimeAudit();
    allIssues = [...allIssues, ...runtimeIssues];
  }

  console.log(`Total issues identified: ${allIssues.length}`);

  const summary = {
    total: allIssues.length,
    fixable: allIssues.filter(i => i.autoFixable).length,
    unfixable: allIssues.filter(i => !i.autoFixable).length,
    severities: {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length,
    }
  };

  const reportPath = path.join(process.cwd(), 'ui-maintenance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary,
    issues: allIssues.map(i => ({ ...i, offset: undefined, originalText: undefined })) // Strip internal fields for report
  }, null, 2));

  const mdReportPath = path.join(process.cwd(), 'UI_MAINTENANCE_REPORT.md');
  const mdContent = generateMarkdownReport(allIssues, summary);
  fs.writeFileSync(mdReportPath, mdContent);

  if (process.argv.includes('--notify')) {
    await sendSlackNotification(allIssues);
  }

  console.log(`Audit completed. Report saved to ${reportPath}`);
}

main().catch(console.error);
