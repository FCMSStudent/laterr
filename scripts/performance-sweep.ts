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
 * Helper to find the matching closing brace for a block starting at a given position
 */
function findClosingBrace(content: string, startIdx: number): number {
    let depth = 0;
    let inString: string | null = null;
    let inComment: 'single' | 'multi' | null = null;
    let escaped = false;
    const templateStack: number[] = [];

    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (!inString) {
            if (inComment === 'single') { if (char === '\n') inComment = null; continue; }
            if (inComment === 'multi') { if (char === '*' && nextChar === '/') { inComment = null; i++; } continue; }
            if (char === '/' && nextChar === '/') { inComment = 'single'; i++; continue; }
            if (char === '/' && nextChar === '*') { inComment = 'multi'; i++; continue; }
        }
        if (!inComment) {
            if (inString) {
                if (char === inString) { if (inString !== '`') inString = null; }
                else if (inString === '`' && char === '$' && nextChar === '{') { templateStack.push(depth); inString = null; i++; }
                continue;
            } else {
                if (char === "'" || char === '"' || char === '`') { inString = char; continue; }
                if (char === '}' && templateStack.length > 0 && depth === templateStack[templateStack.length - 1]) { templateStack.pop(); inString = '`'; continue; }
            }
        }
        if (!inString && !inComment) {
            if (char === '{') depth++;
            if (char === '}') { depth--; if (depth === 0) return i; }
        }
    }
    return -1;
}

/**
 * Helper to ensure a named import exists for a given source
 */
function ensureNamedImport(content: string, importName: string, source: string): string {
    const importRegex = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${source}['"]`);
    const match = content.match(importRegex);
    if (match) {
        const namedPart = match[1];
        const imports = namedPart.split(',').map(i => i.trim());
        if (!imports.includes(importName)) {
            const updatedImports = [...imports, importName].join(', ');
            return content.replace(match[0], `import { ${updatedImports} } from '${source}'`);
        }
        return content;
    }
    // If no existing import from this source, add a new one
    return `import { ${importName} } from '${source}';\n${content}`;
}

/**
 * Helper to ensure React and specific hooks are imported
 */
function ensureReactImport(content: string, hooks: string[]): string {
    let newContent = content;
    const reactImportMatch = newContent.match(/import\s+(React\s*,?\s*)?\{([^}]+)\}\s+from\s+['"]react['"]/);
    const defaultReactImportMatch = newContent.match(/import\s+React\s+from\s+['"]react['"]/);
    if (reactImportMatch) {
        const [fullMatch, defaultPart, namedPart] = reactImportMatch;
        const existingHooks = namedPart.split(',').map(h => h.trim());
        const missingHooks = hooks.filter(h => !existingHooks.includes(h));
        if (missingHooks.length > 0) {
            const updatedNamedPart = [...existingHooks, ...missingHooks].join(', ');
            newContent = newContent.replace(fullMatch, `import ${defaultPart || ''}{ ${updatedNamedPart} } from 'react'`);
        }
    } else if (defaultReactImportMatch) {
        newContent = newContent.replace(defaultReactImportMatch[0], `import React, { ${hooks.join(', ')} } from 'react'`);
    } else if (!newContent.includes('from \'react\'') && !newContent.includes('from "react"')) {
        newContent = `import { ${hooks.join(', ')} } from 'react';\n` + newContent;
    }
    return newContent;
}

function runGrep(pattern: string, searchPath: string | string[] = 'src/'): string[] {
  try {
    const paths = Array.isArray(searchPath) ? searchPath.join(' ') : searchPath;
    const escapedPattern = pattern.replace(/'/g, "'\\''");
    const output = execSync(`grep -rnE '${escapedPattern}' ${paths} || true`).toString();
    return output.split('\n').filter(Boolean).filter(line => {
      const file = line.split(':')[0];
      return (file.endsWith('.ts') || file.endsWith('.tsx')) && !file.includes('node_modules') && !file.includes('.test.');
    });
  } catch (e) { return []; }
}

function scanForInefficientQueries(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  runGrep("\\.select\\(['\"]\\*['\"],\\s*\\{[^}]*count:").forEach(line => {
    const [file, lineNum] = line.split(':');
    results.push({ category: 'backend_api', description: 'Detected .select("*") with count option', impact: 'High overhead', file, line: lineNum });
  });
  return results;
}

function scanForN1Queries(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  const searchPaths = ['src/', 'supabase/functions/'];
  runGrep("\\.map\\(.*removeItemStorageObjects", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    results.push({ category: 'backend_api', description: 'Detected potential N+1 storage removal', impact: 'Multiple API calls', file, line: lineNum });
  });
  runGrep("\\.(map|forEach)\\(async", searchPaths).forEach(line => {
    const [file, lineNum] = line.split(':');
    results.push({ category: 'backend_api', description: 'Detected async inside loop (N+1)', impact: 'Performance bottleneck', file, line: lineNum });
  });
  return results;
}

function scanForMissingIndexes(): OptimizationResult[] {
    const results: OptimizationResult[] = [];
    const knownIndexed = ['id', 'created_at', 'user_id', 'updated_at', 'email', 'slug', 'status'];
    runGrep("\\.(eq|in|match)\\('[a-zA-Z0-9_]+'").forEach(line => {
        const match = line.match(/^([^:]+):([0-9]+):.*?\.(eq|in|match)\('([a-zA-Z0-9_]+)'/);
        if (match) {
            const [, file, lineNum, , col] = match;
            if (knownIndexed.includes(col) || col.endsWith('_id')) return;
            results.push({ category: 'database', description: `Missing index for "${col}"`, impact: 'Full table scan', file, line: lineNum });
        }
    });
    return results;
}

function scanForMissingMemo(): OptimizationResult[] {
  const results: OptimizationResult[] = [];
  runGrep("\\.(filter|sort|reduce)\\(").forEach(line => {
    const [file, lineNum] = line.split(':');
    if (!file.endsWith('.tsx')) return;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const lineIdx = parseInt(lineNum) - 1;
    if (lines[lineIdx].includes('.filter(Boolean)')) return;
    let insideHook = false;
    for (let i = lineIdx; i >= Math.max(0, lineIdx - 50); i--) {
        if (lines[i].includes('useMemo') || lines[i].includes('useCallback')) { insideHook = true; break; }
        if (lines[i].includes('export const') || lines[i].includes('function ')) break;
    }
    if (!insideHook) results.push({ category: 'frontend_react', description: 'Expensive operation outside useMemo', impact: 'Re-renders bottleneck', file, line: lineNum });
  });

  runGrep("\\.map\\(.*=>.*<[A-Z]").forEach(line => {
    const [file, lineNum] = line.split(':');
    if (!file.endsWith('.tsx')) return;
    const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
    if (match && !['Button', 'Badge', 'Icon'].includes(match[1])) {
        results.push({ category: 'frontend_react', description: `Component <${match[1]}> in list mapping`, impact: 'Redundant re-renders', file, line: lineNum });
    }
  });
  return results;
}

function applyFixes(optimizations: OptimizationResult[]) {
    if (!APPLY_FIXES) return;
    const fileGroups: Record<string, OptimizationResult[]> = {};
    optimizations.forEach(opt => {
        if (opt.file && opt.line) { if (!fileGroups[opt.file]) fileGroups[opt.file] = []; fileGroups[opt.file].push(opt); }
    });

    Object.entries(fileGroups).forEach(([file, fileOpts]) => {
        fileOpts.sort((a, b) => parseInt(b.line!) - parseInt(a.line!));
        try {
            let content = fs.readFileSync(file, 'utf8');
            fileOpts.forEach(opt => {
                const lines = content.split('\n');
                const lineIdx = parseInt(opt.line!) - 1;
                const line = lines[lineIdx];
                if (opt.description.includes('N+1 storage removal')) {
                    const m = line.match(/(\w+)\.map\(\w+\s*=>\s*removeItemStorageObjects\(\w+\)\)/);
                    if (m) {
                        lines[lineIdx] = line.replace(m[0], `removeMultipleItemsStorageObjects(${m[1]})`);
                        content = lines.join('\n');
                        content = ensureNamedImport(content, 'removeMultipleItemsStorageObjects', '@/features/bookmarks/utils/trash');
                        console.log(`✅ Fixed N+1 storage in ${file}`);
                    }
                } else if (opt.description.includes('select("*")')) {
                    const m = line.match(/\.select\((["'])\*(\1),\s*(\{[^}]*count:[^}]*\})\)/);
                    if (m) { lines[lineIdx] = line.replace(m[0], `.select(${m[1]}id${m[1]}, ${m[3]})`); content = lines.join('\n'); }
                } else if (opt.description.includes('in list mapping')) {
                    const comp = opt.description.match(/<(\w+)>/)?.[1];
                    if (comp) {
                        const imp = execSync(`grep -rnE "import.*${comp}.*from" ${file} || true`).toString().split('\n')[0];
                        const pathM = imp.match(/from\s+["'](.+)["']/);
                        if (pathM) {
                            let resPath = pathM[1].startsWith('@/') ? pathM[1].replace('@/', 'src/') + '.tsx' : path.join(path.dirname(file), pathM[1]) + '.tsx';
                            if (fs.existsSync(resPath)) {
                                let def = fs.readFileSync(resPath, 'utf8');
                                if (!def.includes('memo(')) {
                                    def = ensureReactImport(def, ['memo']);
                                    const exM = def.match(new RegExp(`export const ${comp}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`));
                                    if (exM) {
                                        const bodyStart = def.indexOf('{', exM.index! + exM[0].length - 2);
                                        const endIdx = findClosingBrace(def, bodyStart);
                                        if (endIdx !== -1) {
                                            def = def.substring(0, exM.index) + `export const ${comp} = memo((${exM[1]}) => ${def.substring(bodyStart, endIdx + 1)});` + def.substring(endIdx + 1);
                                            if (!def.includes(`${comp}.displayName`)) def += `\n\n${comp}.displayName = "${comp}";\n`;
                                            fs.writeFileSync(resPath, def);
                                            console.log(`✅ Memoized ${comp} in ${resPath}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            fs.writeFileSync(file, content);
        } catch (e) {}
    });
}

async function runBenchmarks() {
    const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const metrics: any = { timestamp: new Date().toISOString(), apiLatencyMs: 0, tableMetrics: {} };
    if (url && key) {
        try {
            const supabase = createClient(url, key);
            for (const t of ['items', 'subscriptions', 'health_measurements']) {
                const s = Date.now(); await supabase.from(t).select('id').limit(1);
                metrics.tableMetrics[t] = Date.now() - s;
            }
            metrics.apiLatencyMs = Math.round(Object.values(metrics.tableMetrics).reduce((a: any, b: any) => a + b, 0) as number / 3);
        } catch (e) {}
    }
    return metrics;
}

async function main() {
  if (process.env.SEND_NOTIFICATION_ONLY) {
    if (!fs.existsSync('performance-summary.json')) return;
    const s = JSON.parse(fs.readFileSync('performance-summary.json', 'utf8'));
    const url = process.env.SLACK_WEBHOOK_URL; if (!url) return;
    const lead = `<@${process.env.BACKEND_LEAD_SLACK_ID || "backend-lead"}>`;
    let text = `🚀 *Nightly Performance Sweep* - ${new Date().toLocaleDateString()}\n`;
    if (process.env.PR_URL) text += `📦 *PR:* ${process.env.PR_URL}\n`;
    const slow = Object.entries(s.benchmarks.tableMetrics || {}).filter(([_, l]) => (l as number) > API_RESPONSE_THRESHOLD_MS);
    if (slow.length) { text += `⚠️ *SLA VIOLATIONS* - cc ${lead}\n`; slow.forEach(([t, l]) => text += `• \`${t}\`: ${l}ms\n`); }
    await fetch(url, { method: 'POST', body: JSON.stringify({ text, attachments: [{ color: slow.length ? '#ef4444' : '#10b981', text: `Found ${s.optimizations.length} optimizations.` }] }) });
    return;
  }
  console.log('Starting nightly performance sweep...');
  const issues = [...scanForInefficientQueries(), ...scanForN1Queries(), ...scanForMissingIndexes(), ...scanForMissingMemo()];
  const before = await runBenchmarks();
  if (APPLY_FIXES && issues.length) { applyFixes(issues); const after = await runBenchmarks(); fs.writeFileSync('performance-summary.json', JSON.stringify({ optimizations: issues, benchmarks: { before, after, ...after } })); }
  else fs.writeFileSync('performance-summary.json', JSON.stringify({ optimizations: issues, benchmarks: before }));
}
main().catch(console.error);
