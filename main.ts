import { Plugin, WorkspaceLeaf, TextFileView, TFile } from 'obsidian';

const CSV_VIEW_TYPE = 'csv-view';

class CSVView extends TextFileView {
    data: string = '';
    parsedRows: string[][] = [];
    sortColumn: number = -1;
    sortAscending: boolean = true;

    getViewType(): string {
        return CSV_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.file?.basename || 'CSV';
    }

    getIcon(): string {
        return 'table';
    }

    async onOpen() {
        this.contentEl.addClass('csv-view-container');
    }

    async onClose() {
        this.contentEl.empty();
    }

    getViewData(): string {
        return this.data;
    }

    setViewData(data: string, clear: boolean): void {
        this.data = data;
        this.parsedRows = this.parseCSV(data);
        this.sortColumn = -1;
        this.sortAscending = true;
        this.renderCSV();
    }

    clear(): void {
        this.data = '';
        this.parsedRows = [];
        this.contentEl.empty();
    }

    parseCSV(csvText: string): string[][] {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        currentCell += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    currentCell += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentCell.trim());
                    currentCell = '';
                } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                    currentRow.push(currentCell.trim());
                    if (currentRow.length > 0 && currentRow.some(cell => cell !== '')) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentCell = '';
                    if (char === '\r') i++;
                } else if (char !== '\r') {
                    currentCell += char;
                }
            }
        }

        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell !== '')) {
                rows.push(currentRow);
            }
        }

        return rows;
    }

    getSortedRows(): string[][] {
        if (this.parsedRows.length < 2) return this.parsedRows;
        
        const headers = this.parsedRows[0];
        const dataRows = this.parsedRows.slice(1);
        
        if (this.sortColumn < 0) {
            return [headers, ...dataRows];
        }

        const sorted = [...dataRows].sort((a, b) => {
            const aVal = a[this.sortColumn] || '';
            const bVal = b[this.sortColumn] || '';
            
            // Try numeric sort first
            const aNum = parseFloat(aVal.replace(/[,$%]/g, ''));
            const bNum = parseFloat(bVal.replace(/[,$%]/g, ''));
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return this.sortAscending ? aNum - bNum : bNum - aNum;
            }
            
            // Fall back to string sort
            const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
            return this.sortAscending ? comparison : -comparison;
        });

        return [headers, ...sorted];
    }

    renderCSV() {
        this.contentEl.empty();

        const container = this.contentEl.createDiv({ cls: 'csv-view-content' });
        
        const style = container.createEl('style');
        style.textContent = `
            .csv-view-content {
                padding: 20px;
                overflow: auto;
                height: 100%;
                font-family: var(--font-interface);
            }
            .csv-view-toolbar {
                margin-bottom: 16px;
                display: flex;
                gap: 16px;
                align-items: center;
            }
            .csv-view-search {
                padding: 8px 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 14px;
                width: 250px;
                transition: border-color 0.15s ease;
            }
            .csv-view-search:focus {
                outline: none;
                border-color: var(--interactive-accent);
            }
            .csv-view-search::placeholder {
                color: var(--text-faint);
            }
            .csv-view-info {
                color: var(--text-muted);
                font-size: 13px;
            }
            .csv-table-wrapper {
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid var(--background-modifier-border);
            }
            .csv-table-scroll {
                max-height: calc(100vh - 180px);
                overflow: auto;
            }
            .csv-table {
                border-collapse: collapse;
                width: 100%;
                font-size: 13px;
            }
            .csv-table th {
                background: var(--background-secondary);
                font-weight: 500;
                position: sticky;
                top: 0;
                z-index: 10;
                cursor: pointer;
                user-select: none;
                transition: background 0.15s ease;
                border-bottom: 2px solid var(--background-modifier-border);
            }
            .csv-table th:hover {
                background: var(--background-modifier-hover);
            }
            .csv-table th.sorted {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
            }
            .csv-table th, .csv-table td {
                padding: 10px 14px;
                text-align: left;
                border-right: 1px solid var(--background-modifier-border);
            }
            .csv-table th:last-child, .csv-table td:last-child {
                border-right: none;
            }
            .csv-table td {
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                border-bottom: 1px solid var(--background-modifier-border-hover);
            }
            .csv-table tr:last-child td {
                border-bottom: none;
            }
            .csv-table tbody tr {
                transition: background 0.1s ease;
            }
            .csv-table tbody tr:hover {
                background: var(--background-modifier-hover);
            }
            .csv-table tbody tr:nth-child(even) {
                background: var(--background-secondary-alt);
            }
            .csv-table tbody tr:nth-child(even):hover {
                background: var(--background-modifier-hover);
            }
            .csv-table td:hover {
                white-space: normal;
                word-wrap: break-word;
            }
            .csv-highlight {
                background: var(--text-highlight-bg) !important;
            }
            .sort-indicator {
                margin-left: 6px;
                opacity: 0.7;
                font-size: 10px;
            }
            .th-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .th-text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        `;

        const rows = this.getSortedRows();
        
        if (rows.length === 0) {
            container.createEl('p', { text: 'No data in CSV file', cls: 'csv-view-info' });
            return;
        }

        // Toolbar
        const toolbar = container.createDiv({ cls: 'csv-view-toolbar' });
        
        const searchInput = toolbar.createEl('input', {
            cls: 'csv-view-search',
            attr: { type: 'text', placeholder: '🔍 Search...' }
        });

        const info = toolbar.createDiv({ cls: 'csv-view-info' });
        const dataRowCount = rows.length - 1;
        const colCount = rows[0]?.length || 0;
        info.textContent = `${dataRowCount.toLocaleString()} rows · ${colCount} columns`;

        // Table
        const tableWrapper = container.createDiv({ cls: 'csv-table-wrapper' });
        const tableScroll = tableWrapper.createDiv({ cls: 'csv-table-scroll' });
        const table = tableScroll.createEl('table', { cls: 'csv-table' });
        
        // Header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        const headers = rows[0] || [];
        
        headers.forEach((header, index) => {
            const th = headerRow.createEl('th');
            const thContent = th.createDiv({ cls: 'th-content' });
            thContent.createSpan({ text: header, cls: 'th-text', attr: { title: header } });
            
            if (this.sortColumn === index) {
                th.addClass('sorted');
                thContent.createSpan({ 
                    text: this.sortAscending ? '▲' : '▼', 
                    cls: 'sort-indicator' 
                });
            }

            th.addEventListener('click', () => {
                if (this.sortColumn === index) {
                    if (this.sortAscending) {
                        this.sortAscending = false;
                    } else {
                        this.sortColumn = -1;
                        this.sortAscending = true;
                    }
                } else {
                    this.sortColumn = index;
                    this.sortAscending = true;
                }
                this.renderCSV();
            });
        });

        // Body
        const tbody = table.createEl('tbody');
        for (let i = 1; i < rows.length; i++) {
            const tr = tbody.createEl('tr');
            for (let j = 0; j < headers.length; j++) {
                const cell = rows[i][j] || '';
                tr.createEl('td', { text: cell, attr: { title: cell } });
            }
        }

        // Search
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const bodyRows = tbody.querySelectorAll('tr');
            let visibleCount = 0;

            bodyRows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                let matches = false;

                cells.forEach((cell) => {
                    const text = cell.textContent?.toLowerCase() || '';
                    if (text.includes(query)) {
                        matches = true;
                        if (query) {
                            cell.addClass('csv-highlight');
                        } else {
                            cell.removeClass('csv-highlight');
                        }
                    } else {
                        cell.removeClass('csv-highlight');
                    }
                });

                if (matches || !query) {
                    (row as HTMLElement).style.display = '';
                    visibleCount++;
                } else {
                    (row as HTMLElement).style.display = 'none';
                }
            });

            if (query) {
                info.textContent = `${visibleCount.toLocaleString()} of ${dataRowCount.toLocaleString()} rows`;
            } else {
                info.textContent = `${dataRowCount.toLocaleString()} rows · ${colCount} columns`;
            }
        });
    }
}

export default class CSVViewerPlugin extends Plugin {
    async onload() {
        this.registerView(CSV_VIEW_TYPE, (leaf) => new CSVView(leaf));
        this.registerExtensions(['csv'], CSV_VIEW_TYPE);
        console.log('CSV Viewer plugin loaded');
    }

    async onunload() {
        console.log('CSV Viewer plugin unloaded');
    }
}
