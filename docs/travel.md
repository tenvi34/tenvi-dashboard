# Travel 구현 안내

## 기존 구조 분석

- 현재 실행 코드는 React 19 + Vite 8, JavaScript/JSX 기반이다. TypeScript는 사용하지 않는다.
- `src/main.jsx`의 `BrowserRouter` → `AppRouter` → `AppLayout` → `views` → `modules` 구조다. AGENTS.md의 state 기반 이동 설명보다 실제 코드가 앞서 있으므로 현재 React Router 7 구조를 유지했다.
- `App.jsx`가 언어, 테마, 시작 모듈을 관리하고 `Outlet context`로 전달한다. Travel 상태는 모듈 안에서 관리한다.
- 사이드바와 모바일 더보기는 `AppLayout.jsx`의 모듈 목록을 공유한다. Travel을 두 목록에 추가했다.
- 스타일은 `src/styles`의 공통 테마 토큰과 모듈별 CSS로 구성된다. Travel도 기존 dark/standard 테마 토큰을 사용한다.
- Tasks/Notes/Board 등은 local/remote repository, Calendar는 localStorage/API 흐름을 사용한다. Map은 기존 사진·컬렉션 IndexedDB와 API 저장 흐름을 갖고 있다.
- `backend/Tenvi.Backend`에는 ASP.NET API 및 SQLite store 구현이 이미 있다. Travel에는 백엔드를 연결하지 않았다.
- 설치되어 있던 Leaflet, react-leaflet, React Router와 공통 `placeSearchService.js`를 재사용했다. 새 의존성이나 package manager 파일 변경은 없다.

## 진입과 기능

사이드바의 **여행**, 모바일 **더보기 → 여행**, 또는 `/travel`에서 시작한다. 상세 URL은 `/travel/:tripId`다.

- 여행 이름만으로 생성, 지역과 날짜의 선택 입력, 목록/열기/수정/삭제/복제.
- 개요, 장소, 일정, 지도, 여행 정보 탭.
- 장소 CRUD, 카테고리, 주소·지역·메모, 3단계 우선순위, 보류/해제, 일정 포함 여부 표시 및 검색·필터.
- 기존 Nominatim 검색 결과에서 이름·주소·좌표·provider 식별자 자동 입력. 직접 장소 등록 및 지도 클릭으로 위치 지정 가능. 좌표/Place ID 입력란은 없다.
- 날짜 없는 DAY 계획, DAY 추가, 시간·장소 없는 빈 일정, 시작 시간·체류 시간·메모, 장소 연결/해제/변경.
- 위·아래 버튼으로 순서 변경, DAY 이동, 일정 삭제. 일정 삭제는 장소를 삭제하지 않는다.
- 장소 삭제 시 일정 슬롯/메모는 유지하고 해당 장소 참조, 후보 그룹 참조, 숙소 참조만 정리한다.
- 여행 날짜를 줄이거나 지워도 기존 일정 DAY는 보존한다. 기간 밖 DAY는 안내 문구로 표시한다.
- 숙소는 장소 보관함의 `lodging` 장소를 참조한다. 여행 정보에서 등록/선택/해제할 수 있고, 개요에 별도로 표시한다.
- 실제 좌표 기반 지도 마커, 전체 범위 맞춤, 일정 포함/미포함·종류·보류·DAY 필터. 위치 없는 장소 수와 지도 연결 오류를 표시한다.
- 여행별 JSON 백업/복원. 복원은 항상 새 여행을 생성하며 기존 여행을 덮어쓰지 않는다.

기존 항목은 입력란에서 벗어날 때 자동 저장된다. 생성에는 추가 버튼을 사용한다. 순서·DAY·숙소·보류 변경은 즉시 저장한다. 미저장 편집 입력은 현재 세션에 보존되어 편집기를 다시 열면 복구된다. 브라우저 새로고침/종료 시 미저장 입력이 있으면 기본 이탈 경고를 요청한다. 새 항목을 아직 추가하지 않은 입력은 세션 복구 대상이 아니다.

## 저장 방식과 모델

`UI → useTravel → travelRepository → IndexedDB`로 분리했다. `travelRepository`의 `list`, `add`, `update`, `remove` 계약을 향후 API 구현으로 교체할 수 있다.

- DB: `tenvi-travel`, 버전 1.
- Object store: `trips`, key path: `trip.id`.
- 여행 하나를 묶음으로 저장하여 장소/일정/숙소 참조를 같은 트랜잭션에서 변경한다. 모델은 아래처럼 분리하되 1차 저장의 원자성을 위해 한 레코드에 포함한다.
- UI는 요청 성공이 아니라 트랜잭션 완료 후 확정 데이터를 반영한다. 기존 항목 편집은 변경된 필드만 최신 레코드에 적용한다. 같은 필드를 여러 탭에서 수정하면 마지막 저장이 반영된다. 다른 탭의 변경을 실시간 구독하는 기능은 없다.
- 기존 localStorage 키, Map 사진/컬렉션 DB, 백엔드 저장 모드는 변경하지 않았다.

| 모델 | 주요 필드와 참조 |
| --- | --- |
| Trip | `id`, `name`, `region`, `startDate`, `endDate`, `status`, `memo` |
| Place | `id`, `tripId`, `name`, `category`, `priority`, `onHold`, `region`, `address`, `memo`, `latitude`, `longitude`, `provider`, `providerPlaceId` |
| Schedule | `id`, `tripId`, `day`, `order`, `title`, `startTime`, `durationMinutes`, `memo`, `placeId`, `candidateGroupId` |
| TravelSettings | `tripId`, `lodgingPlaceId`, `dayCount` |
| CandidateGroup | `id`, `tripId`, `name`, `placeIds` |

`placeId`, `candidateGroupId`, `lodgingPlaceId`는 `null`을 허용한다. 일정에 장소 상세 정보를 복사하지 않는다. 후보 그룹은 저장/검증/복제/복원까지 지원하며 편집 UX는 TODO로 남겼다. `getTravelRouteStops()`는 숙소 → 당일 장소 → 숙소 경유지를 제공하는 향후 경로 연결 지점이다. 실제 이동 시간이나 경로를 생성하지 않는다.

JSON 형식은 `{ format: 'tenvi.travel', version: 1, data: ... }`이다. 크기(20MB), 스키마 버전, 실제 날짜, 시간, 좌표 범위, ID 중복, 여행 소유권, 장소/숙소/후보 참조를 저장 전에 검증한다. 복제/복원 시 모든 엔티티 ID와 참조를 재발급한다. 최대 DAY는 3,660, 여행별 장소는 10,000개, 일정은 20,000개다.

Travel 백업은 **Travel 화면의 JSON 백업**을 사용한다. 기존 Settings 통합 백업에 Travel을 추가하지 않았다. 브라우저 데이터를 삭제하면 Travel 데이터도 사라지므로 중요한 계획은 파일로 보관해야 한다.

## 지도 서비스와 환경변수

장소 추가/수정 화면 위쪽의 **복사한 주소 붙여넣기**에 주소 텍스트를 붙여넣으면 주소 전체와 추정 지역이 즉시 채워진다. 직접 타이핑한 경우 **지역·주소 채우기** 버튼을 사용한다. 예를 들어 `5 Chome-52-15 Nakano, Nakano City, Tokyo 164-0001 일본`의 추정 지역은 `Nakano City, Tokyo`다. 추출은 브라우저 내부 문자열 처리만 사용하며 외부 API를 호출하지 않는다. 인식하지 못한 지역은 기존 값을 유지한다. 장소명/좌표는 변경하지 않으며, 주소만 붙여넣어 지도 핀이 생성되거나 이동하지 않는다. 채워진 필드는 직접 수정할 수 있다.

장소 편집기에 **Google 지도에서 검색**, 장소 카드와 지도 팝업에 **Google 지도에서 보기** 링크를 제공한다. Google Maps URL로 새 탭을 열며 API 호출·키·결제 계정은 사용하지 않는다. 검색어에는 장소 이름과 주소 또는 지역을 포함한다. 외부 검색 결과는 자동으로 가져오지 않으며 사용자가 이름·주소를 직접 입력해 저장한다. TENVI의 무료 위치 검색과 지도 클릭 지정은 그대로 사용할 수 있다.

Google Maps/Places/Routes는 연결하지 않았다. AGENTS.md의 유료/결제 계정 API 제한에 따라 기존 OpenStreetMap 타일과 Nominatim 검색만 재사용한다. Travel에 필요한 새 환경변수는 없으며 `.env`를 읽거나 변경하지 않았다. Google용 가짜 키나 사용되지 않는 환경변수도 추가하지 않았다.

Nominatim은 사용자 검색 버튼으로만 호출하며 자동완성을 사용하지 않는다. Map/Travel 공유 요청 큐, 최소 1초 간격, 메모리 캐시, 15초 timeout을 적용한다. 검색 실패 시 수동 등록을 계속 사용할 수 있다. 공개 서비스 제한은 사용자 한 명만이 아니라 앱 전체에 적용되므로 다중 사용자 배포 전에는 별도 제공자/서버 운영 방식을 검토해야 한다. 출처 표시와 정책 링크를 검색 UI에 제공한다.

- [Nominatim 공식 사용 정책](https://operations.osmfoundation.org/policies/nominatim/)
- [React Leaflet 지도 인스턴스와 hooks 문서](https://react-leaflet.js.org/docs/api-map/)

향후 Google을 도입할 때는 별도 승인을 받고 provider 계약과 키 제한/서버 호출 방식을 결정해야 한다. 현재 버전은 Google Place ID 대신 선택한 provider의 ID를 저장한다.

## 파일 변경

새 파일:

- `src/views/TravelView.jsx`
- `src/modules/Travel.jsx`, `src/modules/Travel.css`
- `src/modules/travel/TravelFields.jsx`, `TravelPlaces.jsx`, `TravelSchedule.jsx`, `TravelMap.jsx`
- `src/modules/travel/travelLogic.js`, `travelRepository.js`, `useTravel.js`, `travelDrafts.js`
- `src/modules/travel/travelLogic.test.js`, `travelRepository.test.js`, `travelDrafts.test.js`
- `src/i18n/travelTranslations.js`
- `docs/travel.md`

기존 파일 수정:

- `src/router/routes.js`, `src/router/AppRouter.jsx`: Travel 경로와 활성 모듈 연결.
- `src/layouts/AppLayout.jsx`: 사이드바/모바일 더보기 진입.
- `src/i18n/translations.js`: 기존 한영 구조에 Travel 문구 연결.
- `src/services/placeSearchService.js`, `placeSearchService.test.js`: 공용 검색 동시 호출 간격, 실패 후 재시도, timeout, 좌표 범위 검증.

`App.jsx`, Tasks, Notes, Board, Calendar, Map 모듈 및 백엔드는 수정하지 않았다.

## 검증 및 남은 확인

기존 스크립트만 사용했다. Windows PowerShell의 npm.ps1 실행 정책 때문에 `npm.cmd`로 실행했다.

- `npm.cmd run test:run`: 전체 테스트 252개 통과. Travel 모델/참조/복제/복원/날짜/순서/필터/라우트/번역, 저장 트랜잭션 중단·실패, 세션 입력 복구, 공유 검색 큐 포함.
- Repository 테스트는 IndexedDB 이벤트를 제어하는 단위 테스트다. 실제 브라우저의 IndexedDB 동작을 대체하는 E2E 검증은 아니다.
- `npm.cmd run lint`: 통과.
- `npm.cmd run build`: 통과. 번들 500KB 초과 경고가 있어 추후 라우트 단위 로딩을 검토할 수 있다.
- 현재 연결 가능한 Browser가 없어 실제 화면, 모바일 터치, 지도 외부 통신, 브라우저 새로고침 후 저장 복원은 자동 확인하지 못했다.

직접 확인할 시나리오:

1. `/travel`에서 이름만으로 여행 두 개 생성 → 상세 URL 직접 열기 → 새로고침 후 데이터 유지 확인.
2. 지역/기간 설정 → DAY별 날짜 확인 → 기간 축소/날짜 삭제 후 기존 일정 보존 확인.
3. 검색 결과로 장소 추가 → 주소/위치 자동 입력 → 직접 등록한 장소를 지도 클릭으로 위치 지정.
4. 장소 이름/우선순위/메모 수정 → 포커스 이동 후 저장 표시 → 보류/해제 및 필터 확인.
5. 장소·시간 없는 일정 생성 → 장소 연결 → 위/아래 순서 변경 → DAY 이동 → 장소 해제/변경.
6. 일정 삭제 후 보관함 장소 유지 확인. 장소 삭제 후 슬롯/메모 유지, 숙소·후보 참조 정리 확인.
7. 숙소 없이 계획 → 여행 정보에서 숙소 등록 → 숙소 변경/해제 → 개요와 지도 확인.
8. 복제본만 수정/삭제하고 원본 및 다른 여행이 유지되는지 확인.
9. JSON 백업 → 가져오기 → 새 ID 여행 생성 확인. 잘못된 JSON/없는 장소 참조/다른 형식 가져오기 시 기존 데이터 유지 확인.
10. 저장소 차단/용량 오류 시 성공 표시가 나오지 않는지 확인. 실패한 편집기를 닫았다 열어 입력 복구/재저장 확인.
11. 오프라인에서 기존 여행 CRUD 및 수동 장소 등록 확인. 검색/지도 오류가 다른 기능을 막지 않는지 확인.
12. 한국어/영어, dark/standard 테마, 좁은 모바일 화면과 더보기 메뉴, 키보드 포커스 확인.
13. 기존 Tasks/Notes/Board/Calendar/Map 저장 및 이동 흐름 회귀 확인.

## 미구현과 다음 단계

- 후보 그룹의 사용자 편집 UX, drag & drop, 실제 도보/대중교통 경로·이동 시간, Google provider는 미구현이다.
- 서버 DB, 로그인/계정, 클라우드 동기화, AI 일정 생성, 비용 관리, 게임 요소는 이번 범위에서 제외했다.
- 다음 단계는 브라우저에서 위 시나리오 검증, 실제 IndexedDB E2E 테스트, 후보 그룹 UX 순서가 적절하다. 다중 사용자 서비스로 확대할 때 지도 제공자 정책과 백엔드 API 계약을 먼저 정해야 한다.
