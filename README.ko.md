# Simple Local Markdown Viewer

브라우저에서 로컬 마크다운 파일을 빠르게 탐색/미리보기 할 수 있는 단일 파일(Single-file) 뷰어입니다. 서버 없이도 동작하며, 빌드된 HTML 파일을 열기만 하면 바로 사용할 수 있습니다.

## 기능

- **단일 HTML 파일**: 약 1MB 내외의 독립 실행형 HTML 파일로 빌드됩니다. 최신 브라우저에서 `file://`로 바로 열 수 있습니다.
- **서버 불필요**: 오프라인으로 동작하며 설치/런타임 의존성이 없습니다.
- **파일 트리 탐색기**: 폴더 구조를 트리로 보여주고, 접기/펼치기로 빠르게 탐색할 수 있습니다.
- **전체 텍스트 검색**: 파일명과 내용에서 동시에 검색하며, 경로와 스니펫을 함께 보여줍니다.
- **마크다운 렌더링**: [marked](https://marked.js.org/) + [highlight.js](https://highlightjs.org/)로 코드 블록 문법 하이라이트(언어 감지 포함)를 제공합니다.
- **보기 모드**:
  - **트리 모드**: 폴더 구조(접기/펼치기) + 첫 줄(제목) 미리보기
  - **최근 모드**: 수정 시각 기준 정렬
- **백그라운드 자동 새로고침**: 네이티브 폴더 핸들이 활성화된 경우, 현재 화면 상태를 유지하면서 1분마다 열린 폴더를 백그라운드로 새로고침합니다.
- **테마 지원**: 다크/라이트/시스템 테마를 지원하며 선택을 저장합니다.
- **폴더 기억**: IndexedDB에 마지막으로 열었던 폴더 핸들을 저장하고, 한 번의 클릭으로 재연결할 수 있습니다.
- **사이드바 크기 조절**: 디바이더를 드래그해서 레이아웃을 조절할 수 있습니다.
- **키보드 단축키**: 파일 탐색/검색을 빠르게 할 수 있습니다.

## 지원 파일 타입

- `.md` — 일반 마크다운
- `.mdc` — 컴포넌트를 포함한 마크다운
- `.mdx` — MDX (Markdown + JSX)
- `.markdown` — 대체 확장자
- `.mdown` — 대체 확장자
- `.txt` — 일반 텍스트

## 사용 방법

### 옵션 1: 브라우저에서 바로 열기(가장 빠름)

1. `index.html`을 다운로드하거나 직접 빌드합니다.
2. 브라우저에서 엽니다: `파일 → 파일 열기` 또는 브라우저로 드래그 앤 드롭
3. "폴더 선택" 버튼을 클릭합니다.
4. 마크다운 파일이 있는 폴더를 선택합니다.
5. 탐색을 시작합니다.

### 옵션 2: 심볼릭 링크로 빠르게 접근하기

특정 프로젝트에서 자주 사용한다면, 빌드된 파일을 프로젝트 안으로 심볼릭 링크해두면 편합니다.

```bash
# 프로젝트 한 번 빌드
npm run build

# 프로젝트로 심볼릭 링크 생성
ln -s /path/to/simple-local-markdown-viewer/docs/index.html ~/my-project/docs-viewer.html

# 언제든지 열기
open ~/my-project/docs-viewer.html
```

### 옵션 3: 로컬 문서 브라우저로 사용하기

어떤 프로젝트든 문서를 빠르게 보기 위한 범용 뷰어로 사용할 수 있습니다.

```bash
# 접근하기 쉬운 위치에 index.html 복사
cp docs/index.html ~/bin/md-viewer.html

# 어디서든 실행
open ~/bin/md-viewer.html
```

### 옵션 4: 로컬 문서 뷰어 빠른 다운로드(wget)

최신 단일 파일 빌드를 빠르게 받아서 바로 사용할 수 있습니다.

```bash
wget https://raw.githubusercontent.com/uyu423/simple-local-markdown-viewer/refs/heads/main/docs/index.html
open index.html
```

열 때마다 다른 폴더를 선택할 수 있고, 마지막 폴더를 자동으로 기억합니다.

## 키보드 단축키

| 단축키         | 동작                  |
| -------------- | --------------------- |
| `Cmd+K` 또는 `/` | 검색창 포커스         |
| `Cmd+B`        | 사이드바 토글          |
| `j` 또는 `↓`   | 다음 파일             |
| `k` 또는 `↑`   | 이전 파일             |
| `Esc`          | 검색/검색결과 닫기     |

(Windows/Linux에서는 `Cmd` 대신 `Ctrl`을 사용하세요.)

## 개발

### 필요 조건

- Node.js 16+
- npm

### 설치

```bash
npm install
```

### 개발 서버

```bash
npm run dev
```

Vite 개발 서버가 `http://localhost:5173`에서 실행됩니다. 핫 리로드가 활성화되어 빠르게 개발할 수 있습니다.

### 빌드

```bash
npm run build
```

CSS/JavaScript가 모두 인라인된 단일 `docs/index.html` 파일(~1MB)을 생성합니다.

### 빌드 결과 미리보기

```bash
npm run preview
```

프로덕션 빌드를 로컬에서 테스트할 수 있습니다.

## 브라우저 호환성

| 브라우저         | 지원 | 방식                                                |
| --------------- | ---- | --------------------------------------------------- |
| Chrome, Edge    | Full | `showDirectoryPicker()` API (네이티브 폴더 선택)     |
| Firefox, Safari | Full | `webkitdirectory` fallback (파일 입력 기반)         |

두 방식 모두 서버 없이 동작합니다. 가능하면 네이티브 API를 우선 사용하고, 지원하지 않는 브라우저에서는 fallback으로 자연스럽게 전환됩니다.

## 기술 스택

- **[Vite](https://vitejs.dev/)** — 빌드 도구
- **[vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)** — 모든 리소스를 단일 HTML로 번들링
- **[marked](https://marked.js.org/)** — GitHub Flavored Markdown 지원 마크다운 파서
- **[highlight.js](https://highlightjs.org/)** — 코드 문법 하이라이트
- **[idb-keyval](https://github.com/jakearchibald/idb-keyval)** — IndexedDB 기반 폴더 기억 기능
- **Vanilla JavaScript** — 프레임워크 없이 동작

## 저장소/데이터

앱은 IndexedDB를 사용해서 다음 정보를 저장합니다.

- 마지막으로 열었던 폴더 핸들(권한 상태 포함)
- 테마 설정
- 검색 상태(세션 단위)

모든 데이터는 로컬에만 저장됩니다.

## 성능

- **첫 로드**: 약 1-3초(파일 개수에 따른 폴더 스캔 시간 포함)
- **검색**: 대부분 즉시(전체 텍스트 단일 패스 필터링)
- **파일 렌더링**: 일반적인 마크다운 기준 ~100ms
- **사이드바**: 부드러운 스크롤/키보드 네비게이션

대용량 폴더(1000+ 파일)도 지원합니다.

## 제한 사항

- **읽기 전용**: 파일 편집은 지원하지 않습니다. 편집 후 새로고침해서 확인하세요.
- **폴더 선택**: 한 번에 하나의 폴더만 선택할 수 있습니다(여러 진입점이 필요하면 symlink를 활용하세요).
- **브라우저 보안 모델**: 선택한 폴더 바깥의 상위 디렉토리나 시스템 경로는 접근할 수 없습니다.

## 라이선스

MIT

## 기여

PR을 환영합니다. 제출 전에 현재 빌드 기준으로 동작 확인 부탁드립니다.
