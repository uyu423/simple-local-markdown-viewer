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

function parseFragmentId(href) {
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) return '';
  return href.slice(hashIndex + 1);
}

function decodeFragmentId(fragmentId) {
  try {
    return decodeURIComponent(fragmentId);
  } catch {
    return fragmentId;
  }
}

function findElementByIdInContent(contentEl, id) {
  if (!id) return null;

  const direct = document.getElementById(id);
  if (direct && contentEl.contains(direct)) return direct;

  const allWithId = contentEl.querySelectorAll('[id]');
  for (const element of allWithId) {
    if (element.id === id) return element;
  }
  return null;
}

function scrollToFragment(contentEl, href) {
  const rawFragmentId = parseFragmentId(href);
  if (!rawFragmentId) {
    contentEl.scrollTop = 0;
    return true;
  }

  const decodedFragmentId = decodeFragmentId(rawFragmentId);
  const candidates = decodedFragmentId === rawFragmentId
    ? [rawFragmentId]
    : [rawFragmentId, decodedFragmentId];

  for (const candidate of candidates) {
    const target = findElementByIdInContent(contentEl, candidate);
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return true;
    }
  }

  return false;
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
    if (!href || href.startsWith('javascript:')) return;

    if (href.startsWith('#')) {
      e.preventDefault();
      const moved = scrollToFragment(contentEl, href);
      if (!moved) {
        console.warn('링크된 섹션을 찾을 수 없습니다:', href);
      }
      return;
    }

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
