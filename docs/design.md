# TENVI 디자인과 UX

## 방향

- 정돈된 다크 앱을 기본으로 하고 기존 일반(라이트) 테마 선택 유지.
- 네온·배경 격자·큰 로고 대신 표면 대비, 간격, 글자 크기로 정보 계층 표현.
- 탐색과 주요 작업은 항상 보이게, 복제·백업·삭제 등 보조 작업은 추가 작업 메뉴로 분리.

## 관련 파일

- `src/styles/experience.css`: 새 공통 시각 규칙. `App.jsx`에서 기존 스타일 뒤에 적용하며 `tenvi-app` 범위로 제한.
- `src/layouts/AppLayout.jsx`: 작은 앱 헤더, 현재 모듈, 언어 선택, 본문 바로가기.
- `src/components/ModuleIcon.jsx`: 외부 패키지 없는 공통 SVG 아이콘.
- `src/components/Sidebar.jsx`: URL 기반 링크, 현재 위치 표시.
- `src/components/MobileTabBar.jsx`: 대시보드·여행·캘린더·앨범 직접 이동 및 더보기.
- `src/components/MoreActions.jsx`: 키보드·터치 공용 보조 작업 disclosure.
- `src/modules/Dashboard.jsx`: 바로가기, 오늘의 실제 일정 수, 최근 게시글.
- `src/modules/Travel.jsx`: 여행 카드 열기 중심 구성과 보조 작업 메뉴.
- `src/modules/board/BoardList.jsx`: 검색을 목록 앞으로 이동하고 관리/휴지통 작업을 메뉴로 분리.

## 유지할 계약

- Router URL, 기존 localStorage 키, IndexedDB 형식 유지.
- 일반 테마와 한국어·영어 모두 지원. 새 문구는 translations 구조에 추가.
- 상태는 색상 외에도 텍스트·현재 위치·선택 속성으로 제공.
- 본문·목록의 DOM 순서와 화면 순서를 일치시키고 포커스 윤곽 유지.
- 모바일 더보기는 외부 클릭·Escape·탭 이동으로 닫으며 Escape 시 트리거로 포커스 복귀.
- `prefers-reduced-motion` 사용자의 모션 감소 설정 존중.

## 검증

- 기존 `lint`, `test:run`, `build` 스크립트 사용.
- Chrome에서 다크/일반 테마와 한국어/영어 전환, 여행 추가 작업, 모바일 더보기 확인.
- 모바일 390px 및 320px 너비에서 메뉴·캘린더·앨범의 가로 넘침 확인.
- 기존 데이터의 생성·수정·삭제나 백업 복원을 시각 검토 목적으로 수행하지 않음.
