import { App, Notice, Plugin, PluginSettingTab, Setting, TextFileView } from 'obsidian';
import { parseCSV, serializeCSV } from './csv-parser';

const CSV_VIEW_TYPE = 'csv-view';
const LOG_VIEW_TYPE = 'log-view';

interface CSVViewerSettings {
    enableCsvViewer: boolean;
    enableLogViewer: boolean;
}

const DEFAULT_SETTINGS: CSVViewerSettings = {
    enableCsvViewer: true,
    enableLogViewer: true
};

type LogLevel = 'error' | 'warning' | 'info' | 'debug' | 'default';

interface LogLine {
    number: number;
    text: string;
    level: LogLevel;
}

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

    onOpen(): Promise<void> {
        this.contentEl.addClass('csv-view-container');
        return Promise.resolve();
    }

    onClose(): Promise<void> {
        this.contentEl.empty();
        return Promise.resolve();
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
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0) return;

                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        range.insertNode(document.createTextNode(text));
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
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
                    row.removeClass('csv-row-hidden');
                    visibleCount++;
                } else {
                    row.addClass('csv-row-hidden');
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

class LogView extends TextFileView {
    data: string = '';
    lines: LogLine[] = [];
    filteredLines: LogLine[] = [];
    showErrors: boolean = true;
    showWarnings: boolean = true;
    showInfo: boolean = true;
    showDebug: boolean = true;
    autoScroll: boolean = true;
    searchQuery: string = '';

    getViewType(): string {
        return LOG_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.file?.basename || 'Log';
    }

    getIcon(): string {
        return 'file-text';
    }

    onOpen(): Promise<void> {
        this.contentEl.addClass('log-view-container');
        return Promise.resolve();
    }

    onClose(): Promise<void> {
        this.contentEl.empty();
        return Promise.resolve();
    }

    getViewData(): string {
        return this.data;
    }

    setViewData(data: string, clear: boolean): void {
        this.data = data;
        this.lines = data.split('\n').map((line, index) => ({
            number: index + 1,
            text: line,
            level: this.detectLogLevel(line)
        }));
        this.applyFilters();
        this.renderLog();
    }

    clear(): void {
        this.data = '';
        this.lines = [];
        this.filteredLines = [];
        this.contentEl.empty();
    }

    detectLogLevel(line: string): LogLevel {
        const upper = line.toUpperCase();

        if (upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('CRITICAL')) {
            return 'error';
        }

        if (upper.includes('WARN')) {
            return 'warning';
        }

        if (upper.includes('DEBUG') || upper.includes('TRACE')) {
            return 'debug';
        }

        if (upper.includes('INFO')) {
            return 'info';
        }

        return 'default';
    }

    applyFilters(): void {
        const query = this.searchQuery.toLowerCase();

        this.filteredLines = this.lines.filter((line) => {
            if (line.level === 'error' && !this.showErrors) return false;
            if (line.level === 'warning' && !this.showWarnings) return false;
            if (line.level === 'info' && !this.showInfo) return false;
            if (line.level === 'debug' && !this.showDebug) return false;

            if (query) {
                return line.text.toLowerCase().includes(query);
            }

            return true;
        });
    }

    renderLog(): void {
        this.contentEl.empty();

        const container = this.contentEl.createDiv({ cls: 'log-view-content' });
        const toolbar = container.createDiv({ cls: 'log-view-toolbar' });

        const searchInput = toolbar.createEl('input', {
            cls: 'log-view-search',
            attr: { type: 'text', placeholder: 'Filter...' }
        });
        searchInput.value = this.searchQuery;

        const errorBtn = this.createFilterButton(toolbar, 'Errors', 'error', this.showErrors);
        const warnBtn = this.createFilterButton(toolbar, 'Warnings', 'warning', this.showWarnings);
        const infoBtn = this.createFilterButton(toolbar, 'Info', 'info', this.showInfo);
        const debugBtn = this.createFilterButton(toolbar, 'Debug', 'debug', this.showDebug);

        const scrollBtn = toolbar.createEl('button', {
            text: 'Auto-scroll',
            cls: 'log-scroll-btn' + (this.autoScroll ? ' active' : '')
        });

        const info = toolbar.createDiv({ cls: 'log-view-info' });
        const logLines = container.createDiv({ cls: 'log-lines' });

        searchInput.addEventListener('input', () => {
            this.searchQuery = searchInput.value;
            this.applyFilters();
            this.renderLogLines(logLines, info);
        });

        errorBtn.addEventListener('click', () => {
            this.showErrors = !this.showErrors;
            errorBtn.toggleClass('active', this.showErrors);
            this.applyFilters();
            this.renderLogLines(logLines, info);
        });

        warnBtn.addEventListener('click', () => {
            this.showWarnings = !this.showWarnings;
            warnBtn.toggleClass('active', this.showWarnings);
            this.applyFilters();
            this.renderLogLines(logLines, info);
        });

        infoBtn.addEventListener('click', () => {
            this.showInfo = !this.showInfo;
            infoBtn.toggleClass('active', this.showInfo);
            this.applyFilters();
            this.renderLogLines(logLines, info);
        });

        debugBtn.addEventListener('click', () => {
            this.showDebug = !this.showDebug;
            debugBtn.toggleClass('active', this.showDebug);
            this.applyFilters();
            this.renderLogLines(logLines, info);
        });

        scrollBtn.addEventListener('click', () => {
            this.autoScroll = !this.autoScroll;
            scrollBtn.toggleClass('active', this.autoScroll);
            if (this.autoScroll) {
                logLines.scrollTop = logLines.scrollHeight;
            }
        });

        this.renderLogLines(logLines, info);
    }

    createFilterButton(parent: HTMLElement, text: string, level: LogLevel, active: boolean): HTMLButtonElement {
        return parent.createEl('button', {
            text,
            cls: `log-filter-btn ${level}` + (active ? ' active' : '')
        });
    }

    renderLogLines(container: HTMLElement, info: HTMLElement): void {
        container.empty();

        if (this.filteredLines.length === 0) {
            container.createDiv({ cls: 'log-empty', text: 'No matching log lines' });
            info.textContent = `0 of ${this.lines.length.toLocaleString()} lines`;
            return;
        }

        info.textContent = `${this.filteredLines.length.toLocaleString()} of ${this.lines.length.toLocaleString()} lines`;

        for (const line of this.filteredLines) {
            const lineEl = container.createDiv({ cls: `log-line ${line.level}` });
            lineEl.createDiv({ cls: 'log-line-number', text: String(line.number) });

            const textEl = lineEl.createDiv({ cls: 'log-line-text' });
            this.renderLogLineText(textEl, line.text || ' ');
        }

        if (this.autoScroll) {
            container.scrollTop = container.scrollHeight;
        }
    }

    renderLogLineText(parent: HTMLElement, text: string): void {
        const timestampPattern = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?|\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]/g;
        const matches = this.findTextMatches(text, this.searchQuery, timestampPattern);

        for (const match of matches) {
            if (match.className) {
                parent.createSpan({ text: match.text, cls: match.className });
            } else {
                parent.appendText(match.text);
            }
        }
    }

    findTextMatches(text: string, query: string, timestampPattern: RegExp): { text: string, className?: string }[] {
        const ranges: { start: number, end: number, className: string }[] = [];
        let timestampMatch: RegExpExecArray | null;

        while ((timestampMatch = timestampPattern.exec(text)) !== null) {
            ranges.push({
                start: timestampMatch.index,
                end: timestampMatch.index + timestampMatch[0].length,
                className: 'log-timestamp'
            });
        }

        if (query) {
            const lowerText = text.toLowerCase();
            const lowerQuery = query.toLowerCase();
            let index = lowerText.indexOf(lowerQuery);

            while (index !== -1) {
                ranges.push({
                    start: index,
                    end: index + query.length,
                    className: 'log-highlight'
                });
                index = lowerText.indexOf(lowerQuery, index + query.length);
            }
        }

        ranges.sort((a, b) => a.start - b.start || b.end - a.end);

        const segments: { text: string, className?: string }[] = [];
        let position = 0;

        for (const range of ranges) {
            if (range.start < position) continue;

            if (range.start > position) {
                segments.push({ text: text.slice(position, range.start) });
            }

            segments.push({
                text: text.slice(range.start, range.end),
                className: range.className
            });
            position = range.end;
        }

        if (position < text.length) {
            segments.push({ text: text.slice(position) });
        }

        return segments.length > 0 ? segments : [{ text }];
    }
}

export default class CSVViewerPlugin extends Plugin {
    settings: CSVViewerSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(CSV_VIEW_TYPE, (leaf) => new CSVView(leaf));
        this.registerView(LOG_VIEW_TYPE, (leaf) => new LogView(leaf));

        if (this.settings.enableCsvViewer) {
            this.registerExtensions(['csv'], CSV_VIEW_TYPE);
        }

        if (this.settings.enableLogViewer) {
            this.registerExtensions(['log'], LOG_VIEW_TYPE);
        }

        this.addSettingTab(new CSVViewerSettingTab(this.app, this));
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}

class CSVViewerSettingTab extends PluginSettingTab {
    plugin: CSVViewerPlugin;

    constructor(app: App, plugin: CSVViewerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('CSV viewer')
            .setDesc('Open .csv files in the interactive table viewer.')
            .addToggle((toggle) => toggle
                .setValue(this.plugin.settings.enableCsvViewer)
                .onChange(async (value) => {
                    this.plugin.settings.enableCsvViewer = value;
                    await this.plugin.saveSettings();
                    new Notice('Reload this plugin for file type changes to take effect.');
                }));

        new Setting(containerEl)
            .setName('Log viewer')
            .setDesc('Open .log files in the filtered log viewer.')
            .addToggle((toggle) => toggle
                .setValue(this.plugin.settings.enableLogViewer)
                .onChange(async (value) => {
                    this.plugin.settings.enableLogViewer = value;
                    await this.plugin.saveSettings();
                    new Notice('Reload this plugin for file type changes to take effect.');
                }));
    }
}
