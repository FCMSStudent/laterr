import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const COLOR_FIX_MAP: Record<string, string> = {
  '#3b82f6': 'hsl(var(--primary))',
  '#3b82f7': 'hsl(var(--primary))',
  '#2563eb': 'hsl(var(--primary))',
  '#ef4444': 'hsl(var(--destructive))',
  '#dc2626': 'hsl(var(--destructive))',
  '#10b981': 'hsl(var(--success))',
  '#059669': 'hsl(var(--success))',
  '#f59e0b': 'hsl(var(--warning))',
  '#d97706': 'hsl(var(--warning))',
  '#ffffff': 'hsl(var(--background))',
  '#fff': 'hsl(var(--background))',
  '#000000': 'hsl(var(--foreground))',
  '#000': 'hsl(var(--foreground))',
  '#ccc': 'hsl(var(--muted))',
  '#4caf50': 'hsl(var(--success))',
  '#ff9800': 'hsl(var(--warning))',
  '#2196f3': 'hsl(var(--info))',
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
  replacement?: string;
}

interface PlaywrightSuite {
  specs?: Array<{
    title: string;
    tests?: Array<{
      results?: Array<{
        status: string;
        errors?: Array<{
          message: string;
        }>;
      }>;
    }>;
  }>;
  suites?: PlaywrightSuite[];
}

interface PlaywrightResult {
  suites?: PlaywrightSuite[];
}

/**
 * Consolidates accessibility scanning for buttons and form elements
 */
function scanAccessibilityIssues(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const files = execSync('find src -name "*.tsx" | grep -v "src/shared/components/ui"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');

      // 1. Scan for buttons
      const buttonRegex = /<(Button|button)([^>]*?)>([\s\S]*?)<\/\1>/g;
      let match;
      while ((match = buttonRegex.exec(content)) !== null) {
        const attributes = match[2];
        const children = match[3];

        if (!attributes.includes('aria-label') && !attributes.includes('aria-labelledby')) {
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

      // 2. Scan for inputs/selects/textareas
      const formElementRegex = /<(input|select|textarea|Input|Select|Textarea)([^>]*?)\/?>/g;
      while ((match = formElementRegex.exec(content)) !== null) {
        const tag = match[1];
        const attributes = match[2];

        if (attributes.includes('type="hidden"') || attributes.includes('type="submit"') || attributes.includes('type="button"')) continue;

        const idMatch = attributes.match(/id=["']([^"']+)["']/);
        const id = idMatch ? idMatch[1] : null;
        const hasAriaLabel = attributes.includes('aria-label') || attributes.includes('aria-labelledby');
        const hasAssociatedLabel = id && (content.includes(`htmlFor="${id}"`) || content.includes(`htmlFor='${id}'`) || content.includes(`for="${id}"`) || content.includes(`for='${id}'`));

        if (!hasAriaLabel && !hasAssociatedLabel) {
          // Check if it's wrapped in a <label> (simple lookback heuristic)
          const beforeTag = content.substring(Math.max(0, match.index - 200), match.index);
          const isNestedInLabel = (beforeTag.includes('<label') || beforeTag.includes('<Label')) &&
                                  !(beforeTag.includes('</label>') || beforeTag.includes('</Label>'));

          if (!isNestedInLabel) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'accessibility',
              severity: 'high',
              description: `Form element <${tag}> missing accessible label (aria-label or associated <label>)`,
              file,
              line: lineNum,
              autoFixable: false
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error scanning for accessibility issues:', e);
  }
  return issues;
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
            originalText: tag,
            replacement: tag.replace('<img', '<img alt=""')
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
 * Scans for custom styling overrides on Button components
 */
function scanInconsistentButtonStyles(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const files = execSync('find src -name "*.tsx" | grep -v "src/shared/components/ui"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const buttonRegex = /<Button([^>]*?)>/g;
      let match;
      while ((match = buttonRegex.exec(content)) !== null) {
        const attributes = match[1];
        // Look for custom colors/paddings/fonts that might override the design system
        if (attributes.includes('className') && (
            attributes.includes('bg-') ||
            attributes.includes('p-') ||
            attributes.includes('px-') ||
            attributes.includes('py-') ||
            attributes.includes('text-')
        )) {
          // Heuristic: filter out common utility classes that are likely fine
          if (!attributes.includes('bg-primary') && !attributes.includes('text-primary') && !attributes.includes('p-0')) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            issues.push({
              type: 'consistency',
              severity: 'low',
              description: `Button has custom styles that might override design system defaults: ${attributes.match(/className=["'](.+?)["']/)?.[1] || 'custom classes'}`,
              file,
              line: lineNum,
              autoFixable: false
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error scanning for inconsistent button styles:', e);
  }
  return issues;
}

/**
 * Scans for hardcoded pixel values, fonts, or paddings in Tailwind classes
 */
function scanInconsistentStyles(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const pixelOutput = execSync('grep -rnE "(p|m|gap|w|h|top|left|right|bottom)-\\[[0-9]+px\\]" src/ --include="*.tsx" || true').toString();
    if (pixelOutput) {
      pixelOutput.split('\n').filter(Boolean).forEach(line => {
        const parts = line.split(':');
        const file = parts[0];
        const lineNum = parseInt(parts[1]);
        const description = parts.slice(2).join(':').trim();
        issues.push({
          type: 'styling',
          severity: 'low',
          description: `Hardcoded pixel value found in Tailwind class: ${description}`,
          file,
          line: lineNum,
          autoFixable: false
        });
      });
    }

    const fontOutput = execSync('grep -rn "font-\\[" src/ --include="*.tsx" || true').toString();
    if (fontOutput) {
      fontOutput.split('\n').filter(Boolean).forEach(line => {
        const parts = line.split(':');
        const file = parts[0];
        const lineNum = parseInt(parts[1]);
        issues.push({
          type: 'styling',
          severity: 'low',
          description: `Hardcoded font found: ${parts.slice(2).join(':').trim()}`,
          file,
          line: lineNum,
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
      if (file.includes('constants.ts') || file.includes('utils.ts')) continue;
      const isChartFile = file.includes('chart.tsx');

      const content = fs.readFileSync(file, 'utf8');
      const hexRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
      let match;
      while ((match = hexRegex.exec(content)) !== null) {
        const hex = match[0];
        const lineNum = content.substring(0, match.index).split('\n').length;

        const lineContent = content.split('\n')[lineNum - 1];
        if (lineContent.includes('var(') || lineContent.includes(`[stroke='${hex}']`) || lineContent.includes(`[fill='${hex}']`)) continue;

        let canFix = false;
        if (!isChartFile && COLOR_FIX_MAP[hex.toLowerCase()]) {
          const context = content.substring(Math.max(0, match.index - 10), match.index + hex.length + 2);
          const isCssSelector = /stroke=['"]#|fill=['"]#/.test(context);

          if (!isCssSelector) {
            canFix = true;
          }
        }

        issues.push({
          type: 'styling',
          severity: 'medium',
          description: `Hardcoded hex color found: ${hex}${canFix ? ` (auto-fix available)` : ''}`,
          file,
          line: lineNum,
          autoFixable: canFix,
          offset: match.index,
          originalText: hex,
          replacement: canFix ? COLOR_FIX_MAP[hex.toLowerCase()] : undefined
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
    // Run only chromium project and ignore npm output
    execSync(`npx playwright test tests/ui-audit.spec.ts --project=chromium --reporter=json > ${resultsPath} 2>/dev/null || true`);

    if (fs.existsSync(resultsPath)) {
      const rawData = fs.readFileSync(resultsPath, 'utf8');
      // Playwright might output some warnings before JSON, so we find the first '{'
      const jsonStart = rawData.indexOf('{');
      if (jsonStart === -1) return [];

      const results: PlaywrightResult = JSON.parse(rawData.substring(jsonStart));

      const processSuite = (suite: PlaywrightSuite) => {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              if (result.status === 'failed') {
                const failures = result.errors || [];
                for (const fail of failures) {
                  let failureMessage = fail.message || 'Unknown failure';
                  // Sanitize error message: replace absolute paths and remove ANSI colors
                  failureMessage = failureMessage
                    .replace(new RegExp(process.cwd(), 'g'), '[PATH]')
                    /* eslint-disable-next-line no-control-regex */
                    .replace(/\x1b\[[0-9;]*m/g, '');

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
  const fixableIssues = issues.filter(i => i.autoFixable && i.offset !== undefined && i.replacement);

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

      // Sort bottom-up to maintain offsets
      const sortedIssues = [...fileIssues].sort((a, b) => (b.offset || 0) - (a.offset || 0));

      for (const issue of sortedIssues) {
        const offset = issue.offset!;
        const originalText = issue.originalText!;
        const replacement = issue.replacement!;

        if (content.substring(offset, offset + originalText.length) === originalText) {
          content = content.substring(0, offset) + replacement + content.substring(offset + originalText.length);
          modified = true;
          console.log(`Fixed issue at ${file}:${issue.line}`);
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
 * Generates a human-readable Markdown report with grouped issues
 */
function generateMarkdownReport(issues: UIIssue[]) {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  let md = `# UI/UX Maintenance Audit Report\n\n`;
  md += `Generated on: ${new Date().toLocaleString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Total Issues:** ${issues.length}\n`;
  md += `- **Critical:** ${criticalCount}\n`;
  md += `- **High:** ${highCount}\n`;
  md += `- **Medium:** ${mediumCount}\n`;
  md += `- **Low:** ${lowCount}\n\n`;

  md += `## Issues by Severity\n\n`;

  const severities: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];
  for (const sev of severities) {
    const sevIssues = issues.filter(i => i.severity === sev);
    if (sevIssues.length > 0) {
      md += `### ${sev.toUpperCase()}\n\n`;

      // Group identical issues
      const groups: Record<string, UIIssue[]> = {};
      for (const issue of sevIssues) {
        const key = `${issue.type}|${issue.description}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(issue);
      }

      for (const [key, groupedIssues] of Object.entries(groups)) {
        const parts = key.split('|');
        const type = parts[0];
        const description = parts[1];
        md += `#### ${description} (${groupedIssues.length} occurrences)\n`;
        md += `**Type:** ${type}\n\n`;
        md += `| File | Line |\n`;
        md += `| --- | --- |\n`;
        for (const issue of groupedIssues) {
          md += `| \`${issue.file || 'runtime'}\` | ${issue.line || '-'} |\n`;
        }
        md += `\n`;
      }
    }
  }

  const reportPath = path.join(process.cwd(), 'UI_MAINTENANCE_REPORT.md');
  fs.writeFileSync(reportPath, md);
  console.log(`Markdown report saved to ${reportPath}`);
}

/**
 * Sends Slack notification via webhook to #ui-maintenance
 */
async function sendSlackNotification(issues: UIIssue[]) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const prUrl = process.env.PULL_REQUEST_URL;
  const designLeadId = process.env.DESIGN_LEAD_SLACK_ID || 'DESIGN_LEAD';
  const qaLeadId = process.env.QA_LEAD_SLACK_ID || 'QA_LEAD';

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping notification.');
    return;
  }

  const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
  const fixableCount = issues.filter(i => i.autoFixable).length;

  const mentionLeads = criticalIssues.length > 0
    ? `\n🚨 *Critical Design/Accessibility Blockers Found!* tagging <@${designLeadId}> and <@${qaLeadId}>`
    : '';

  const prText = prUrl ? `\n\n*View Pull Request:* ${prUrl}` : '\n\n_Note: No automated PR was created for this run._';

  const message = {
    text: `🖌️ *Daily UI/UX Quality Audit Report for #ui-maintenance* - ${new Date().toLocaleDateString()}`,
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
    console.log('Slack notification sent successfully to #ui-maintenance.');
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

async function main() {
  console.log('Starting UI/UX maintenance audit...');

  const accessibilityIssues = scanAccessibilityIssues();
  const altIssues = scanMissingAlt();
  const colorIssues = scanHardcodedColors();
  const buttonIssues = scanInconsistentButtons();
  const buttonStyleIssues = scanInconsistentButtonStyles();
  const styleIssues = scanInconsistentStyles();

  let allIssues = [...accessibilityIssues, ...altIssues, ...colorIssues, ...buttonIssues, ...buttonStyleIssues, ...styleIssues];

  if (process.argv.includes('--fix')) {
    applyAutoFixes(allIssues);
    // Re-scan after fixes to ensure report is accurate
    const postFixAccessibility = scanAccessibilityIssues();
    const postFixAlt = scanMissingAlt();
    const postFixColor = scanHardcodedColors();
    const postFixButton = scanInconsistentButtons();
    const postFixButtonStyle = scanInconsistentButtonStyles();
    const postFixStyle = scanInconsistentStyles();
    allIssues = [...postFixAccessibility, ...postFixAlt, ...postFixColor, ...postFixButton, ...postFixButtonStyle, ...postFixStyle];
  }

  if (process.argv.includes('--runtime')) {
    const runtimeIssues = runRuntimeAudit();
    allIssues = [...allIssues, ...runtimeIssues];
  }

  console.log(`Total issues identified: ${allIssues.length}`);

  // JSON Report
  const reportPath = path.join(process.cwd(), 'ui-maintenance-report.json');
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

  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary,
    issues: allIssues.map(i => ({ ...i, offset: undefined, originalText: undefined, replacement: undefined }))
  }, null, 2));

  generateMarkdownReport(allIssues);

  if (process.argv.includes('--notify')) {
    await sendSlackNotification(allIssues);
  }

  console.log(`Audit completed. Report saved to ${reportPath} and UI_MAINTENANCE_REPORT.md`);
}

main().catch(console.error);
