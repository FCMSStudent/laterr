/**
 * Spreadsheet (Excel/CSV) processing module
 */

import JSZip from "https://esm.sh/jszip@3.10.1";
import { SpreadsheetExtractionResult, AnalysisResult, isApiError } from "./types.ts";
import { callAiAnalysis, buildAnalysisPrompt } from "./ai.ts";
import { extractAiMetadata, parseAiResponse } from "./validation.ts";

/**
 * Extract data from spreadsheet file
 */
export async function extractSpreadsheetData(fileUrl: string, fileType: string): Promise<SpreadsheetExtractionResult> {
    console.log('📊 Fetching spreadsheet bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch spreadsheet: ${response.status}`);

    if (fileType === 'text/csv') {
        // Parse CSV
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        const rows = lines.map(line => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });

        const headers = rows[0] || [];
        const firstRows = rows.slice(1, 6); // Get first 5 data rows

        console.log(`📊 CSV: ${rows.length} rows, ${headers.length} columns`);
        return {
            headers,
            firstRows,
            rowCount: rows.length - 1,
            columnCount: headers.length
        };
    } else {
        // Parse Excel
        const arrayBuffer = await response.arrayBuffer();
        console.log(`📊 Excel size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

        const zip = await JSZip.loadAsync(arrayBuffer);

        const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');
        if (!sheetXml) {
            throw new Error('Could not find worksheet in Excel file');
        }

        // Extract shared strings
        const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
        const sharedStrings: string[] = [];
        if (sharedStringsXml) {
            const matches = sharedStringsXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
            for (const match of matches) {
                sharedStrings.push(match[1]);
            }
        }

        // Extract cell values
        const cellMatches = sheetXml.matchAll(/<c r="([A-Z]+\d+)"[^>]*(?:\s+t="([^"]*)")?[^>]*><v>([^<]*)<\/v><\/c>/g);
        const cells: Map<string, string> = new Map();

        for (const match of cellMatches) {
            const cellRef = match[1];
            const cellType = match[2];
            const value = match[3];

            if (cellType === 's') {
                const index = parseInt(value);
                cells.set(cellRef, sharedStrings[index] || value);
            } else {
                cells.set(cellRef, value);
            }
        }

        // Organize into rows
        const rowData: Map<number, Map<string, string>> = new Map();
        for (const [cellRef, value] of cells.entries()) {
            const rowMatch = cellRef.match(/([A-Z]+)(\d+)/);
            if (rowMatch) {
                const col = rowMatch[1];
                const row = parseInt(rowMatch[2]);

                if (!rowData.has(row)) {
                    rowData.set(row, new Map());
                }
                rowData.get(row)!.set(col, value);
            }
        }

        // Get unique columns and sort
        const allColumns = new Set<string>();
        for (const row of rowData.values()) {
            for (const col of row.keys()) {
                allColumns.add(col);
            }
        }
        const sortedColumns = Array.from(allColumns).sort();

        // Convert to arrays
        const rows: string[][] = [];
        const sortedRowNumbers = Array.from(rowData.keys()).sort((a, b) => a - b);

        for (const rowNum of sortedRowNumbers.slice(0, 6)) {
            const rowMap = rowData.get(rowNum)!;
            const rowArray = sortedColumns.map(col => rowMap.get(col) || '');
            rows.push(rowArray);
        }

        const headers = rows[0] || [];
        const firstRows = rows.slice(1);

        console.log(`📊 Excel: ${sortedRowNumbers.length} rows, ${sortedColumns.length} columns`);
        return {
            headers,
            firstRows,
            rowCount: sortedRowNumbers.length - 1,
            columnCount: sortedColumns.length
        };
    }
}

/**
 * Process spreadsheet file
 */
export async function processSpreadsheet(
    fileUrl: string,
    fileName: string,
    fileType: string,
    apiKey: string
): Promise<AnalysisResult> {
    console.log('📊 Processing spreadsheet');

    try {
        const { headers, firstRows, rowCount, columnCount } = await extractSpreadsheetData(fileUrl, fileType);

        // Build data sample
        const dataSample = [
            `Headers: ${headers.join(', ')}`,
            `Sample rows (first ${Math.min(firstRows.length, 5)}):`,
            ...firstRows.slice(0, 5).map((row, i) => `Row ${i + 1}: ${row.join(', ')}`)
        ].join('\n');

        const prompt = buildAnalysisPrompt(fileType, fileName, {
            textSample: dataSample,
            rowCount,
            columnCount
        });

        const data = await callAiAnalysis(apiKey, prompt);

        const fallback = {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: `Spreadsheet with ${rowCount} rows and ${columnCount} columns`,
            tags: ['spreadsheet', 'data', fileType === 'text/csv' ? 'csv' : 'excel'],
            category: 'business'
        };

        const { raw: aiRaw } = extractAiMetadata(data, fallback);
        const parsed = parseAiResponse(aiRaw, fallback);

        console.log('✅ Spreadsheet analysis complete');

        return {
            title: parsed.title || fallback.title,
            description: parsed.description || fallback.description,
            tags: parsed.tags || fallback.tags,
            category: parsed.category || 'business',
            extractedText: dataSample,
            summary: parsed.summary || '',
            keyPoints: parsed.keyPoints || []
        };
    } catch (error) {
        console.error('❌ Spreadsheet processing error:', error);

        if (isApiError(error) && (error.code === "rate_limited" || error.code === "credits_exhausted")) {
            throw error;
        }

        return {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: 'Spreadsheet containing data tables',
            tags: ['spreadsheet', 'data'],
            category: 'business',
            extractedText: '',
            summary: '',
            keyPoints: []
        };
    }
}
