# CSV Viewer for Obsidian

View CSV files directly in Obsidian as formatted, interactive tables.

## Features

- **CSV Parsing** — RFC-compliant parser handling quoted fields, escaped quotes, and mixed line endings
- **Interactive Tables** — Click column headers to sort ascending/descending with smart numeric detection
- **Search & Filter** — Real-time search across all columns with match highlighting
- **Theme Support** — Uses Obsidian's CSS variables so tables match your light or dark theme
- **Responsive Layout** — Sticky headers, horizontal scrolling, and text-overflow handling for wide data
- **Row & Column Counts** — Toolbar shows dataset dimensions and filtered result counts

## Installation

### From Community Plugins (recommended)

1. Open **Settings → Community Plugins → Browse**
2. Search for **CSV Viewer**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/jethrojones/obsidian-csv-viewer/releases/latest)
2. Create a folder called `csv-viewer` in your vault's `.obsidian/plugins/` directory
3. Copy both files into that folder
4. Reload Obsidian and enable the plugin in **Settings → Community Plugins**

## Usage

Once enabled, open any `.csv` file in your vault and it will render as a table automatically.

- **Sort** — Click any column header. Click again to reverse the sort direction.
- **Search** — Type in the search box to filter rows. Matching cells are highlighted.

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
