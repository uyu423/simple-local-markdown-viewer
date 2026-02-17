# Simple Local Markdown Viewer

A fast, single-file markdown viewer for browsing and previewing local markdown files directly in your browser. No server needed—just open the built HTML file and start exploring.

## Features

- **Single HTML file**: Builds to a standalone ~1MB HTML file. Open directly via `file://` protocol in any modern browser.
- **Zero server required**: Works offline, no installation, no dependencies at runtime.
- **File tree explorer**: Hierarchical directory view with fold/unfold controls. Quickly navigate folder structures.
- **Full-text search**: Search across file names and content simultaneously. Results show file path and snippet context.
- **Markdown rendering**: Uses [marked](https://marked.js.org/) + [highlight.js](https://highlightjs.org/) for syntax-highlighted code blocks with language detection.
- **View modes**:
  - **Tree mode**: Directory structure with collapsible folders and first-line previews.
  - **Recent mode**: Files sorted by last modified time.
- **Background auto refresh**: When a native folder handle is active, the viewer refreshes the open folder every minute in the background while preserving current view state.
- **Theme support**: Dark, light, and system-preference modes. Persists your choice.
- **Smart folder memory**: Remembers your last opened folder via IndexedDB. Reconnect with one click.
- **Resizable sidebar**: Drag the divider to adjust layout.
- **Keyboard shortcuts**: Power-user friendly navigation.

## Supported File Types

- `.md` — Standard markdown
- `.mdc` — Markdown with components
- `.mdx` — MDX (Markdown + JSX)
- `.markdown` — Alternative markdown extension
- `.mdown` — Alternative markdown extension
- `.txt` — Plain text files

## How to Use

### Option 1: Direct in Browser (Fastest)

1. Download or build `index.html`
2. Open it in your browser: `File → Open File` or drag into browser
3. Click "폴더 선택" (Pick Folder) button
4. Select any folder with markdown files
5. Start exploring

### Option 2: Symlink for Quick Access

If you work with a specific project, symlink the built file into your project:

```bash
# Build the project once
npm run build

# Symlink into your project for quick access
ln -s /path/to/simple-local-markdown-viewer/docs/index.html ~/my-project/docs-viewer.html

# Open anytime
open ~/my-project/docs-viewer.html
```

### Option 3: Local Documentation Browser

Use as a universal documentation browser for any project:

```bash
# Keep a copy of index.html in a convenient location
cp docs/index.html ~/bin/md-viewer.html

# Open from anywhere
open ~/bin/md-viewer.html
```

### Option 4: Local Documentation Quick Download (wget)

You can quickly fetch the latest single-file build and use it as a local documentation viewer:

```bash
wget https://raw.githubusercontent.com/uyu423/simple-local-markdown-viewer/refs/heads/main/docs/index.html
open index.html
```

Each time you open it, you can pick a different folder—or it will remember your last folder automatically.

## Keyboard Shortcuts

| Shortcut       | Action                    |
| -------------- | ------------------------- |
| `Cmd+K` or `/` | Focus search              |
| `Cmd+B`        | Toggle sidebar visibility |
| `j` or `↓`     | Next file                 |
| `k` or `↑`     | Previous file             |
| `Esc`          | Clear search              |

(On Windows/Linux, use `Ctrl` instead of `Cmd`)

## Development

### Prerequisites

- Node.js 16+
- npm

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Starts Vite dev server at `http://localhost:5173`. Hot module reload enabled for rapid iteration.

### Build

```bash
npm run build
```

Produces a single `docs/index.html` file (~1MB) with all CSS and JavaScript inlined.

### Preview Built File

```bash
npm run preview
```

Test the production build locally.

## Browser Compatibility

| Browser         | Support | Method                                                |
| --------------- | ------- | ----------------------------------------------------- |
| Chrome, Edge    | Full    | `showDirectoryPicker()` API (native folder selection) |
| Firefox, Safari | Full    | `webkitdirectory` fallback (file input)               |

Both methods work without a server. The native API is preferred when available but gracefully falls back for broader compatibility.

## Tech Stack

- **[Vite](https://vitejs.dev/)** — Build tool
- **[vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)** — Bundles everything into a single HTML file
- **[marked](https://marked.js.org/)** — Markdown parser with GitHub Flavored Markdown support
- **[highlight.js](https://highlightjs.org/)** — Syntax highlighting for code blocks
- **[idb-keyval](https://github.com/jakearchibald/idb-keyval)** — Persistent folder memory via IndexedDB
- **Vanilla JavaScript** — No framework dependencies

## Storage

The app uses IndexedDB to remember:

- Last opened folder handle (with permission tracking)
- Theme preference
- Search state (session-only)

All data stays on your local machine.

## Performance

- **First load**: ~1-3 seconds (folder scan depends on file count)
- **Search**: Instant for most queries (full-text, single-pass filter)
- **File rendering**: ~100ms for typical markdown files
- **Sidebar**: Smooth scrolling and keyboard navigation

Large folders (1000+ files) are fully supported.

## Limitations

- **Read-only**: No file editing. Use your editor for changes, then refresh.
- **File picker**: Limited to one folder at a time (use symlinks for multiple entry points).
- **Browser security**: Cannot access parent directories or system paths outside the picked folder.

## License

MIT

## Contributing

Pull requests welcome. Please test against the current build before submitting.
