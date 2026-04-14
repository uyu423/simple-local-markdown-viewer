import { describe, it, expect } from 'vitest';
import { scanInputFiles } from './directory.js';

function makeFile(relativePath, size = 100) {
  return Object.assign(new File(['x'.repeat(size)], relativePath.split('/').pop()), {
    webkitRelativePath: relativePath,
  });
}

describe('scanInputFiles', () => {
  it('.md 파일만 포함', () => {
    const files = [
      makeFile('root/docs/guide.md'),
      makeFile('root/docs/image.png'),
      makeFile('root/README.md'),
    ];
    const result = scanInputFiles(files);
    expect(result.map((f) => f.path)).toEqual(['docs/guide.md', 'README.md']);
  });

  it('.mdc .mdx .txt 허용 확장자 포함', () => {
    const files = [
      makeFile('root/a.mdc'),
      makeFile('root/b.mdx'),
      makeFile('root/c.txt'),
      makeFile('root/d.pdf'),
    ];
    const result = scanInputFiles(files);
    expect(result.map((f) => f.path)).toEqual(['a.mdc', 'b.mdx', 'c.txt']);
  });

  it('node_modules 디렉토리 제외', () => {
    const files = [
      makeFile('root/node_modules/pkg/README.md'),
      makeFile('root/docs/guide.md'),
    ];
    const result = scanInputFiles(files);
    expect(result.map((f) => f.path)).toEqual(['docs/guide.md']);
  });

  it('숨김 파일/폴더는 hidden: true', () => {
    const files = [
      makeFile('root/.hidden/note.md'),
      makeFile('root/docs/.secret.md'),
      makeFile('root/docs/visible.md'),
    ];
    const result = scanInputFiles(files);
    const hidden = result.filter((f) => f.hidden).map((f) => f.path);
    const visible = result.filter((f) => !f.hidden).map((f) => f.path);
    expect(hidden.sort()).toEqual(['.hidden/note.md', 'docs/.secret.md'].sort());
    expect(visible).toEqual(['docs/visible.md']);
  });

  it('루트 디렉토리명은 path에서 제외', () => {
    const files = [makeFile('my-workspace/sub/doc.md')];
    const result = scanInputFiles(files);
    expect(result[0].path).toBe('sub/doc.md');
  });

  it('빈 FileList는 빈 배열 반환', () => {
    expect(scanInputFiles([])).toEqual([]);
  });

  it('각 항목에 read 함수 포함', () => {
    const files = [makeFile('root/note.md')];
    const result = scanInputFiles(files);
    expect(typeof result[0].read).toBe('function');
    expect(typeof result[0].readHead).toBe('function');
  });

  it('lastModified 값 포함', () => {
    const files = [makeFile('root/note.md')];
    const result = scanInputFiles(files);
    expect(typeof result[0].lastModified).toBe('number');
  });
});
