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
const refreshBtn = document.getElementById('refreshBtn');

// State
let pendingHandle = null;
let allFiles = [];
let viewMode = 'tree'; // 'tree' | 'recent'
let currentHandle = null;
let currentFilePath = '';
let autoRefreshTimer = null;
let isAutoRefreshing = false;

const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;

// === Init: check for saved directory ===
async function init() {
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

document.getElementById('changeFolderBtn')?.addEventListener('click', async () => {
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
    } else {
      searchInput.value = '';
      searchResults.classList.add('hidden');
      treeEl.style.display = '';
    }

    if (previousFilePath) {
      const fileToRestore = allFiles.find((f) => f.path === previousFilePath);
      if (fileToRestore) {
        const itemToRestore = findFileItemByPath(previousFilePath);
        await openFile(fileToRestore, itemToRestore, { scrollTop: previousContentScrollTop });
      } else {
        currentFilePath = '';
        contentEl.innerHTML = '<div class="empty-state">왼쪽에서 .md 파일을 선택하세요</div>';
        breadcrumbEl.textContent = '';
      }
    }
  } else {
    currentFilePath = '';
    contentEl.innerHTML = '<div class="empty-state">왼쪽에서 .md 파일을 선택하세요</div>';
    breadcrumbEl.textContent = '';
    searchInput.value = '';
    searchResults.classList.add('hidden');
    treeEl.style.display = '';
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
  const root = { children: new Map(), files: [] };

  for (const f of files) {
    const parts = f.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current.children.has(parts[i])) {
        current.children.set(parts[i], { children: new Map(), files: [] });
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
  renderNode(root, treeEl, 0);
}

function renderNode(node, parentEl, depth) {
  const dirs = [...node.children.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path));

  for (const [name, child] of dirs) {
    const wrapper = document.createElement('div');

    const item = document.createElement('div');
    item.className = 'tree-item tree-dir';
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
    renderNode(child, childContainer, depth + 1);
    wrapper.appendChild(childContainer);
    parentEl.appendChild(wrapper);
  }

  for (const f of files) {
    const fileName = f.path.split('/').pop();
    const item = document.createElement('div');
    item.className = 'tree-item tree-file';
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
  const { scrollTop = 0 } = options;

  document.querySelectorAll('.tree-item.active').forEach((el) => el.classList.remove('active'));
  if (itemEl) {
    itemEl.classList.add('active');
    itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  breadcrumbEl.textContent = f.path.split('/').join(' \u203A ');

  const text = f._cachedText || (await f.read());
  currentFilePath = f.path;
  contentEl.innerHTML = marked.parse(text);
  contentEl.scrollTop = scrollTop;
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
    viewModeBtn.textContent = '\u{1F552}';
    viewModeBtn.title = '최근 업데이트 순';
    foldAllBtn.classList.remove('hidden');
    unfoldAllBtn.classList.remove('hidden');
    const tree = buildTree(allFiles);
    renderTree(tree);
  } else {
    viewModeBtn.textContent = '\u{1F4C2}';
    viewModeBtn.title = '디렉토리 구조';
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
  const sorted = [...files].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

  for (const f of sorted) {
    const item = document.createElement('div');
    item.className = 'tree-item tree-file recent-item';
    item.dataset.filePath = f.path;

    const fileName = f.path.split('/').pop();
    const dirPath = f.path.split('/').slice(0, -1).join('/');
    const timeStr = f.lastModified ? formatRelativeTime(f.lastModified) : '';

    item.innerHTML = `
      <span class="icon">&#9776;</span>
      <div class="recent-content">
        <div class="recent-name">${esc(fileName)}${f._firstLine ? `<span class="first-line">${esc(f._firstLine)}</span>` : ''}</div>
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
const THEME_ICONS = { dark: '\u263E', light: '\u2600', system: '\u25D1' };
let themeIndex = parseInt(localStorage.getItem('md-viewer-theme-idx') || '0', 10);

function applyTheme() {
  const theme = THEMES[themeIndex];
  localStorage.setItem('md-viewer-theme-idx', themeIndex);
  document.getElementById('themeToggle').textContent = THEME_ICONS[theme];
  document.getElementById('themeToggle').title = `테마: ${theme}`;

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
function findFileItemByPath(path) {
  const items = treeEl.querySelectorAll('.tree-item.tree-file');
  for (const item of items) {
    if (item.dataset.filePath === path) {
      return item;
    }
  }
  return null;
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (!supportsDirectoryPicker || !currentHandle) return;

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
    await loadFromHandle(currentHandle, {
      preserveUiState: true,
      silent: true,
    });
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  } finally {
    isAutoRefreshing = false;
  }
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

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

// === Start ===
init();
