import { describe, it, expect } from 'vitest';
import { isLocalFileLink, normalizePath, resolveLinkedFilePath } from './content-links.js';

describe('isLocalFileLink', () => {
  it('http/https는 false', () => {
    expect(isLocalFileLink('http://example.com')).toBe(false);
    expect(isLocalFileLink('https://example.com/path')).toBe(false);
  });

  it('// 로 시작하면 false', () => {
    expect(isLocalFileLink('//example.com')).toBe(false);
  });

  it('mailto/tel/javascript/data는 false', () => {
    expect(isLocalFileLink('mailto:user@example.com')).toBe(false);
    expect(isLocalFileLink('tel:+1234')).toBe(false);
    expect(isLocalFileLink('javascript:void(0)')).toBe(false);
    expect(isLocalFileLink('data:text/plain,hello')).toBe(false);
  });

  it('file:// 는 true', () => {
    expect(isLocalFileLink('file:///Users/foo/bar.md')).toBe(true);
  });

  it('/ 로 시작하는 절대경로는 true', () => {
    expect(isLocalFileLink('/docs/readme.md')).toBe(true);
  });

  it('./ 또는 ../ 상대경로는 true', () => {
    expect(isLocalFileLink('./sibling.md')).toBe(true);
    expect(isLocalFileLink('../parent/doc.md')).toBe(true);
  });

  it('확장자 없는 상대경로 파일명은 true', () => {
    expect(isLocalFileLink('readme')).toBe(true);
    expect(isLocalFileLink('docs/guide.md')).toBe(true);
  });
});

describe('normalizePath', () => {
  it('단순 경로는 그대로', () => {
    expect(normalizePath('docs/guide.md')).toBe('docs/guide.md');
  });

  it('. 세그먼트 제거', () => {
    expect(normalizePath('docs/./guide.md')).toBe('docs/guide.md');
  });

  it('.. 세그먼트로 상위 디렉토리 이동', () => {
    expect(normalizePath('docs/sub/../guide.md')).toBe('docs/guide.md');
  });

  it('중복 슬래시 처리', () => {
    expect(normalizePath('docs//guide.md')).toBe('docs/guide.md');
  });

  it('백슬래시를 슬래시로 변환', () => {
    expect(normalizePath('docs\\guide.md')).toBe('docs/guide.md');
  });

  it('루트 상위로 벗어나지 않음', () => {
    expect(normalizePath('../../etc/passwd')).toBe('etc/passwd');
  });

  it('빈 문자열은 빈 문자열', () => {
    expect(normalizePath('')).toBe('');
  });
});

describe('resolveLinkedFilePath', () => {
  const files = [
    { path: 'docs/guide.md' },
    { path: 'docs/api.md' },
    { path: 'README.md' },
    { path: 'sub/deep/note.md' },
  ];

  it('같은 디렉토리 상대경로', () => {
    expect(resolveLinkedFilePath('api.md', 'docs/guide.md', files)).toBe('docs/api.md');
  });

  it('../ 상위 이동 상대경로', () => {
    expect(resolveLinkedFilePath('../README.md', 'docs/guide.md', files)).toBe('README.md');
  });

  it('앵커(#) 포함 링크에서 경로만 추출', () => {
    expect(resolveLinkedFilePath('api.md#section', 'docs/guide.md', files)).toBe('docs/api.md');
  });

  it('쿼리스트링 포함 링크에서 경로만 추출', () => {
    expect(resolveLinkedFilePath('api.md?v=1', 'docs/guide.md', files)).toBe('docs/api.md');
  });

  it('/ 절대경로는 루트 기준으로 해석', () => {
    expect(resolveLinkedFilePath('/README.md', 'docs/guide.md', files)).toBe('README.md');
  });

  it('빈 경로는 null', () => {
    expect(resolveLinkedFilePath('', 'docs/guide.md', files)).toBeNull();
  });

  it('URL 인코딩된 경로 디코딩', () => {
    expect(resolveLinkedFilePath('sub%2Fdeep%2Fnote.md', 'README.md', files)).toBe('sub/deep/note.md');
  });
});
