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
 * Scans for accessibility issues: missing alt tags and missing form labels
 */
function scanAccessibility(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');

      // 1. Scan for missing alt attributes in images
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

      // 2. Scan for buttons missing aria-labels (icon-only buttons)
      const buttonRegex = /<(Button|button)([^>]*?)>([\s\S]*?)<\/\1>/g;
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

      // 3. Scan for inputs/selects/textareas missing labels
      if (!file.includes('src/shared/components/ui')) {
        const formRegex = /<(input|select|textarea|Input|Select|Textarea)([^>]*?)(\/?>)/g;
        while ((match = formRegex.exec(content)) !== null) {
          const tag = match[1];
          const attributes = match[2];

          if (attributes.includes('type="hidden"') || attributes.includes('type="submit"') || attributes.includes('type="button"')) continue;

          const idMatch = attributes.match(/id=["']([^"']+)["']/);
          const id = idMatch ? idMatch[1] : null;
          const hasAriaLabel = attributes.includes('aria-label') || attributes.includes('aria-labelledby');

          let hasAssociatedLabel = false;
          if (id) {
            hasAssociatedLabel = content.includes(`htmlFor="${id}"`) ||
                                 content.includes(`htmlFor='${id}'`) ||
                                 content.includes(`for="${id}"`) ||
                                 content.includes(`for='${id}'`);
          }

          if (!hasAriaLabel && !hasAssociatedLabel) {
            const beforeTag = content.substring(Math.max(0, match.index - 200), match.index);
            const isNestedInLabel = (beforeTag.includes('<label') && !beforeTag.includes('</label>')) ||
                                    (beforeTag.includes('<Label') && !beforeTag.includes('</Label>'));

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
    }
  } catch (e) {
    console.error('Error scanning for accessibility issues:', e);
  }
  return issues;
}

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

function scanInconsistentStyles(): UIIssue[] {
  const issues: UIIssue[] = [];
  try {
    const pixelOutput = execSync('grep -rnE "(p|m|gap|w|h|top|left|right|bottom)-\\[[0-9]+px\\]" src/ --include="*.tsx" || true').toString();
    if (pixelOutput) {
      pixelOutput.split('\n').filter(Boolean).forEach(line => {
        const parts = line.split(':');
        const file = parts[0];
        const lineNum = parts[1];
        const description = parts.slice(2).join(':').trim();
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
        const parts = line.split(':');
        const file = parts[0];
        const lineNum = parts[1];
        issues.push({
          type: 'styling',
          severity: 'low',
          description: `Hardcoded font found: ${parts.slice(2).join(':').trim()}`,
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
          originalText: hex
        });
      }
    }
  } catch (e) {
    console.error('Error scanning for hardcoded colors:', e);
  }
  return issues;
}

function runRuntimeAudit(): UIIssue[] {
  console.log('Running runtime UI audit...');
  const resultsPath = path.join(process.cwd(), 'playwright-results.json');
  const issues: UIIssue[] = [];

  try {
    execSync(`npx playwright test tests/ui-audit.spec.ts --project=chromium --reporter=json > ${resultsPath} 2>/dev/null || true`);
    if (fs.existsSync(resultsPath)) {
      const results: PlaywrightResult = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const processSuite = (suite: PlaywrightSuite) => {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              if (result.status === 'failed') {
                const failures = result.errors || [];
                for (const fail of failures) {
                  /* eslint-disable-next-line no-control-regex */
                  const failureMessage = (fail.message || 'Unknown failure').split('\n')[0].replace(/\x1b\[[0-9;]*m/g, '').replace(/\[PATH\]/g, '[PATH]');
                  issues.push({
                    type: 'accessibility',
                    severity: failureMessage.toLowerCase().includes('accessibility') ? 'high' : 'critical',
                    description: `Runtime audit failure in "${spec.title}": ${failureMessage}`,
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

function applyAutoFixes(issues: UIIssue[]) {
  console.log('Applying auto-fixes...');
  const fixableIssues = issues.filter(i => i.autoFixable && i.offset !== undefined && i.file);
  const fileGroups: Record<string, UIIssue[]> = {};
  for (const issue of fixableIssues) {
    const file = issue.file!;
    if (!fileGroups[file]) fileGroups[file] = [];
    fileGroups[file].push(issue);
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

      // Group by description and file for conciseness
      const groups: Record<string, { count: number, examples: string[] }> = {};
      for (const issue of sevIssues) {
        const key = issue.description;
        if (!groups[key]) groups[key] = { count: 0, examples: [] };
        groups[key].count++;
        if (groups[key].examples.length < 5) {
          groups[key].examples.push(`\`${issue.file || 'runtime'}\`:${issue.line || '-'}`);
        }
      }

      md += `| Description | Count | Examples |\n`;
      md += `| --- | --- | --- |\n`;
      for (const [desc, data] of Object.entries(groups)) {
        md += `| ${desc} | ${data.count} | ${data.examples.join(', ')}${data.count > 5 ? '...' : ''} |\n`;
      }
      md += `\n`;
    }
  }

  const reportPath = path.join(process.cwd(), 'UI_MAINTENANCE_REPORT.md');
  fs.writeFileSync(reportPath, md);
  console.log(`Markdown report saved to ${reportPath}`);
}

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
    ? `\n🚨 *Critical Design/Accessibility Blockers Found!* tagging <@${process.env.DESIGN_LEAD_SLACK_ID || 'Design-Lead'}> and <@${process.env.QA_LEAD_SLACK_ID || 'QA-Lead'}>`
    : '';
  const prText = prUrl ? `\n\n*View Pull Request:* ${prUrl}` : '\n\n_Note: Automated PR is managed by GitHub Actions._';
  const message = {
    text: `🖌️ *Daily UI/UX Quality Audit Report for #ui-maintenance* - ${new Date().toLocaleDateString()}`,
    attachments: [{
      color: criticalIssues.length > 0 ? '#ef4444' : (issues.length > 0 ? '#3b82f6' : '#10b981'),
      title: 'Audit Summary',
      text: issues.length > 0
        ? `*Total Issues:* ${issues.length}\n*Auto-fixable:* ${fixableCount}\n*Non-auto-fixable:* ${issues.length - fixableCount}${mentionLeads}\n\n*Top Issues:*\n${issues.slice(0, 5).map(i => `• [${i.severity.toUpperCase()}] ${i.description} in \`${i.file || 'runtime'}\``).join('\n')}${issues.length > 5 ? `\n...and ${issues.length - 5} more.` : ''}${prText}`
        : `No UI/UX inconsistencies detected. The design system is in excellent shape! 🌟${prText}`
    }]
  };
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error(`Slack API responded with ${response.status}`);
    console.log('Slack notification sent successfully.');
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

async function main() {
  console.log('Starting UI/UX maintenance audit...');
  const accessibilityIssues = scanAccessibility();
  const colorIssues = scanHardcodedColors();
  const buttonIssues = scanInconsistentButtons();
  const styleIssues = scanInconsistentStyles();
  let allIssues = [...accessibilityIssues, ...colorIssues, ...buttonIssues, ...styleIssues];

  if (process.argv.includes('--fix')) {
    applyAutoFixes(allIssues);
    const updatedAccessibility = scanAccessibility();
    const updatedColors = scanHardcodedColors();
    allIssues = [...updatedAccessibility, ...updatedColors, ...buttonIssues, ...styleIssues];
  }

  if (process.argv.includes('--runtime')) {
    const runtimeIssues = runRuntimeAudit();
    allIssues = [...allIssues, ...runtimeIssues];
  }

  console.log(`Total issues identified: ${allIssues.length}`);
  const reportPath = path.join(process.cwd(), 'ui-maintenance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: allIssues.length,
      fixable: allIssues.filter(i => i.autoFixable).length,
      unfixable: allIssues.filter(i => !i.autoFixable).length,
      severities: {
        critical: allIssues.filter(i => i.severity === 'critical').length,
        high: allIssues.filter(i => i.severity === 'high').length,
        medium: allIssues.filter(i => i.severity === 'medium').length,
        low: allIssues.filter(i => i.severity === 'low').length,
      }
    },
    issues: allIssues.map(i => ({ ...i, offset: undefined, originalText: undefined }))
  }, null, 2));

  generateMarkdownReport(allIssues);
  if (process.argv.includes('--notify')) await sendSlackNotification(allIssues);
  console.log('Audit completed.');
}

main().catch(console.error);
