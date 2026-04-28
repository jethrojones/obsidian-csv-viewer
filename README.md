# CSV and Log Viewer

View and edit CSV files as formatted, interactive tables, and inspect `.log` files with filtering.

## Features

- **CSV Parsing** — RFC-compliant parser handling quoted fields, escaped quotes, and mixed line endings
- **Interactive Tables** — Click column headers to sort ascending/descending with smart numeric detection
- **Inline Editing** — Toggle edit mode to modify cells directly in the table. Changes auto-save on blur. Tab/Shift+Tab to navigate between cells, Escape to deselect.
- **CSV Search & Filter** — Real-time search across all columns with match highlighting
- **Log Viewer** — Open `.log` files with line numbers, log level coloring, timestamp highlighting, level filters, search, and auto-scroll
- **Theme Support** — Uses Obsidian's CSS variables so tables match your light or dark theme
- **Responsive Layout** — Sticky headers, horizontal scrolling, and text-overflow handling for wide data
- **Row & Column Counts** — Toolbar shows dataset dimensions and filtered result counts

## Installation

### From Community Plugins (recommended)

1. Open **Settings → Community Plugins → Browse**
2. Search for **CSV and Log Viewer**
3. Click **Install**, then **Enable**

### Obsidian CLI

```bash
obsidian plugin:install id=csv-viewer enable
```

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/jethrojones/obsidian-csv-viewer/releases/latest)
2. Create a folder called `csv-viewer` in your vault's `.obsidian/plugins/` directory
3. Copy all three files into that folder
4. Reload Obsidian and enable the plugin in **Settings → Community Plugins**

## Usage

Once enabled, open any `.csv` file in your vault and it will render as a table automatically.

- **Sort** — Click any column header. Click again to reverse the sort direction.
- **Search** — Type in the search box to filter rows. Matching cells are highlighted.
- **Edit** — Click the Edit button in the toolbar to toggle edit mode. Click any cell to modify its contents. Changes save automatically when you click away. Sorting is disabled while editing.

Open any `.log` file in your vault to inspect it in the log viewer.

- **Search** — Type in the filter box to show matching log lines.
- **Level filters** — Toggle Errors, Warnings, Info, and Debug to narrow the view.
- **Auto-scroll** — Keep the viewer pinned to the latest matching line when reading growing logs.

## Options

In the plugin options, you can enable or disable CSV viewing and log viewing separately. Reload the plugin after changing either file type option.

## Privacy

CSV and Log Viewer works entirely inside your vault. It does not make network requests, collect telemetry, show ads, require an account, or read files outside the CSV or log file opened in Obsidian.

## Development

```bash
git clone https://github.com/jethrojones/obsidian-csv-viewer.git
cd obsidian-csv-viewer
npm install
npm run dev    # Watch mode with sourcemaps
npm run build  # Production build
```

## License

[MIT](LICENSE) — Copyright (c) 2026 Life Lab
