/**
 * Parse CSV text into a 2D array of strings.
 * RFC 4180 compliant - handles quoted fields, escaped quotes, and mixed line endings.
 */
export function parseCSV(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    let wasQuoted = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    // Escaped quote
                    currentCell += '"';
                    i++;
                } else {
                    // End of quoted field
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                wasQuoted = true;
            } else if (char === ',') {
                currentRow.push(wasQuoted ? currentCell : currentCell.trim());
                currentCell = '';
                wasQuoted = false;
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                currentRow.push(wasQuoted ? currentCell : currentCell.trim());
                if (currentRow.length > 0 && currentRow.some(cell => cell !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
                wasQuoted = false;
                if (char === '\r') i++;
            } else if (char !== '\r') {
                currentCell += char;
            }
        }
    }

    // Handle last row (no trailing newline)
    if (currentCell || currentRow.length > 0) {
        currentRow.push(wasQuoted ? currentCell : currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
            rows.push(currentRow);
        }
    }

    return rows;
}

/**
 * Serialize a 2D array back to CSV text.
 * Properly quotes fields containing commas, quotes, or newlines.
 */
export function serializeCSV(rows: string[][]): string {
    return rows.map(row =>
        row.map(cell => {
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(',')
    ).join('\n');
}
