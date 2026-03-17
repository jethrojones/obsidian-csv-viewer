import { Plugin, TextFileView } from 'obsidian';
import { parseCSV, serializeCSV } from './csv-parser';

const CSV_VIEW_TYPE = 'csv-view';

class CSVView extends TextFileView {
    data: string = '';
    parsedRows: string[][] = [];
    sortColumn: number = -1;
    sortAscending: boolean = true;
    editMode: boolean = false;

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
        this.parsedRows = parseCSV(data);
        this.sortColumn = -1;
        this.sortAscending = true;
        this.renderCSV();
    }

    clear(): void {
        this.data = '';
        this.parsedRows = [];
        this.contentEl.empty();
    }

    getSortedRows(): { rows: string[][], originalIndices: number[] } {
        if (this.parsedRows.length < 2) {
            return {
                rows: this.parsedRows,
                originalIndices: this.parsedRows.map((_, i) => i)
            };
        }

        const headers = this.parsedRows[0];
        const dataRows = this.parsedRows.slice(1);
        const originalIndices = dataRows.map((_, i) => i + 1); // 1-based (skip header)

        if (this.sortColumn < 0) {
            return {
                rows: [headers, ...dataRows],
                originalIndices: [0, ...originalIndices]
            };
        }

        const indexedRows = dataRows.map((row, i) => ({ row, originalIndex: i + 1 }));

        indexedRows.sort((a, b) => {
            const aVal = a.row[this.sortColumn] || '';
            const bVal = b.row[this.sortColumn] || '';

            const aNum = parseFloat(aVal.replace(/[,$%]/g, ''));
            const bNum = parseFloat(bVal.replace(/[,$%]/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return this.sortAscending ? aNum - bNum : bNum - aNum;
            }

            const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
            return this.sortAscending ? comparison : -comparison;
        });

        return {
            rows: [headers, ...indexedRows.map(r => r.row)],
            originalIndices: [0, ...indexedRows.map(r => r.originalIndex)]
        };
    }

    renderCSV() {
        this.contentEl.empty();

        const container = this.contentEl.createDiv({ cls: 'csv-view-content' });

        const { rows, originalIndices } = this.getSortedRows();

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

        const editBtn = toolbar.createEl('button', {
            text: 'Edit',
            cls: 'csv-edit-btn' + (this.editMode ? ' active' : '')
        });
        editBtn.addEventListener('click', () => {
            this.editMode = !this.editMode;
            this.renderCSV();
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

            if (this.editMode) {
                th.addClass('sort-disabled');
            } else {
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
            }
        });

        // Body
        const tbody = table.createEl('tbody');
        for (let i = 1; i < rows.length; i++) {
            const tr = tbody.createEl('tr');
            const originalRowIndex = originalIndices[i];

            for (let j = 0; j < headers.length; j++) {
                const cellValue = rows[i][j] || '';
                const td = tr.createEl('td', { text: cellValue, attr: { title: cellValue } });

                if (this.editMode) {
                    // Use contenteditable="true" for broad Obsidian/Electron compatibility;
                    // intercept paste to strip rich text.
                    td.setAttribute('contenteditable', 'true');
                    td.removeAttribute('title');

                    td.addEventListener('paste', (e: ClipboardEvent) => {
                        e.preventDefault();
                        const text = e.clipboardData?.getData('text/plain') || '';
                        document.execCommand('insertText', false, text);
                    });

                    td.addEventListener('blur', () => {
                        const newValue = td.textContent || '';
                        if (newValue !== cellValue) {
                            this.parsedRows[originalRowIndex][j] = newValue;
                            this.data = serializeCSV(this.parsedRows);
                            this.requestSave();
                        }
                    });

                    td.addEventListener('keydown', (e: KeyboardEvent) => {
                        if (e.key === 'Tab') {
                            e.preventDefault();
                            const allCells = Array.from(tbody.querySelectorAll('td[contenteditable]'));
                            const currentIndex = allCells.indexOf(td);
                            const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
                            if (nextIndex >= 0 && nextIndex < allCells.length) {
                                (allCells[nextIndex] as HTMLElement).focus();
                            }
                        } else if (e.key === 'Escape') {
                            td.blur();
                        }
                    });
                }
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
    }

    async onunload() {
        // no-op
    }
}
