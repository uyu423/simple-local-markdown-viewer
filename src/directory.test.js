import { vi, describe, it, expect, beforeEach } from 'vitest';

// showDirectoryPicker 을 module 평가 전에 주입해 supportsDirectoryPicker = true 로 만듦
vi.hoisted(() => {
  globalThis.showDirectoryPicker = vi.fn();
});

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

import { get, del } from 'idb-keyval';
import {
  scanInputFiles,
  scanDirectoryHandle,
  getSavedDirectory,
  reconnectDirectory,
  supportsDirectoryPicker,
} from './directory.js';

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeInputFile(relativePath, size = 10) {
  return Object.assign(new File(['x'.repeat(size)], relativePath.split('/').pop()), {
    webkitRelativePath: relativePath,
  });
}

function mockFileEntry(name, content = 'hello') {
  return {
    kind: 'file',
    name,
    getFile: vi.fn(async () => ({
      lastModified: 1000,
      text: async () => content,
      slice: (s, e) => ({ text: async () => content.slice(s ?? 0, e ?? content.length) }),
    })),
  };
}

function mockDirEntry(name, entries = []) {
  return {
    kind: 'directory',
    name,
    async *values() {
      for (const e of entries) yield e;
    },
  };
}

// ─── supportsDirectoryPicker ──────────────────────────────────────────────────

describe('supportsDirectoryPicker', () => {
  it('showDirectoryPicker 가 window에 있으면 true', () => {
    expect(supportsDirectoryPicker).toBe(true);
  });
});

// ─── scanInputFiles ───────────────────────────────────────────────────────────

describe('scanInputFiles', () => {
  it('.md 파일만 포함', () => {
    const files = [makeInputFile('root/docs/guide.md'), makeInputFile('root/docs/image.png'), makeInputFile('root/README.md')];
    expect(scanInputFiles(files).map((f) => f.path)).toEqual(['docs/guide.md', 'README.md']);
  });

  it('.mdc .mdx .txt 허용 확장자 포함', () => {
    const files = [makeInputFile('root/a.mdc'), makeInputFile('root/b.mdx'), makeInputFile('root/c.txt'), makeInputFile('root/d.pdf')];
    expect(scanInputFiles(files).map((f) => f.path)).toEqual(['a.mdc', 'b.mdx', 'c.txt']);
  });

  it('node_modules 디렉토리 제외', () => {
    const files = [makeInputFile('root/node_modules/pkg/README.md'), makeInputFile('root/docs/guide.md')];
    expect(scanInputFiles(files).map((f) => f.path)).toEqual(['docs/guide.md']);
  });

  it('숨김 경로는 hidden: true', () => {
    const files = [makeInputFile('root/.hidden/note.md'), makeInputFile('root/docs/.secret.md'), makeInputFile('root/docs/visible.md')];
    const result = scanInputFiles(files);
    expect(result.filter((f) => f.hidden).map((f) => f.path).sort()).toEqual(['.hidden/note.md', 'docs/.secret.md'].sort());
    expect(result.filter((f) => !f.hidden).map((f) => f.path)).toEqual(['docs/visible.md']);
  });

  it('루트 디렉토리명은 path에서 제외', () => {
    expect(scanInputFiles([makeInputFile('workspace/sub/doc.md')])[0].path).toBe('sub/doc.md');
  });

  it('빈 FileList → 빈 배열', () => {
    expect(scanInputFiles([])).toEqual([]);
  });

  it('read / readHead 함수 포함', () => {
    const result = scanInputFiles([makeInputFile('root/note.md')]);
    expect(typeof result[0].read).toBe('function');
    expect(typeof result[0].readHead).toBe('function');
  });

  it('lastModified 값 포함', () => {
    expect(typeof scanInputFiles([makeInputFile('root/note.md')])[0].lastModified).toBe('number');
  });
});

// ─── scanDirectoryHandle ──────────────────────────────────────────────────────

describe('scanDirectoryHandle', () => {
  it('.md 파일 포함, 비허용 확장자 제외', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('guide.md'), mockFileEntry('image.png')]);
    const result = await scanDirectoryHandle(handle);
    expect(result.map((f) => f.path)).toEqual(['guide.md']);
  });

  it('하위 디렉토리 재귀 탐색', async () => {
    const handle = mockDirEntry('root', [mockDirEntry('docs', [mockFileEntry('api.md')]), mockFileEntry('README.md')]);
    const result = await scanDirectoryHandle(handle);
    expect(result.map((f) => f.path).sort()).toEqual(['README.md', 'docs/api.md'].sort());
  });

  it('node_modules 디렉토리 건너뜀', async () => {
    const handle = mockDirEntry('root', [mockDirEntry('node_modules', [mockFileEntry('pkg.md')]), mockFileEntry('README.md')]);
    const result = await scanDirectoryHandle(handle);
    expect(result.map((f) => f.path)).toEqual(['README.md']);
  });

  it('숨김 디렉토리의 파일은 hidden: true', async () => {
    const handle = mockDirEntry('root', [mockDirEntry('.hidden', [mockFileEntry('note.md')])]);
    const [file] = await scanDirectoryHandle(handle);
    expect(file.hidden).toBe(true);
  });

  it('숨김 파일은 hidden: true', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('.secret.md')]);
    const [file] = await scanDirectoryHandle(handle);
    expect(file.hidden).toBe(true);
  });

  it('일반 파일은 hidden: false', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('note.md')]);
    const [file] = await scanDirectoryHandle(handle);
    expect(file.hidden).toBe(false);
  });

  it('prefix 지정 시 path에 포함', async () => {
    const handle = mockDirEntry('sub', [mockFileEntry('note.md')]);
    const result = await scanDirectoryHandle(handle, 'parent');
    expect(result[0].path).toBe('parent/note.md');
  });

  it('includeReaders: false → read/readHead 없음', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('note.md')]);
    const [file] = await scanDirectoryHandle(handle, '', { includeReaders: false });
    expect(file.read).toBeUndefined();
    expect(file.readHead).toBeUndefined();
  });

  it('includeReaders: true(기본) → read/readHead 함수 포함', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('note.md')]);
    const [file] = await scanDirectoryHandle(handle);
    expect(typeof file.read).toBe('function');
    expect(typeof file.readHead).toBe('function');
  });

  it('read() 호출 시 파일 텍스트 반환', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('note.md', 'hello world')]);
    const [file] = await scanDirectoryHandle(handle);
    expect(await file.read()).toBe('hello world');
  });

  it('readHead() 호출 시 첫 N바이트 반환', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('note.md', 'abcdefgh')]);
    const [file] = await scanDirectoryHandle(handle);
    const preview = await file.readHead(4);
    expect(preview).toBe('abcd');
  });

  it('lastModified 값 포함', async () => {
    const handle = mockDirEntry('root', [mockFileEntry('note.md')]);
    const [file] = await scanDirectoryHandle(handle);
    expect(file.lastModified).toBe(1000);
  });
});

// ─── getSavedDirectory ────────────────────────────────────────────────────────

describe('getSavedDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('저장된 핸들 없음 → null', async () => {
    get.mockResolvedValue(null);
    expect(await getSavedDirectory()).toBeNull();
  });

  it('권한 granted → { handle, needsPermission: false }', async () => {
    const handle = { queryPermission: async () => 'granted' };
    get.mockResolvedValue(handle);
    const result = await getSavedDirectory();
    expect(result).toEqual({ handle, needsPermission: false });
  });

  it('권한 prompt → { handle, needsPermission: true }', async () => {
    const handle = { queryPermission: async () => 'prompt' };
    get.mockResolvedValue(handle);
    const result = await getSavedDirectory();
    expect(result).toEqual({ handle, needsPermission: true });
  });

  it('권한 denied → null 이고 핸들 삭제', async () => {
    const handle = { queryPermission: async () => 'denied' };
    get.mockResolvedValue(handle);
    del.mockResolvedValue(undefined);
    const result = await getSavedDirectory();
    expect(result).toBeNull();
    expect(del).toHaveBeenCalled();
  });
});

// ─── reconnectDirectory ───────────────────────────────────────────────────────

describe('reconnectDirectory', () => {
  it('granted → true', async () => {
    const handle = { requestPermission: async () => 'granted' };
    expect(await reconnectDirectory(handle)).toBe(true);
  });

  it('denied → false', async () => {
    const handle = { requestPermission: async () => 'denied' };
    expect(await reconnectDirectory(handle)).toBe(false);
  });

  it('prompt → false', async () => {
    const handle = { requestPermission: async () => 'prompt' };
    expect(await reconnectDirectory(handle)).toBe(false);
  });
});
