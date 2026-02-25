import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.min.css';
import 'highlight.js/styles/github.min.css';
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
marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

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

// State
let pendingHandle = null;
let allFiles = [];
let viewMode = 'tree'; // 'tree' | 'recent'
let currentHandle = null;
let currentFilePath = '';
let currentFileRawText = '';
let autoRefreshTimer = null;
let isAutoRefreshing = false;
let showHiddenFiles = localStorage.getItem('md-viewer-show-hidden') === 'true';
let autoRefreshEnabled = localStorage.getItem('md-viewer-auto-refresh') !== 'false';
let copyFeedbackTimer = null;
let readHistory;
try {
  readHistory = JSON.parse(localStorage.getItem('md-viewer-read-history') || '{}');
} catch {
  readHistory = {};
}

const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;
const FILE_QUERY_PARAM = 'file';

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
  const { preserveUiState = false } = options;
  const previousFilePath = preserveUiState ? currentFilePath : '';
  const previousSearchQuery = preserveUiState ? searchInput.value.trim() : '';
  const previousContentScrollTop = preserveUiState ? contentEl.scrollTop : 0;
  const previousTreeState = preserveUiState ? captureTreeState() : null;
  const previousSearchScrollTop = preserveUiState ? searchResults.scrollTop : 0;
  const requestedFilePathFromUrl = preserveUiState ? '' : getFilePathFromUrl();

  landing.style.display = 'none';
  editor.classList.remove('hidden');
  rootNameEl.textContent = rootName;

  allFiles = mdFiles;
  await preloadFirstLines(allFiles);

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
      runSearch(previousSearchQuery);
      searchResults.scrollTop = previousSearchScrollTop;
    } else {
      searchInput.value = '';
      searchResults.classList.add('hidden');
      treeEl.style.display = '';
    }

    restoreTreeState(previousTreeState);

    if (previousFilePath) {
      const fileToRestore = allFiles.find((f) => f.path === previousFilePath);
      if (fileToRestore) {
        await openFileByPath(previousFilePath, { scrollTop: previousContentScrollTop, scrollIntoView: false, trackRead: false, updateHistory: false });
      } else {
        currentFilePath = '';
        currentFileRawText = '';
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
async function preloadFirstLines(files) {
  await Promise.all(
    files.map(async (f) => {
      try {
        const text = await f.read();
        f._cachedText = text;
        f._firstLine = extractFirstLine(text);
      } catch {
        f._firstLine = '';
        f._cachedText = '';
      }
    }),
  );
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
  return '';
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
  renderNode(root, treeEl, 0, '');
}

function renderNode(node, parentEl, depth, parentPath) {
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

    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';

    if (depth < 2) {
      childContainer.classList.add('open');
      item.querySelector('.icon').innerHTML = '&#9660;';
    }

    item.addEventListener('click', () => {
      const isOpen = childContainer.classList.toggle('open');
      item.querySelector('.icon').innerHTML = isOpen ? '&#9660;' : '&#9654;';
    });

    wrapper.appendChild(item);
    renderNode(child, childContainer, depth + 1, dirPath);
    wrapper.appendChild(childContainer);
    parentEl.appendChild(wrapper);
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
    parentEl.appendChild(item);
  }
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

  const text = f._cachedText || (await f.read());
  currentFilePath = f.path;
  currentFileRawText = text;
  contentEl.innerHTML = marked.parse(text);
  configureRenderedLinks();
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

// === Search ===
let searchTimeout = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => runSearch(searchInput.value.trim()), 150);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    searchResults.classList.add('hidden');
    treeEl.style.display = '';
  }
});

function runSearch(query) {
  if (!query) {
    searchResults.classList.add('hidden');
    treeEl.style.display = '';
    return;
  }

  const lower = query.toLowerCase();
  const matches = allFiles.filter((f) => {
    const inPath = f.path.toLowerCase().includes(lower);
    const inContent = f._cachedText && f._cachedText.toLowerCase().includes(lower);
    return inPath || inContent;
  });

  searchResults.innerHTML = '';
  treeEl.style.display = 'none';
  searchResults.classList.remove('hidden');

  if (matches.length === 0) {
    searchResults.innerHTML = '<div class="search-empty">검색 결과가 없습니다</div>';
    return;
  }

  const countEl = document.createElement('div');
  countEl.className = 'search-count';
  countEl.textContent = `${matches.length}개 결과`;
  searchResults.appendChild(countEl);

  for (const f of matches) {
    const item = document.createElement('div');
    item.className = 'tree-item tree-file search-result-item';
    item.dataset.filePath = f.path;
    item.tabIndex = 0;

    const fileName = f.path.split('/').pop();
    const dirPath = f.path.split('/').slice(0, -1).join('/');
    const snippet = getSearchSnippet(f._cachedText, lower);

    item.innerHTML = `
      <span class="icon">&#9776;</span>
      <div class="search-result-content">
        <div class="search-result-name">${highlightMatch(fileName, lower)}</div>
        <div class="search-result-path">${esc(dirPath)}</div>
        ${snippet ? `<div class="search-result-snippet">${snippet}</div>` : ''}
      </div>
    `;

    item.addEventListener('click', () => openFile(f, item));
    searchResults.appendChild(item);
  }
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
  const visible = showHiddenFiles ? files : files.filter(f => !f.hidden);
  const sorted = [...visible].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

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
    treeEl.appendChild(item);
  }
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
});

unfoldAllBtn.addEventListener('click', () => {
  treeEl.querySelectorAll('.tree-children').forEach((el) => el.classList.add('open'));
  treeEl.querySelectorAll('.tree-dir > .icon').forEach((el) => (el.innerHTML = '&#9660;'));
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
}

document.getElementById('themeToggle').addEventListener('click', () => {
  themeIndex = (themeIndex + 1) % THEMES.length;
  applyTheme();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (THEMES[themeIndex] === 'system') applyTheme();
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

function startAutoRefresh() {
  stopAutoRefresh();
  if (!supportsDirectoryPicker || !currentHandle || !autoRefreshEnabled) return;

  autoRefreshTimer = window.setInterval(() => {
    refreshInBackground();
  }, AUTO_REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (!autoRefreshTimer) return;
  window.clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}

async function refreshInBackground() {
  if (!supportsDirectoryPicker || !currentHandle || isAutoRefreshing) return;

  isAutoRefreshing = true;
  try {
    const mdFiles = await scanDirectoryHandle(currentHandle);
    if (!hasFileListChanged(allFiles, mdFiles)) {
      return;
    }

    await showEditor(currentHandle.name, mdFiles, { preserveUiState: true });
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  } finally {
    isAutoRefreshing = false;
  }
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

async function copyCurrentRawMarkdown() {
  if (!currentFilePath) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(currentFileRawText);
      showCopyFeedback(true);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = currentFileRawText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    showCopyFeedback(copied);
  } catch {
    showCopyFeedback(false);
  }
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
  showHiddenFiles = !showHiddenFiles;
  localStorage.setItem('md-viewer-show-hidden', showHiddenFiles);

  hiddenToggleBtn.innerHTML = showHiddenFiles ? ICONS.eye : ICONS.eyeOff;
  hiddenToggleBtn.setAttribute('data-tooltip', showHiddenFiles ? '숨김 파일 숨기기' : '숨김 파일 표시');
  hiddenToggleBtn.setAttribute('aria-label', showHiddenFiles ? '숨김 파일 숨기기' : '숨김 파일 표시');
  hiddenToggleBtn.classList.toggle('btn-active', showHiddenFiles);

  if (viewMode === 'tree') {
    const tree = buildTree(allFiles);
    renderTree(tree);
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
