import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import highlightDarkCss from 'highlight.js/styles/github-dark.min.css?inline';
import highlightLightCss from 'highlight.js/styles/github.min.css?inline';
import {
  supportsDirectoryPicker,
  getSavedDirectory,
  reconnectDirectory,
  pickDirectoryNative,
  scanDirectoryHandle,
  scanInputFiles,
} from './directory.js';
import { setupContentLinkHandling } from './content-links.js';

// === SVG Icon constants ===
const ICONS = {
  folder: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 4.5h4.5l1.5 1.5h7v7.5h-13z"/></svg>`,
  clock: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.5 1.5"/></svg>`,
  collapseAll: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l5-3.5 5 3.5"/><path d="M3 6.5l5-3.5 5 3.5"/></svg>`,
  expandAll: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5l5 3.5 5-3.5"/><path d="M3 9l5 3.5 5-3.5"/></svg>`,
  eye: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/></svg>`,
  eyeOff: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="2" y1="2" x2="14" y2="14"/><path d="M4 4.4C2.7 5.4 1.5 7 1 8c1 2 3.5 4.5 7 4.5 1.5 0 2.8-.4 3.9-1M7.5 3.5c.2 0 .3 0 .5 0 3.5 0 6 3.5 7 5-.4.7-1 1.5-1.7 2.1"/><path d="M6.5 6.6A2 2 0 0 0 9.4 9.4"/></svg>`,
  refresh: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5A5.5 5.5 0 1 0 13.5 8"/><path d="M13.5 1.5v3.5H10"/></svg>`,
  autoRefreshOn: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8a6 6 0 0 1 10.2-4.2"/><path d="M12.2 1.8v3.6H8.6"/><path d="M14 8a6 6 0 0 1-10.2 4.2"/><path d="M3.8 14.2v-3.6h3.6"/></svg>`,
  autoRefreshOff: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8a6 6 0 0 1 10.2-4.2"/><path d="M12.2 1.8v3.6H8.6"/><path d="M14 8a6 6 0 0 1-10.2 4.2"/><path d="M3.8 14.2v-3.6h3.6"/><line x1="2" y1="2" x2="14" y2="14"/></svg>`,
  copy: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4.5" width="8.5" height="10" rx="1.5"/><path d="M3.5 11.5H3A1.5 1.5 0 0 1 1.5 10V2.5A1.5 1.5 0 0 1 3 1h6.5A1.5 1.5 0 0 1 11 2.5V3"/></svg>`,
  folderOpen: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 4.5h4.5l1.5 1.5h7v2"/><path d="M1.5 8l1.5 5.5h10l1.5-5.5z"/></svg>`,
  moon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 10A6 6 0 0 1 6 2.5a5.5 5.5 0 1 0 7.5 7.5z"/></svg>`,
  sun: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1"/></svg>`,
  monitor: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="2" width="14" height="9.5" rx="1.5"/><path d="M5.5 14.5h5M8 11.5v3"/></svg>`,
};

// Configure marked with highlight.js
const marked = new Marked({
  breaks: true,
  gfm: true,
});

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  emptyLangClass: 'hljs',
  highlight(code, lang) {
    if (lang === 'mermaid') {
      return esc(code);
    }

    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }

      return esc(code);
    } catch {
      return esc(code);
    }
  },
}));

// DOM refs
const landing = document.getElementById('landing');
const editor = document.getElementById('editor');
const rootNameEl = document.getElementById('rootName');
const treeEl = document.getElementById('tree');
const breadcrumbEl = document.getElementById('breadcrumb');
const contentEl = document.getElementById('content');
const copyRawBtn = document.getElementById('copyRawBtn');

const pickBtn = document.getElementById('pickBtn');
const reconnectBtn = document.getElementById('reconnectBtn');
const reconnectName = document.getElementById('reconnectName');
const folderFallback = document.getElementById('folderFallback');
const folderChange = document.getElementById('folderChange');

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const loadingEl = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');

const viewModeBtn = document.getElementById('viewModeBtn');
const foldAllBtn = document.getElementById('foldAllBtn');
const unfoldAllBtn = document.getElementById('unfoldAllBtn');
const hiddenToggleBtn = document.getElementById('hiddenToggleBtn');
const refreshBtn = document.getElementById('refreshBtn');
const changeFolderBtn = document.getElementById('changeFolderBtn');
const autoRefreshToggleBtn = document.getElementById('autoRefreshToggleBtn');
const folderChangeFallbackLabel = document.getElementById('folderChangeFallbackLabel');
const highlightThemeStyleEl = document.createElement('style');
highlightThemeStyleEl.id = 'hljs-theme';
document.head.appendChild(highlightThemeStyleEl);

// State
let pendingHandle = null;
let allFiles = [];
let viewMode = 'tree'; // 'tree' | 'recent'
let currentHandle = null;
let currentFilePath = '';
let currentFileRawText = '';
let currentContentHasMermaid = false;
let autoRefreshTimer = null;
let isAutoRefreshing = false;
let showHiddenFiles = localStorage.getItem('md-viewer-show-hidden') === 'true';
let autoRefreshEnabled = localStorage.getItem('md-viewer-auto-refresh') !== 'false';
let copyFeedbackTimer = null;
let searchRequestId = 0;
let firstLinePreloadToken = 0;
let contentRenderToken = 0;
let cachedTextSize = 0;
let appliedMermaidTheme = '';
const cachedTextLru = new Map();
let readHistory;
try {
  readHistory = JSON.parse(localStorage.getItem('md-viewer-read-history') || '{}');
} catch {
  readHistory = {};
}

const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;
const FILE_QUERY_PARAM = 'file';
const FIRST_LINE_PREVIEW_BYTES = 4096;
const FIRST_LINE_PRELOAD_BATCH = 24;
const SEARCH_CONTENT_BATCH = 20;
const MAX_CACHED_TEXT_CHARS = 5 * 1024 * 1024;

const { configureRenderedLinks } = setupContentLinkHandling({
  contentEl,
  getAllFiles: () => allFiles,
  getCurrentFilePath: () => currentFilePath,
  openLocalFileByPath: async (targetPath) => openFileByPath(targetPath),
});

function getFilePathFromUrl() {
  const filePath = new URLSearchParams(window.location.search).get(FILE_QUERY_PARAM);
  return filePath ? filePath.trim() : '';
}

function syncUrlWithFilePath(path, options = {}) {
  const { replace = false } = options;
  const filePath = path || '';

  const url = new URL(window.location.href);
  if (filePath) {
    url.searchParams.set(FILE_QUERY_PARAM, filePath);
  } else {
    url.searchParams.delete(FILE_QUERY_PARAM);
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const state = { ...(history.state || {}), filePath };

  if (replace || nextUrl === currentUrl) {
    history.replaceState(state, '', nextUrl);
    return;
  }

  history.pushState(state, '', nextUrl);
}

function initializeHistoryState() {
  const filePath = getFilePathFromUrl();
  const currentStatePath = typeof history.state?.filePath === 'string' ? history.state.filePath : '';
  if (currentStatePath === filePath) return;
  history.replaceState({ ...(history.state || {}), filePath }, '', window.location.href);
}

async function openFileByPath(path, options = {}) {
  const targetFile = allFiles.find((f) => f.path === path);
  if (!targetFile) return false;

  const activeListRoot = searchResults.classList.contains('hidden') ? treeEl : searchResults;
  const item = findFileItemByPath(path, activeListRoot) || findFileItemByPath(path, treeEl);
  await openFile(targetFile, item, options);
  return true;
}

// === Init: check for saved directory ===
async function init() {
  initializeHistoryState();

  const saved = await getSavedDirectory();

  if (saved && !saved.needsPermission) {
    // Permission still granted — load immediately
    await loadFromHandle(saved.handle);
    return;
  }

  if (saved && saved.needsPermission) {
    // Show reconnect button
    pendingHandle = saved.handle;
    reconnectName.textContent = saved.handle.name;
    reconnectBtn.classList.remove('hidden');
  }

  // Show appropriate pick button
  if (supportsDirectoryPicker) {
    pickBtn.classList.remove('hidden');
  } else {
    folderFallback.classList.remove('hidden');
  }
}

// === Pick button (showDirectoryPicker) ===
pickBtn.addEventListener('click', async () => {
  try {
    const handle = await pickDirectoryNative();
    await loadFromHandle(handle);
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  }
});

// === Reconnect button ===
reconnectBtn.addEventListener('click', async () => {
  if (!pendingHandle) return;
  const ok = await reconnectDirectory(pendingHandle);
  if (ok) {
    await loadFromHandle(pendingHandle);
    pendingHandle = null;
  }
});

// === Fallback: <input webkitdirectory> ===
folderFallback.addEventListener('change', (e) => {
  if (!e.target.files.length) return;
  currentHandle = null;
  stopAutoRefresh();
  const rootName = e.target.files[0].webkitRelativePath.split('/')[0];
  const mdFiles = scanInputFiles(e.target.files);
  showEditor(rootName, mdFiles);
});

// === Change folder (sidebar) ===
folderChange.addEventListener('change', (e) => {
  if (supportsDirectoryPicker) return; // handled by click
  if (!e.target.files.length) return;
  currentHandle = null;
  stopAutoRefresh();
  const rootName = e.target.files[0].webkitRelativePath.split('/')[0];
  const mdFiles = scanInputFiles(e.target.files);
  showEditor(rootName, mdFiles);
});

changeFolderBtn?.addEventListener('click', async () => {
  if (!supportsDirectoryPicker) return;
  try {
    const handle = await pickDirectoryNative();
    await loadFromHandle(handle);
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  }
});

refreshBtn?.addEventListener('click', async () => {
  if (supportsDirectoryPicker) {
    if (!currentHandle) return;
    try {
      await loadFromHandle(currentHandle, { preserveUiState: true });
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
    return;
  }

  folderChange?.click();
});

// === Loading ===
function showLoading(text = '문서를 불러오는 중...') {
  loadingText.textContent = text;
  loadingEl.classList.remove('hidden');
}

function hideLoading() {
  loadingEl.classList.add('hidden');
}

// === Load from FileSystemDirectoryHandle ===
async function loadFromHandle(handle, options = {}) {
  const { preserveUiState = false, silent = false } = options;
  currentHandle = handle;
  if (!silent) {
    showLoading('폴더를 스캔하는 중...');
  }
  const mdFiles = await scanDirectoryHandle(handle);
  if (!silent) {
    loadingText.textContent = `${mdFiles.length}개 문서를 불러오는 중...`;
  }
  await showEditor(handle.name, mdFiles, { preserveUiState });
  startAutoRefresh();
}

// === Show editor with files ===
async function showEditor(rootName, mdFiles, options = {}) {
  const { preserveUiState = false, refreshSearchResults = true } = options;
  const previousFiles = preserveUiState ? allFiles : [];
  const previousFilePath = preserveUiState ? currentFilePath : '';
  const previousSearchQuery = preserveUiState ? searchInput.value.trim() : '';
  const previousContentScrollTop = preserveUiState ? contentEl.scrollTop : 0;
  const previousTreeState = preserveUiState ? captureTreeState() : null;
  const previousSearchScrollTop = preserveUiState ? searchResults.scrollTop : 0;
  const previousFile = preserveUiState && previousFilePath
    ? previousFiles.find((file) => file.path === previousFilePath) || null
    : null;
  const requestedFilePathFromUrl = preserveUiState ? '' : getFilePathFromUrl();

  landing.style.display = 'none';
  editor.classList.remove('hidden');
  rootNameEl.textContent = rootName;

  releaseFileResources(allFiles);
  allFiles = mdFiles;
  resetFileTextCache();
  searchRequestId += 1;
  scheduleFirstLinePreload(allFiles);

  if (viewMode === 'recent') {
    renderRecentList(allFiles);
    foldAllBtn.classList.add('hidden');
    unfoldAllBtn.classList.add('hidden');
  } else {
    const tree = buildTree(allFiles);
    renderTree(tree);
    foldAllBtn.classList.remove('hidden');
    unfoldAllBtn.classList.remove('hidden');
  }

  if (preserveUiState) {
    if (previousSearchQuery) {
      searchInput.value = previousSearchQuery;
      if (refreshSearchResults) {
        void runSearch(previousSearchQuery).then(() => {
          searchResults.scrollTop = previousSearchScrollTop;
        });
      } else {
        treeEl.style.display = 'none';
        searchResults.classList.remove('hidden');
        searchResults.scrollTop = previousSearchScrollTop;
      }
    } else {
      searchInput.value = '';
      searchResults.classList.add('hidden');
      treeEl.style.display = '';
    }

    restoreTreeState(previousTreeState);

    if (previousFilePath) {
      const fileToRestore = allFiles.find((f) => f.path === previousFilePath);
      if (fileToRestore) {
        if (canReuseRenderedFile(previousFile, fileToRestore)) {
          currentFilePath = fileToRestore.path;
          breadcrumbEl.textContent = fileToRestore.path.split('/').join(' \u203A ');
          contentEl.scrollTop = previousContentScrollTop;
          updateCopyRawButtonState();
        } else {
          await openFileByPath(previousFilePath, { scrollTop: previousContentScrollTop, scrollIntoView: false, trackRead: false, updateHistory: false });
        }
      } else {
        currentFilePath = '';
        currentFileRawText = '';
        currentContentHasMermaid = false;
        contentEl.innerHTML = '<div class="empty-state">왼쪽에서 .md 파일을 선택하세요</div>';
        breadcrumbEl.textContent = '';
        updateCopyRawButtonState();
        syncUrlWithFilePath('', { replace: true });
      }
    }
  } else {
    if (requestedFilePathFromUrl) {
      const opened = await openFileByPath(requestedFilePathFromUrl, { scrollIntoView: false, trackRead: false, historyMode: 'replace' });
      if (opened) {
        hideLoading();
        return;
      }
    }

    currentFilePath = '';
    currentFileRawText = '';
    currentContentHasMermaid = false;
    contentEl.innerHTML = '<div class="empty-state">왼쪽에서 .md 파일을 선택하세요</div>';
    breadcrumbEl.textContent = '';
    searchInput.value = '';
    searchResults.classList.add('hidden');
    treeEl.style.display = '';
    updateCopyRawButtonState();
    syncUrlWithFilePath('', { replace: true });
  }

  hideLoading();
}

// === Preload first meaningful line from each file ===
function scheduleFirstLinePreload(files) {
  const token = ++firstLinePreloadToken;
  void preloadFirstLines(files, token);
}

async function preloadFirstLines(files, token) {
  for (let i = 0; i < files.length; i += FIRST_LINE_PRELOAD_BATCH) {
    if (token !== firstLinePreloadToken) return;

    const batch = files.slice(i, i + FIRST_LINE_PRELOAD_BATCH);
    await Promise.all(
      batch.map(async (f) => {
        if (f._firstLineLoaded) return;

        try {
          const previewText = await readFilePreview(f);
          f._firstLine = extractFirstLine(previewText);
        } catch {
          f._firstLine = '';
        }

        f._firstLineLoaded = true;
      }),
    );

    if (token !== firstLinePreloadToken) return;

    updateVisibleFirstLines(batch);
    await yieldToBrowser();
  }
}

function extractFirstLine(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^#{1,4}\s+(.+)/);
    if (match) {
      const heading = match[1].trim();
      return heading.length > 50 ? heading.slice(0, 50) + '…' : heading;
    }
  }

  for (const line of lines) {
    const preview = line.trim().replace(/^>\s*/, '').replace(/^[-*+]\s+/, '').trim();
    if (!preview || preview.startsWith('```')) continue;
    return preview.length > 50 ? preview.slice(0, 50) + '…' : preview;
  }

  return '';
}

async function readFileText(file, options = {}) {
  const { useCache = true } = options;

  if (useCache && typeof file._cachedText === 'string') {
    touchCachedText(file.path, file._cachedText.length);
    return file._cachedText;
  }

  const text = await file.read();
  if (useCache) {
    setCachedText(file, text);
  }
  return text;
}

async function readFilePreview(file) {
  if (file.readHead) {
    return file.readHead(FIRST_LINE_PREVIEW_BYTES);
  }

  return readFileText(file, { useCache: false });
}

function releaseFileResources(files) {
  for (const file of files) {
    delete file._cachedText;
    delete file._firstLine;
    delete file._firstLineLoaded;
  }
}

function updateVisibleFirstLines(files) {
  const items = treeEl.querySelectorAll('.tree-item.tree-file');

  for (const item of items) {
    const file = files.find((candidate) => candidate.path === item.dataset.filePath);
    if (!file || !file._firstLine) continue;
    updateFirstLineElement(item, file._firstLine);
  }
}

function updateFirstLineElement(item, text) {
  const existing = item.querySelector('.first-line');
  if (existing) {
    existing.textContent = text;
    return;
  }

  const firstLineEl = document.createElement('span');
  firstLineEl.className = 'first-line';
  firstLineEl.textContent = text;

  if (item.classList.contains('recent-item')) {
    const recentName = item.querySelector('.recent-name');
    recentName?.appendChild(firstLineEl);
    return;
  }

  const nameEl = item.querySelector('.name');
  nameEl?.insertAdjacentElement('afterend', firstLineEl);
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function resetFileTextCache() {
  cachedTextSize = 0;
  cachedTextLru.clear();
}

function setCachedText(file, text) {
  const prevSize = cachedTextLru.get(file.path) || 0;
  if (prevSize) {
    cachedTextSize -= prevSize;
  }

  cachedTextLru.delete(file.path);

  if (text.length > MAX_CACHED_TEXT_CHARS) {
    delete file._cachedText;
    return;
  }

  file._cachedText = text;
  touchCachedText(file.path, text.length);
  cachedTextSize += text.length;
  trimCachedTextCache(file.path);
}

function touchCachedText(path, size) {
  cachedTextLru.delete(path);
  cachedTextLru.set(path, size);
}

function trimCachedTextCache(protectedPath) {
  while (cachedTextSize > MAX_CACHED_TEXT_CHARS && cachedTextLru.size > 1) {
    const oldestEntry = cachedTextLru.entries().next().value;
    if (!oldestEntry) return;

    const [path, size] = oldestEntry;
    if (path === protectedPath || path === currentFilePath) {
      cachedTextLru.delete(path);
      cachedTextLru.set(path, size);
      continue;
    }

    cachedTextLru.delete(path);
    cachedTextSize -= size;

    const file = allFiles.find((candidate) => candidate.path === path);
    if (file) {
      delete file._cachedText;
    }
  }
}

// === Build tree structure from flat file list ===
function buildTree(files) {
  const root = { children: new Map(), files: [], hidden: false };

  for (const f of files) {
    const parts = f.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current.children.has(parts[i])) {
        current.children.set(parts[i], {
          children: new Map(),
          files: [],
          hidden: current.hidden || parts[i].startsWith('.'),
        });
      }
      current = current.children.get(parts[i]);
    }

    current.files.push(f);
  }

  return root;
}

// === Render tree ===
function renderTree(root) {
  treeEl.innerHTML = '';
  treeEl.appendChild(renderNode(root, 0, ''));
  restoreActiveFileSelection(treeEl);
}

function renderNode(node, depth, parentPath) {
  const fragment = document.createDocumentFragment();
  const dirs = [...node.children.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path));

  for (const [name, child] of dirs) {
    if (!showHiddenFiles && child.hidden) continue;

    const wrapper = document.createElement('div');

    const item = document.createElement('div');
    item.className = 'tree-item tree-dir';
    const dirPath = parentPath ? `${parentPath}/${name}` : name;
    item.dataset.dirPath = dirPath;
    if (child.hidden) item.classList.add('dir-hidden');
    item.style.paddingLeft = `${8 + depth * 16}px`;
    item.innerHTML = `<span class="icon">&#9654;</span><span class="name">${esc(name)}</span>`;
    item.setAttribute('aria-expanded', 'false');

    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';

    item.addEventListener('click', () => {
      const isOpen = childContainer.classList.toggle('open');
      item.querySelector('.icon').innerHTML = isOpen ? '&#9660;' : '&#9654;';
      item.setAttribute('aria-expanded', String(isOpen));
    });

    wrapper.appendChild(item);
    childContainer.appendChild(renderNode(child, depth + 1, dirPath));
    wrapper.appendChild(childContainer);
    fragment.appendChild(wrapper);
  }

  for (const f of files) {
    if (!showHiddenFiles && f.hidden) continue;

    const fileName = f.path.split('/').pop();
    const item = document.createElement('div');
    item.className = 'tree-item tree-file';
    if (f.hidden) item.classList.add('file-hidden');
    item.dataset.filePath = f.path;
    item.style.paddingLeft = `${8 + depth * 16}px`;

    const firstLine = f._firstLine ? `<span class="first-line">${esc(f._firstLine)}</span>` : '';
    item.innerHTML = `<span class="icon">&#9776;</span><span class="name">${esc(fileName)}</span>${firstLine}`;

    item.addEventListener('click', () => openFile(f, item));
    fragment.appendChild(item);
  }

  return fragment;
}

// === Open file ===
async function openFile(f, itemEl, options = {}) {
  const { scrollTop = 0, scrollIntoView = true, trackRead = true, updateHistory = true, historyMode = 'push' } = options;

  document.querySelectorAll('.tree-item.active').forEach((el) => el.classList.remove('active'));
  if (itemEl) {
    itemEl.classList.add('active');
    if (scrollIntoView) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  breadcrumbEl.textContent = f.path.split('/').join(' \u203A ');

  const text = await readFileText(f);
  currentFilePath = f.path;
  currentFileRawText = text;
  await renderMarkdownContent(text);
  contentEl.scrollTop = scrollTop;
  updateCopyRawButtonState();

  if (updateHistory) {
    syncUrlWithFilePath(f.path, { replace: historyMode === 'replace' });
  }

  if (trackRead) {
    // 읽음 기록 저장
    readHistory[f.path] = Date.now();
    try { localStorage.setItem('md-viewer-read-history', JSON.stringify(readHistory)); } catch {}

    // recent 뷰에서 즉시 읽음 상태 반영
    if (viewMode === 'recent' && itemEl) {
      itemEl.classList.add('file-read');
    }
  }
}

async function renderMarkdownContent(text) {
  const renderToken = ++contentRenderToken;
  contentEl.innerHTML = marked.parse(text);
  prepareMermaidBlocks();
  currentContentHasMermaid = contentEl.querySelector('.mermaid') !== null;
  enhanceCodeBlocks();
  await renderMermaidDiagrams(renderToken);
  if (renderToken !== contentRenderToken) return;
  configureRenderedLinks();
}

function prepareMermaidBlocks() {
  const mermaidCodeBlocks = contentEl.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid');

  for (const codeEl of mermaidCodeBlocks) {
    const preEl = codeEl.closest('pre');
    if (!preEl) continue;

    const mermaidBlock = document.createElement('div');
    mermaidBlock.className = 'mermaid';
    mermaidBlock.textContent = codeEl.textContent || '';
    preEl.replaceWith(mermaidBlock);
  }
}

function enhanceCodeBlocks() {
  const codeBlocks = contentEl.querySelectorAll('pre > code');

  for (const codeEl of codeBlocks) {
    const preEl = codeEl.closest('pre');
    if (!preEl || preEl.parentElement?.classList.contains('code-block-frame')) continue;

    const frameEl = document.createElement('div');
    frameEl.className = 'code-block-frame';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'action-btn code-copy-btn';
    copyBtn.innerHTML = ICONS.copy;
    copyBtn.setAttribute('aria-label', '코드 복사');
    copyBtn.setAttribute('data-tooltip', '코드 복사');

    copyBtn.addEventListener('click', async () => {
      const copied = await copyTextToClipboard(codeEl.textContent || '');
      showCodeBlockCopyFeedback(copyBtn, copied);
    });

    preEl.replaceWith(frameEl);
    frameEl.appendChild(copyBtn);
    frameEl.appendChild(preEl);
  }
}

async function renderMermaidDiagrams(renderToken) {
  const mermaidBlocks = [...contentEl.querySelectorAll('.mermaid')];
  if (!mermaidBlocks.length) return;

  ensureMermaidInitialized();

  try {
    await mermaid.run({
      nodes: mermaidBlocks,
      suppressErrors: true,
    });
    if (renderToken !== contentRenderToken) return;
  } catch (error) {
    console.error('Mermaid 렌더링에 실패했습니다:', error);
  }
}

function getMermaidTheme() {
  return getResolvedTheme() === 'light' ? 'default' : 'dark';
}

function ensureMermaidInitialized() {
  const nextTheme = getMermaidTheme();
  if (appliedMermaidTheme === nextTheme) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: nextTheme,
  });
  appliedMermaidTheme = nextTheme;
}

function getResolvedTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyHighlightTheme() {
  highlightThemeStyleEl.textContent = getResolvedTheme() === 'light'
    ? highlightLightCss
    : highlightDarkCss;
}

async function rerenderCurrentContent() {
  if (!currentFilePath || !currentFileRawText || !currentContentHasMermaid) return;

  const scrollTop = contentEl.scrollTop;
  await renderMarkdownContent(currentFileRawText);
  contentEl.scrollTop = scrollTop;
}

// === Search ===
let searchTimeout = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    void runSearch(searchInput.value.trim());
  }, 150);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    void runSearch('');
  }
});

async function runSearch(query) {
  const currentRequestId = ++searchRequestId;
  const snippetsByPath = new Map();

  if (!query) {
    searchResults.classList.add('hidden');
    treeEl.style.display = '';
    return;
  }

  const lower = query.toLowerCase();
  treeEl.style.display = 'none';
  searchResults.classList.remove('hidden');

  const matches = allFiles.filter((f) => f.path.toLowerCase().includes(lower));
  const seenPaths = new Set(matches.map((f) => f.path));

  const contentCandidates = allFiles.filter((f) => !seenPaths.has(f.path));
  renderSearchResults(matches, lower, {
    isSearchingContent: contentCandidates.length > 0,
    snippetsByPath,
  });

  if (!contentCandidates.length) {
    return;
  }

  for (let i = 0; i < contentCandidates.length; i += SEARCH_CONTENT_BATCH) {
    if (currentRequestId !== searchRequestId) return;

    const batch = contentCandidates.slice(i, i + SEARCH_CONTENT_BATCH);
    const batchMatches = await Promise.all(
      batch.map(async (f) => {
        const text = await readFileText(f, { useCache: false });
        if (!text.toLowerCase().includes(lower)) return null;
        return {
          file: f,
          snippet: getSearchSnippet(text, lower),
        };
      }),
    );

    for (const match of batchMatches) {
      if (!match) continue;
      matches.push(match.file);
      seenPaths.add(match.file.path);
      if (match.snippet) {
        snippetsByPath.set(match.file.path, match.snippet);
      }
    }

    if (currentRequestId !== searchRequestId) return;

    renderSearchResults(matches, lower, {
      isSearchingContent: i + SEARCH_CONTENT_BATCH < contentCandidates.length,
      snippetsByPath,
    });
    await yieldToBrowser();
  }
}

function renderSearchResults(matches, lower, options = {}) {
  const { isSearchingContent = false, snippetsByPath = new Map() } = options;

  searchResults.innerHTML = '';

  if (matches.length === 0 && !isSearchingContent) {
    searchResults.innerHTML = '<div class="search-empty">검색 결과가 없습니다</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const countEl = document.createElement('div');
  countEl.className = 'search-count';
  countEl.textContent = isSearchingContent
    ? `${matches.length}개 결과 · 문서 내용 검색 중...`
    : `${matches.length}개 결과`;
  fragment.appendChild(countEl);

  if (matches.length === 0) {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'search-empty';
    loadingEl.textContent = '문서 내용을 검색 중...';
    fragment.appendChild(loadingEl);
    searchResults.appendChild(fragment);
    return;
  }

  for (const f of matches) {
    const item = document.createElement('div');
    item.className = 'tree-item tree-file search-result-item';
    item.dataset.filePath = f.path;
    item.tabIndex = 0;

    const fileName = f.path.split('/').pop();
    const dirPath = f.path.split('/').slice(0, -1).join('/');
    const snippet = snippetsByPath.get(f.path) || getSearchSnippet(f._cachedText, lower);

    item.innerHTML = `
      <span class="icon">&#9776;</span>
      <div class="search-result-content">
        <div class="search-result-name">${highlightMatch(fileName, lower)}</div>
        <div class="search-result-path">${esc(dirPath)}</div>
        ${snippet ? `<div class="search-result-snippet">${snippet}</div>` : ''}
      </div>
    `;

    item.addEventListener('click', () => openFile(f, item));
    fragment.appendChild(item);
  }

  searchResults.appendChild(fragment);
}

function getSearchSnippet(text, query) {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return '';
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 50);
  let snippet = (start > 0 ? '…' : '') + text.slice(start, end).replace(/\n/g, ' ') + (end < text.length ? '…' : '');
  return highlightMatch(snippet, query);
}

function highlightMatch(text, query) {
  if (!query) return esc(text);
  const escaped = esc(text);
  const regex = new RegExp(`(${escRegex(query)})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function escRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// === View mode toggle ===
function setViewMode(mode) {
  viewMode = mode;
  if (mode === 'tree') {
    viewModeBtn.innerHTML = ICONS.clock;
    viewModeBtn.setAttribute('aria-label', '최근 업데이트 순');
    viewModeBtn.setAttribute('data-tooltip', '최근 업데이트 순');
    foldAllBtn.classList.remove('hidden');
    unfoldAllBtn.classList.remove('hidden');
    const tree = buildTree(allFiles);
    renderTree(tree);
  } else {
    viewModeBtn.innerHTML = ICONS.folder;
    viewModeBtn.setAttribute('aria-label', '디렉토리 구조');
    viewModeBtn.setAttribute('data-tooltip', '디렉토리 구조');
    foldAllBtn.classList.add('hidden');
    unfoldAllBtn.classList.add('hidden');
    renderRecentList(allFiles);
  }
}

viewModeBtn.addEventListener('click', () => {
  setViewMode(viewMode === 'tree' ? 'recent' : 'tree');
});

// === Render recent updates list ===
function renderRecentList(files) {
  treeEl.innerHTML = '';
  const visible = showHiddenFiles ? files : files.filter((f) => !f.hidden);
  const sorted = [...visible].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  const fragment = document.createDocumentFragment();

  for (const f of sorted) {
    const item = document.createElement('div');
    item.className = 'tree-item tree-file recent-item';
    if (f.hidden) item.classList.add('file-hidden');
    item.dataset.filePath = f.path;

    // 읽음 상태: lastModified가 마지막 읽은 시간 이전이면 읽은 것으로 판단
    const lastRead = readHistory[f.path] || 0;
    const isRead = lastRead >= f.lastModified;
    if (isRead) item.classList.add('file-read');

    const fileName = f.path.split('/').pop();
    const dirPath = f.path.split('/').slice(0, -1).join('/');
    const timeStr = f.lastModified ? formatRelativeTime(f.lastModified) : '';

    item.innerHTML = `
      <span class="icon">&#9776;</span>
      <div class="recent-content">
        <div class="recent-name"><span class="name-text">${esc(fileName)}</span>${f._firstLine ? `<span class="first-line">${esc(f._firstLine)}</span>` : ''}</div>
        <div class="recent-meta">
          <span class="recent-path">${esc(dirPath)}</span>
          ${timeStr ? `<span class="recent-time">${timeStr}</span>` : ''}
        </div>
      </div>
    `;

    item.addEventListener('click', () => openFile(f, item));
    fragment.appendChild(item);
  }

  treeEl.appendChild(fragment);
  restoreActiveFileSelection(treeEl);
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}개월 전`;
  return `${Math.floor(mon / 12)}년 전`;
}

// === Fold / Unfold all ===
foldAllBtn.addEventListener('click', () => {
  treeEl.querySelectorAll('.tree-children').forEach((el) => el.classList.remove('open'));
  treeEl.querySelectorAll('.tree-dir > .icon').forEach((el) => (el.innerHTML = '&#9654;'));
  treeEl.querySelectorAll('.tree-item.tree-dir').forEach((el) => el.setAttribute('aria-expanded', 'false'));
});

unfoldAllBtn.addEventListener('click', () => {
  treeEl.querySelectorAll('.tree-children').forEach((el) => el.classList.add('open'));
  treeEl.querySelectorAll('.tree-dir > .icon').forEach((el) => (el.innerHTML = '&#9660;'));
  treeEl.querySelectorAll('.tree-item.tree-dir').forEach((el) => el.setAttribute('aria-expanded', 'true'));
});

// === Theme toggle ===
const THEMES = ['dark', 'light', 'system'];
const THEME_SVG = { dark: 'moon', light: 'sun', system: 'monitor' };
const THEME_LABELS = { dark: '다크 모드', light: '라이트 모드', system: '시스템 설정' };
let themeIndex = parseInt(localStorage.getItem('md-viewer-theme-idx') || '0', 10);

function applyTheme() {
  const theme = THEMES[themeIndex];
  localStorage.setItem('md-viewer-theme-idx', themeIndex);
  const themeToggleEl = document.getElementById('themeToggle');
  themeToggleEl.innerHTML = ICONS[THEME_SVG[theme]];
  themeToggleEl.setAttribute('data-tooltip', THEME_LABELS[theme]);
  themeToggleEl.setAttribute('aria-label', THEME_LABELS[theme]);

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  applyHighlightTheme();
}

document.getElementById('themeToggle').addEventListener('click', () => {
  themeIndex = (themeIndex + 1) % THEMES.length;
  applyTheme();
  void rerenderCurrentContent();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (THEMES[themeIndex] === 'system') {
    applyTheme();
    void rerenderCurrentContent();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoRefresh();
    return;
  }

  if (autoRefreshEnabled) {
    startAutoRefresh();
  }
});

applyTheme();

// === Resizer ===
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  resizer.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  sidebar.style.width = `${Math.min(Math.max(e.clientX, 180), 500)}px`;
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// === Utils ===
function findFileItemByPath(path, rootEl = treeEl) {
  const items = rootEl.querySelectorAll('.tree-item.tree-file');
  for (const item of items) {
    if (item.dataset.filePath === path) {
      return item;
    }
  }
  return null;
}

function restoreActiveFileSelection(rootEl = treeEl) {
  if (!currentFilePath) return;

  const activeItem = findFileItemByPath(currentFilePath, rootEl);
  activeItem?.classList.add('active');
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (!supportsDirectoryPicker || !currentHandle || !autoRefreshEnabled || document.hidden) return;

  autoRefreshTimer = window.setInterval(() => {
    if (document.hidden) return;
    refreshInBackground();
  }, AUTO_REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (!autoRefreshTimer) return;
  window.clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}

async function refreshInBackground() {
  if (!supportsDirectoryPicker || !currentHandle || isAutoRefreshing || document.hidden) return;
  if (searchInput.value.trim()) return;

  isAutoRefreshing = true;
  try {
    const scannedFiles = await scanDirectoryHandle(currentHandle, '', { includeReaders: false });
    if (!hasFileListChanged(allFiles, scannedFiles)) {
      return;
    }

    const mdFiles = await scanDirectoryHandle(currentHandle);

    await showEditor(currentHandle.name, mdFiles, { preserveUiState: true, refreshSearchResults: false });
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  } finally {
    isAutoRefreshing = false;
  }
}

function canReuseRenderedFile(previousFile, nextFile) {
  if (!previousFile || !nextFile) return false;
  if (!currentFileRawText) return false;

  return previousFile.path === nextFile.path
    && (previousFile.lastModified || 0) === (nextFile.lastModified || 0);
}

function hasFileListChanged(prevFiles, nextFiles) {
  if (prevFiles.length !== nextFiles.length) return true;

  const prevMap = new Map(prevFiles.map((file) => [file.path, file]));
  for (const file of nextFiles) {
    const prev = prevMap.get(file.path);
    if (!prev) return true;
    if ((prev.lastModified || 0) !== (file.lastModified || 0)) return true;
    if ((prev.hidden || false) !== (file.hidden || false)) return true;
  }

  return false;
}

function captureTreeState() {
  const expandedDirPaths = [];
  treeEl.querySelectorAll('.tree-item.tree-dir').forEach((dirItem) => {
    const container = dirItem.nextElementSibling;
    if (!container?.classList.contains('tree-children')) return;
    if (!container.classList.contains('open')) return;
    if (!dirItem.dataset.dirPath) return;
    expandedDirPaths.push(dirItem.dataset.dirPath);
  });

  return {
    expandedDirPaths,
    treeScrollTop: treeEl.scrollTop,
  };
}

function restoreTreeState(state) {
  if (!state || viewMode !== 'tree') return;

  treeEl.querySelectorAll('.tree-item.tree-dir').forEach((dirItem) => {
    const container = dirItem.nextElementSibling;
    if (!container?.classList.contains('tree-children')) return;

    const isOpen = state.expandedDirPaths.includes(dirItem.dataset.dirPath || '');
    container.classList.toggle('open', isOpen);
    const icon = dirItem.querySelector('.icon');
    if (icon) icon.innerHTML = isOpen ? '&#9660;' : '&#9654;';
    dirItem.setAttribute('aria-expanded', String(isOpen));
  });

  treeEl.scrollTop = state.treeScrollTop || 0;
}

function applyAutoRefreshToggleState() {
  if (!autoRefreshToggleBtn) return;

  autoRefreshToggleBtn.innerHTML = autoRefreshEnabled ? ICONS.autoRefreshOn : ICONS.autoRefreshOff;
  autoRefreshToggleBtn.classList.toggle('btn-active', autoRefreshEnabled);
  autoRefreshToggleBtn.setAttribute('aria-label', autoRefreshEnabled ? '자동 갱신 끄기' : '자동 갱신 켜기');
  autoRefreshToggleBtn.setAttribute('data-tooltip', autoRefreshEnabled ? '자동 갱신 끄기' : '자동 갱신 켜기');
}

function setAutoRefreshEnabled(next) {
  autoRefreshEnabled = next;
  localStorage.setItem('md-viewer-auto-refresh', String(autoRefreshEnabled));
  applyAutoRefreshToggleState();
  if (autoRefreshEnabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function updateCopyRawButtonState() {
  if (!copyRawBtn) return;

  const hasFile = currentFilePath !== '';
  copyRawBtn.disabled = !hasFile;
  if (copyFeedbackTimer) return;

  const label = hasFile ? '원본 마크다운 복사' : '복사할 파일 없음';
  copyRawBtn.setAttribute('aria-label', label);
  copyRawBtn.setAttribute('data-tooltip', label);
}

function showCopyFeedback(success) {
  if (!copyRawBtn) return;

  if (copyFeedbackTimer) {
    window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = null;
  }

  const label = success ? '복사됨' : '복사 실패';
  copyRawBtn.setAttribute('aria-label', label);
  copyRawBtn.setAttribute('data-tooltip', label);
  copyRawBtn.classList.toggle('btn-active', success);

  copyFeedbackTimer = window.setTimeout(() => {
    copyFeedbackTimer = null;
    copyRawBtn.classList.remove('btn-active');
    updateCopyRawButtonState();
  }, 1200);
}

function showCodeBlockCopyFeedback(button, success) {
  if (button._copyFeedbackTimer) {
    window.clearTimeout(button._copyFeedbackTimer);
    button._copyFeedbackTimer = null;
  }

  const label = success ? '복사됨' : '복사 실패';
  button.setAttribute('aria-label', label);
  button.setAttribute('data-tooltip', label);
  button.classList.toggle('btn-active', success);

  button._copyFeedbackTimer = window.setTimeout(() => {
    button._copyFeedbackTimer = null;
    button.classList.remove('btn-active');
    button.setAttribute('aria-label', '코드 복사');
    button.setAttribute('data-tooltip', '코드 복사');
  }, 1200);
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  } catch {
    return false;
  }
}

async function copyCurrentRawMarkdown() {
  if (!currentFilePath) return;

  const copied = await copyTextToClipboard(currentFileRawText);
  showCopyFeedback(copied);
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

window.addEventListener('popstate', async () => {
  if (!allFiles.length) return;

  const targetPath = getFilePathFromUrl();
  if (!targetPath || targetPath === currentFilePath) return;

  const opened = await openFileByPath(targetPath, { scrollIntoView: false, trackRead: false, updateHistory: false });
  if (!opened) {
    console.warn('히스토리에서 요청한 파일을 찾을 수 없습니다:', targetPath);
  }
});

// === Keyboard Shortcuts ===
document.addEventListener('keydown', (e) => {
  const mod = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;

  // Cmd+K: 검색 포커스
  if (mod && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }

  // Cmd+B: 사이드바 토글
  if (mod && e.key === 'b') {
    e.preventDefault();
    const isHidden = sidebar.style.display === 'none';
    sidebar.style.display = isHidden ? '' : 'none';
    resizer.style.display = isHidden ? '' : 'none';
    return;
  }

  // 검색/입력 중이면 네비게이션 단축키 무시
  if (document.activeElement === searchInput || document.activeElement?.tagName === 'INPUT') return;

  // / : 검색 포커스
  if (e.key === '/' && !mod) {
    e.preventDefault();
    searchInput.focus();
    return;
  }

  // j/k 또는 Arrow: 파일 목록 탐색
  const container = searchResults.classList.contains('hidden') ? treeEl : searchResults;
  const items = [...container.querySelectorAll('.tree-file')];
  if (!items.length) return;

  const activeItem = container.querySelector('.tree-item.active');
  let idx = activeItem ? items.indexOf(activeItem) : -1;

  if (e.key === 'j' || e.key === 'ArrowDown') {
    e.preventDefault();
    idx = Math.min(idx + 1, items.length - 1);
    items[idx]?.click();
  } else if (e.key === 'k' || e.key === 'ArrowUp') {
    e.preventDefault();
    idx = Math.max(idx - 1, 0);
    items[idx]?.click();
  }
});

// === Init buttons (SVG icons + hidden toggle) ===
function initButtons() {
  foldAllBtn.innerHTML = ICONS.collapseAll;
  unfoldAllBtn.innerHTML = ICONS.expandAll;
  refreshBtn.innerHTML = ICONS.refresh;
  if (changeFolderBtn) changeFolderBtn.innerHTML = ICONS.folderOpen;
  if (folderChangeFallbackLabel) folderChangeFallbackLabel.insertAdjacentHTML('afterbegin', ICONS.folder);

  if (supportsDirectoryPicker) {
    changeFolderBtn?.classList.remove('hidden');
    folderChangeFallbackLabel?.classList.add('hidden');
  } else {
    changeFolderBtn?.classList.add('hidden');
    folderChangeFallbackLabel?.classList.remove('hidden');
  }

  applyAutoRefreshToggleState();
  if (copyRawBtn) copyRawBtn.innerHTML = ICONS.copy;
  updateCopyRawButtonState();

  // viewModeBtn 초기 상태
  viewModeBtn.innerHTML = viewMode === 'tree' ? ICONS.clock : ICONS.folder;

  // hiddenToggleBtn 초기 상태
  hiddenToggleBtn.innerHTML = showHiddenFiles ? ICONS.eye : ICONS.eyeOff;
  hiddenToggleBtn.setAttribute('data-tooltip', showHiddenFiles ? '숨김 파일 숨기기' : '숨김 파일 표시');
  hiddenToggleBtn.setAttribute('aria-label', showHiddenFiles ? '숨김 파일 숨기기' : '숨김 파일 표시');
  if (showHiddenFiles) hiddenToggleBtn.classList.add('btn-active');
}

hiddenToggleBtn.addEventListener('click', () => {
  const previousTreeState = viewMode === 'tree' ? captureTreeState() : null;

  showHiddenFiles = !showHiddenFiles;
  localStorage.setItem('md-viewer-show-hidden', showHiddenFiles);

  hiddenToggleBtn.innerHTML = showHiddenFiles ? ICONS.eye : ICONS.eyeOff;
  hiddenToggleBtn.setAttribute('data-tooltip', showHiddenFiles ? '숨김 파일 숨기기' : '숨김 파일 표시');
  hiddenToggleBtn.setAttribute('aria-label', showHiddenFiles ? '숨김 파일 숨기기' : '숨김 파일 표시');
  hiddenToggleBtn.classList.toggle('btn-active', showHiddenFiles);

  if (viewMode === 'tree') {
    const tree = buildTree(allFiles);
    renderTree(tree);
    restoreTreeState(previousTreeState);
  } else {
    renderRecentList(allFiles);
  }
});

autoRefreshToggleBtn?.addEventListener('click', () => {
  setAutoRefreshEnabled(!autoRefreshEnabled);
});

copyRawBtn?.addEventListener('click', () => {
  copyCurrentRawMarkdown();
});

// === Start ===
initButtons();
init();
