import { get, set, del } from 'idb-keyval';

const DIR_HANDLE_KEY = 'md-viewer-dir-handle';

const supportsDirectoryPicker = 'showDirectoryPicker' in window;

const ALLOWED_EXTENSIONS = ['.md', '.mdc', '.mdx', '.markdown', '.mdown', '.txt'];

function isAllowedFile(name) {
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * 저장된 디렉토리 핸들 복원 시도
 * @returns {{ handle, needsPermission: boolean } | null}
 */
export async function getSavedDirectory() {
  if (!supportsDirectoryPicker) return null;

  const handle = await get(DIR_HANDLE_KEY);
  if (!handle) return null;

  const permission = await handle.queryPermission({ mode: 'read' });

  if (permission === 'granted') {
    return { handle, needsPermission: false };
  }
  if (permission === 'prompt') {
    return { handle, needsPermission: true };
  }

  // denied — 저장 핸들 제거
  await del(DIR_HANDLE_KEY);
  return null;
}

/**
 * 저장된 핸들에 권한 재요청 (사용자 제스처 내에서 호출)
 */
export async function reconnectDirectory(handle) {
  const permission = await handle.requestPermission({ mode: 'read' });
  return permission === 'granted';
}

/**
 * showDirectoryPicker로 새 폴더 선택 + IndexedDB 저장
 */
export async function pickDirectoryNative() {
  const handle = await window.showDirectoryPicker({
    id: 'md-viewer-workspace',
    mode: 'read',
  });
  await set(DIR_HANDLE_KEY, handle);
  return handle;
}

/**
 * FileSystemDirectoryHandle에서 .md 파일 재귀 스캔
 */
export async function scanDirectoryHandle(dirHandle, prefix = '') {
  const results = [];
  for await (const entry of dirHandle.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'file' && isAllowedFile(entry.name)) {
      const file = await entry.getFile();
      results.push({
        path,
        lastModified: file.lastModified,
        read: () => file.text(),
      });
    } else if (
      entry.kind === 'directory' &&
      !entry.name.startsWith('.') &&
      entry.name !== 'node_modules'
    ) {
      const children = await scanDirectoryHandle(entry, path);
      results.push(...children);
    }
  }
  return results;
}

/**
 * <input webkitdirectory>의 FileList에서 .md 파일 추출
 */
export function scanInputFiles(fileList) {
  return Array.from(fileList)
    .filter((f) => {
      const parts = f.webkitRelativePath.split('/');
      return (
        isAllowedFile(f.name) &&
        !parts.some((p) => p.startsWith('.') || p === 'node_modules')
      );
    })
    .map((f) => ({
      path: f.webkitRelativePath.split('/').slice(1).join('/'),
      lastModified: f.lastModified,
      read: () => f.text(),
    }));
}

export { supportsDirectoryPicker };
