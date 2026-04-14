import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isLocalFileLink, normalizePath, resolveLinkedFilePath, setupContentLinkHandling } from './content-links.js';

// ─── isLocalFileLink ─────────────────────────────────────────────────────────

describe('isLocalFileLink', () => {
  it('http/https → false', () => {
    expect(isLocalFileLink('http://example.com')).toBe(false);
    expect(isLocalFileLink('https://example.com/path')).toBe(false);
  });

  it('// 프로토콜 상대 → false', () => {
    expect(isLocalFileLink('//example.com')).toBe(false);
  });

  it('mailto / tel / javascript / data → false', () => {
    expect(isLocalFileLink('mailto:user@example.com')).toBe(false);
    expect(isLocalFileLink('tel:+1234')).toBe(false);
    expect(isLocalFileLink('javascript:void(0)')).toBe(false);
    expect(isLocalFileLink('data:text/plain,hello')).toBe(false);
  });

  it('file:// → true', () => {
    expect(isLocalFileLink('file:///Users/foo/bar.md')).toBe(true);
  });

  it('/ 절대경로 → true', () => {
    expect(isLocalFileLink('/docs/readme.md')).toBe(true);
  });

  it('./ 또는 ../ 상대경로 → true', () => {
    expect(isLocalFileLink('./sibling.md')).toBe(true);
    expect(isLocalFileLink('../parent/doc.md')).toBe(true);
  });

  it('확장자 없는 상대경로 → true', () => {
    expect(isLocalFileLink('readme')).toBe(true);
    expect(isLocalFileLink('docs/guide.md')).toBe(true);
  });
});

// ─── normalizePath ───────────────────────────────────────────────────────────

describe('normalizePath', () => {
  it('단순 경로는 그대로', () => {
    expect(normalizePath('docs/guide.md')).toBe('docs/guide.md');
  });

  it('. 세그먼트 제거', () => {
    expect(normalizePath('docs/./guide.md')).toBe('docs/guide.md');
  });

  it('.. 으로 상위 이동', () => {
    expect(normalizePath('docs/sub/../guide.md')).toBe('docs/guide.md');
  });

  it('중복 슬래시 제거', () => {
    expect(normalizePath('docs//guide.md')).toBe('docs/guide.md');
  });

  it('백슬래시를 슬래시로 변환', () => {
    expect(normalizePath('docs\\guide.md')).toBe('docs/guide.md');
  });

  it('루트 상위로 벗어나지 않음', () => {
    expect(normalizePath('../../etc/passwd')).toBe('etc/passwd');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(normalizePath('')).toBe('');
  });
});

// ─── resolveLinkedFilePath ───────────────────────────────────────────────────

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

  it('../ 상위 이동', () => {
    expect(resolveLinkedFilePath('../README.md', 'docs/guide.md', files)).toBe('README.md');
  });

  it('#앵커 포함 링크에서 경로만 추출', () => {
    expect(resolveLinkedFilePath('api.md#section', 'docs/guide.md', files)).toBe('docs/api.md');
  });

  it('?쿼리 포함 링크에서 경로만 추출', () => {
    expect(resolveLinkedFilePath('api.md?v=1', 'docs/guide.md', files)).toBe('docs/api.md');
  });

  it('/ 절대경로는 루트 기준 해석', () => {
    expect(resolveLinkedFilePath('/README.md', 'docs/guide.md', files)).toBe('README.md');
  });

  it('빈 경로 → null', () => {
    expect(resolveLinkedFilePath('', 'docs/guide.md', files)).toBeNull();
  });

  it('URL 인코딩된 상대경로 디코딩', () => {
    expect(resolveLinkedFilePath('sub%2Fdeep%2Fnote.md', 'README.md', files)).toBe('sub/deep/note.md');
  });

  it('file:// 스킴 - 정확히 일치', () => {
    expect(resolveLinkedFilePath('file:///base/docs/guide.md', 'README.md', files)).toBe('docs/guide.md');
  });

  it('file:// 스킴 - suffix 매칭', () => {
    expect(resolveLinkedFilePath('file:///any/path/docs/api.md', 'README.md', files)).toBe('docs/api.md');
  });

  it('/ 절대경로 - findFileByAbsolutePath 미일치 시 정규화 경로 반환', () => {
    expect(resolveLinkedFilePath('/nonexistent.md', 'docs/guide.md', files)).toBe('nonexistent.md');
  });
});

// ─── setupContentLinkHandling ────────────────────────────────────────────────

describe('setupContentLinkHandling', () => {
  let contentEl;
  let openLocalFileByPath;
  let configureRenderedLinks;

  beforeEach(() => {
    contentEl = document.createElement('div');
    document.body.appendChild(contentEl);
    openLocalFileByPath = vi.fn().mockResolvedValue(true);

    ({ configureRenderedLinks } = setupContentLinkHandling({
      contentEl,
      getAllFiles: () => [{ path: 'docs/guide.md' }],
      getCurrentFilePath: () => 'docs/index.md',
      openLocalFileByPath,
    }));
  });

  afterEach(() => {
    document.body.removeChild(contentEl);
    vi.restoreAllMocks();
  });

  // configureRenderedLinks
  describe('configureRenderedLinks', () => {
    it('외부 링크에 target="_blank" + rel 추가', () => {
      contentEl.innerHTML = '<a href="https://example.com">link</a>';
      configureRenderedLinks();
      const a = contentEl.querySelector('a');
      expect(a.target).toBe('_blank');
      expect(a.rel).toBe('noopener noreferrer');
    });

    it('#앵커는 변경하지 않음', () => {
      contentEl.innerHTML = '<a href="#section">anchor</a>';
      configureRenderedLinks();
      expect(contentEl.querySelector('a').target).toBe('');
    });

    it('로컬 파일 링크는 변경하지 않음', () => {
      contentEl.innerHTML = '<a href="./guide.md">local</a>';
      configureRenderedLinks();
      expect(contentEl.querySelector('a').target).toBe('');
    });

    it('javascript: 링크는 변경하지 않음', () => {
      contentEl.innerHTML = '<a href="javascript:void(0)">js</a>';
      configureRenderedLinks();
      expect(contentEl.querySelector('a').target).toBe('');
    });

    it('href 없는 앵커 → 오류 없음', () => {
      contentEl.innerHTML = '<a>no href</a>';
      expect(() => configureRenderedLinks()).not.toThrow();
    });
  });

  // click handler
  describe('click handler', () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));

    it('앵커 아닌 요소 클릭 → openLocalFileByPath 미호출', async () => {
      contentEl.innerHTML = '<p>text</p>';
      contentEl.querySelector('p').click();
      await flush();
      expect(openLocalFileByPath).not.toHaveBeenCalled();
    });

    it('로컬 파일 링크 클릭 → openLocalFileByPath 호출', async () => {
      contentEl.innerHTML = '<a href="guide.md">link</a>';
      contentEl.querySelector('a').click();
      await flush();
      expect(openLocalFileByPath).toHaveBeenCalled();
    });

    it('존재하지 않는 로컬 파일 → openLocalFileByPath에 null 경로 전달 안 함', async () => {
      contentEl.innerHTML = '<a href="">empty href</a>';
      contentEl.querySelector('a').click();
      await flush();
      expect(openLocalFileByPath).not.toHaveBeenCalled();
    });

    it('외부 링크 클릭 → window.open 호출', async () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      contentEl.innerHTML = '<a href="https://example.com">ext</a>';
      contentEl.querySelector('a').click();
      await flush();
      // jsdom이 anchor.href를 정규화하므로 trailing slash 포함
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('example.com'), '_blank', 'noopener,noreferrer');
    });

    it('#앵커 클릭 → 대상 엘리먼트로 스크롤', async () => {
      contentEl.innerHTML = '<a href="#section">go</a><h2 id="section">title</h2>';
      const h2 = contentEl.querySelector('h2');
      h2.scrollIntoView = vi.fn();
      contentEl.querySelector('a').click();
      await flush();
      expect(h2.scrollIntoView).toHaveBeenCalled();
    });

    it('#앵커인데 대상 없음 → 오류 없이 처리', async () => {
      contentEl.innerHTML = '<a href="#nonexistent">go</a>';
      expect(() => contentEl.querySelector('a').click()).not.toThrow();
    });

    it('javascript: href 클릭 → window.open 미호출', async () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      contentEl.innerHTML = '<a href="javascript:void(0)">js</a>';
      contentEl.querySelector('a').click();
      await flush();
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('openLocalFileByPath가 false 반환해도 오류 없음', async () => {
      openLocalFileByPath.mockResolvedValue(false);
      contentEl.innerHTML = '<a href="missing.md">link</a>';
      expect(() => contentEl.querySelector('a').click()).not.toThrow();
    });
  });
});
