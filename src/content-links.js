function isLocalFileLink(href) {
  const lower = href.toLowerCase();
  if (lower.startsWith('file://')) return true;
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('//')) return false;
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return false;
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
  if (href.startsWith('/')) return true;
  if (href.startsWith('./') || href.startsWith('../')) return true;
  return !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
}

function resolveExternalHref(anchor, href) {
  if (href.startsWith('//')) return `https:${href}`;
  return anchor.href || href;
}

function normalizePath(path) {
  const segments = path.split('/');
  const stack = [];

  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (stack.length > 0) stack.pop();
      continue;
    }
    stack.push(segment);
  }

  return stack.join('/');
}

function resolveLinkedFilePath(href, currentPath, files) {
  const rawPath = href.split('#')[0].split('?')[0].trim();
  if (!rawPath) return null;

  let decodedPath = rawPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    decodedPath = rawPath;
  }

  if (decodedPath.toLowerCase().startsWith('file://')) {
    const fileUrl = new URL(decodedPath);
    const candidate = normalizePath(fileUrl.pathname.replace(/^\/+/, ''));
    if (!candidate) return null;

    const exact = files.find((f) => f.path === candidate);
    if (exact) return exact.path;

    const suffix = `/${candidate}`;
    const bySuffix = files.find((f) => f.path.endsWith(suffix) || f.path === candidate);
    return bySuffix ? bySuffix.path : null;
  }

  if (decodedPath.startsWith('/')) {
    return normalizePath(decodedPath.slice(1));
  }

  const baseDir = currentPath.split('/').slice(0, -1).join('/');
  return normalizePath(baseDir ? `${baseDir}/${decodedPath}` : decodedPath);
}

export function setupContentLinkHandling({
  contentEl,
  getAllFiles,
  getCurrentFilePath,
  openLocalFileByPath,
}) {
  function configureRenderedLinks() {
    const links = contentEl.querySelectorAll('a[href]');
    for (const link of links) {
      const href = (link.getAttribute('href') || '').trim();
      if (!href || href.startsWith('#') || isLocalFileLink(href)) continue;
      if (href.startsWith('javascript:')) continue;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  contentEl.addEventListener('click', async (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = (anchor.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    if (isLocalFileLink(href)) {
      e.preventDefault();
      const targetPath = resolveLinkedFilePath(href, getCurrentFilePath(), getAllFiles());
      if (!targetPath) {
        console.warn('링크된 파일을 찾을 수 없습니다:', href);
        return;
      }

      const opened = await openLocalFileByPath(targetPath);
      if (!opened) {
        console.warn('링크된 파일을 찾을 수 없습니다:', href);
      }
      return;
    }

    e.preventDefault();
    window.open(resolveExternalHref(anchor, href), '_blank', 'noopener,noreferrer');
  });

  return {
    configureRenderedLinks,
  };
}
