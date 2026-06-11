# TENVI 함수 레퍼런스

이 문서는 현재 `src` 기준으로 실제 존재하는 주요 함수와 컴포넌트를 정리한다. 테스트 전용 helper, 단순 상수, 번역 객체의 동적 문자열 함수 목록은 필요한 경우 별도 항목으로 묶었다.

## `src/App.jsx`

### `App`
- 파일 경로: `src/App.jsx`
- 역할: TENVI 전체 shell, 전역 설정, 모듈 전환, PC Sidebar와 모바일 탭바 연결.
- 주요 파라미터: 없음.
- 반환값: 앱 전체 JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useMemo`, `isSupportedLanguage`, `translations[...]`.
- 사용 위치: `src/main.jsx`.
- 주의사항: `activeModule`은 React state 기반 라우팅이므로 React Router 도입 시 기존 localStorage 시작 모듈 흐름 보존 필요.

## `src/components/Sidebar.jsx`

### `Sidebar`
- 파일 경로: `src/components/Sidebar.jsx`
- 역할: PC 좌측 모듈 내비게이션 렌더링.
- 주요 파라미터: `activeModule`, `modules`, `onModuleChange`, `t`.
- 반환값: Sidebar JSX.
- 내부에서 호출하는 주요 함수: `modules.map`, `onModuleChange`.
- 사용 위치: `App`.
- 주의사항: 모바일에서는 CSS로 숨기고 `MobileTabBar`가 같은 `activeModule`을 공유한다.

## `src/components/MobileTabBar.jsx`

### `MobileTabBar`
- 파일 경로: `src/components/MobileTabBar.jsx`
- 역할: 모바일 하단 탭바와 더보기 메뉴 렌더링.
- 주요 파라미터: `activeModule`, `modules`, `moreModules`, `onModuleChange`, `t`.
- 반환값: 모바일 탭바 JSX.
- 내부에서 호출하는 주요 함수: `useState`, `modules.map`, `moreModules.map`, `handleModuleChange`.
- 사용 위치: `App`.
- 주의사항: UI 열림 상태만 내부에서 관리하고 실제 모듈 이동은 `App`의 `activeModule`을 사용한다.

### `handleModuleChange`
- 파일 경로: `src/components/MobileTabBar.jsx`
- 역할: 모바일 탭 선택 후 모듈 변경과 더보기 메뉴 닫기.
- 주요 파라미터: `moduleId`.
- 반환값: 없음.
- 내부에서 호출하는 주요 함수: `onModuleChange`, `setIsMoreOpen`.
- 사용 위치: `MobileTabBar` 내부 버튼.
- 주의사항: 더보기 항목 선택 후 메뉴를 닫아 모바일 화면 점유를 줄인다.

## `src/modules/Map.jsx`

### `createViewportRequest`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 지도 이동 요청 객체 생성.
- 주요 파라미터: `type`, `target`.
- 반환값: `{ latitude, longitude, recordId, requestId, type }`.
- 내부에서 호출하는 주요 함수: `Date.now`, `Math.random`.
- 사용 위치: Map 지도 이동, 저장 후 포커스, 전체 보기 요청.
- 주의사항: `requestId`로 같은 좌표 재요청도 구분한다.

### `getLocationSourceLabel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 위치 출처 값을 번역 라벨로 변환.
- 주요 파라미터: `source`, `t`.
- 반환값: 위치 출처 라벨 문자열.
- 내부에서 호출하는 주요 함수: `normalizeLocationSource`.
- 사용 위치: 지도 팝업, 상세/편집 패널.
- 주의사항: `search` 외 값은 `manual` 또는 `exif`로 정규화된다.

### `getCollectionName`
- 파일 경로: `src/modules/Map.jsx`
- 역할: collection id에 대응하는 컬렉션 이름 조회.
- 주요 파라미터: `collectionId`, `collections`, `t`.
- 반환값: 컬렉션 이름 또는 미분류 라벨.
- 내부에서 호출하는 주요 함수: `Array.find`.
- 사용 위치: 상세 패널, 모바일 preview card.
- 주의사항: 존재하지 않는 id는 미분류로 표시한다.

### `getBulkItemStatusLabel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 업로드 item status를 번역 라벨로 변환.
- 주요 파라미터: `status`, `t`.
- 반환값: 상태 라벨 문자열.
- 내부에서 호출하는 주요 함수: 없음.
- 사용 위치: `BulkUploadList`.
- 주의사항: 알 수 없는 상태는 실패로 표시한다.

### `getMapSummaryLocationSource`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 필터 요약용 위치 출처 키 보정.
- 주요 파라미터: `source`.
- 반환값: `exif`, `manual`, `search`, `unknown`.
- 내부에서 호출하는 주요 함수: `Array.includes`.
- 사용 위치: `createMapFilterSummary`.
- 주의사항: 요약 전용 helper이며 저장 데이터는 변경하지 않는다.

### `createMapFilterSummary`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 현재 필터 결과의 사진 수와 위치 출처별 개수 집계.
- 주요 파라미터: `records`, `selectedFilter`, `collections`, `t`.
- 반환값: `{ filterName, photoCount, sourceCounts }`.
- 내부에서 호출하는 주요 함수: `getMapSummaryLocationSource`, `Array.reduce`, `Array.find`.
- 사용 위치: `Map`의 `filterSummary`.
- 주의사항: UI 표시용 집계다.

### `MapViewportController`
- 파일 경로: `src/modules/Map.jsx`
- 역할: Leaflet 지도 이동, fit bounds, 선택 기록 포커스 제어.
- 주요 파라미터: `layoutKey`, `records`, `request`, `shouldFitBounds`, `target`.
- 반환값: `null`.
- 내부에서 호출하는 주요 함수: `useMap`, `useEffect`, `L.latLngBounds`, `map.fitBounds`, `map.flyTo`, `map.setView`.
- 사용 위치: `MapContainer` 내부.
- 주의사항: 숨김 지도 크기 측정 방어와 중복 이동 방지가 포함된다.

### `ManualLocationPicker`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 지도 클릭 좌표를 상위 핸들러로 전달.
- 주요 파라미터: `disabled`, `onPickLocation`.
- 반환값: `null`.
- 내부에서 호출하는 주요 함수: `useMapEvents`.
- 사용 위치: `MapContainer` 내부.
- 주의사항: draft/edit/bulk 위치 지정 가능 상태일 때만 좌표를 반영한다.

### `MapResizeController`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 탭/모바일 보기 전환 후 Leaflet 크기 재계산.
- 주요 파라미터: `watchValue`.
- 반환값: `null`.
- 내부에서 호출하는 주요 함수: `useMap`, `useEffect`, `map.invalidateSize`.
- 사용 위치: `MapContainer` 내부.
- 주의사항: 숨겨졌던 지도가 다시 보일 때 타일 깨짐을 줄인다.

### `PhotoRecordMarker`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 저장된 사진 위치 마커와 팝업 렌더링.
- 주요 파라미터: `icon`, `isActive`, `onSelectRecord`, `record`, `t`.
- 반환값: Leaflet `Marker` JSX.
- 내부에서 호출하는 주요 함수: `useRef`, `useEffect`, `getLocationSourceLabel`.
- 사용 위치: `Map`의 저장 사진 마커 목록.
- 주의사항: active 상태가 되면 팝업을 자동으로 연다.

### `PlaceSearchPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 장소 검색 입력, scope 선택, 결과 목록 렌더링.
- 주요 파라미터: `disabled`, `language`, `onSelectPlace`, `t`.
- 반환값: 장소 검색 panel JSX.
- 내부에서 호출하는 주요 함수: `useState`, `searchPlaces`, `handleSearch`, `handleSubmit`.
- 사용 위치: 사진 등록/편집/업로드 위치 지정 UI.
- 주의사항: Nominatim 검색 실패 시 UI 에러 메시지만 표시한다.

### `PhotoCollectionPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 컬렉션 생성/수정 폼과 컬렉션 목록 렌더링.
- 주요 파라미터: `collectionDraft`, `collections`, `editingCollectionId`, `getCollectionRecordCount`, handler props, `t`.
- 반환값: 컬렉션 관리 panel JSX.
- 내부에서 호출하는 주요 함수: `collections.map`, `getCollectionRecordCount`.
- 사용 위치: `MapCollectionManagerPanel`.
- 주의사항: 실제 저장/삭제 로직은 `useMapCollectionController`가 담당한다.

### `BulkUploadList`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 업로드 item 목록 렌더링.
- 주요 파라미터: `emptyMessage`, `items`, `onToggleItem`, `selectedIds`, `showSelection`, `t`, `title`.
- 반환값: bulk 목록 JSX.
- 내부에서 호출하는 주요 함수: `items.slice`, `getBulkItemStatusLabel`, `selectedIds.includes`.
- 사용 위치: `BulkUploadPanel`.
- 주의사항: 긴 목록은 상위 20개만 보여주고 나머지 개수를 표시한다.

### `BulkUploadPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: bulk 분석 결과, 위치 없는 사진 후처리, 저장 후보 목록 렌더링.
- 주요 파라미터: `bulkUpload`, `bulkAssignedLocation`, `collections`, bulk handler props, `selectedMissingLocationItemIds`, `t`.
- 반환값: bulk 업로드 panel JSX.
- 내부에서 호출하는 주요 함수: `createBulkUploadSummary`, `getBulkPhotoSaveCandidates`, `getBulkMissingLocationItems`, `getBulkLocationAssignableItems`.
- 사용 위치: `MapUploadPanel`.
- 주의사항: 상태 변경 로직은 `useMapBulkUploadController`가 담당한다.

### `PhotoDraftPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 단일 사진 등록 draft 입력 폼 렌더링.
- 주요 파라미터: `collections`, `draft`, `isSaving`, handler props, `t`.
- 반환값: draft form JSX.
- 내부에서 호출하는 주요 함수: `isPhotoDraftReadyToSave`, `PhotoPreviewButton`, `PhotoCollectionSelect`, `PlaceSearchPanel`.
- 사용 위치: `MapUploadPanel`.
- 주의사항: 위치가 없는 사진은 저장 버튼이 비활성화된다.

### `PhotoEditPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 저장된 사진 record 편집 폼 렌더링.
- 주요 파라미터: `collections`, `editDraft`, `isUpdating`, handler props, `record`, `t`.
- 반환값: edit form JSX.
- 내부에서 호출하는 주요 함수: `isEditDraftReadyToSave`, `PhotoPreviewButton`, `PhotoCollectionSelect`, `PlaceSearchPanel`.
- 사용 위치: `Map` 상세 column.
- 주의사항: 편집 draft는 저장 전까지 기존 record를 직접 변경하지 않는다.

### `PhotoRecordDetail`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 선택된 사진 상세 정보와 수정/삭제 버튼 렌더링.
- 주요 파라미터: `collections`, `filterSummary`, `onDeleteRecord`, `onOpenPhoto`, `onStartEdit`, `record`, `t`.
- 반환값: 상세 panel JSX.
- 내부에서 호출하는 주요 함수: `PhotoPreviewButton`, `getCollectionName`, `getLocationSourceLabel`.
- 사용 위치: `Map` 상세 column.
- 주의사항: 선택된 record가 없으면 필터 요약과 빈 상태를 표시한다.

### `MapExplorePanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 탐색 모드의 컬렉션 필터, 검색/위치 필터, 사진 목록 렌더링.
- 주요 파라미터: 필터 상태, `collections`, `filteredRecords`, handler props, `t`.
- 반환값: 탐색 control panel JSX.
- 내부에서 호출하는 주요 함수: `useState`, `PhotoRecordList`.
- 사용 위치: `Map`의 탐색 모드.
- 주의사항: 모바일/PC 표시 방식은 CSS와 상위 layout state가 결정한다.

### `MapUploadPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 사진 선택 버튼, 단일 업로드 폼, bulk 결과 panel 렌더링.
- 주요 파라미터: `bulkUpload`, `draft`, `isAddingPhoto`, handler props, `photoInputRef`, `t`.
- 반환값: 업로드 mode JSX.
- 내부에서 호출하는 주요 함수: `PhotoDraftPanel`, `BulkUploadPanel`.
- 사용 위치: `Map`의 업로드 모드.
- 주의사항: 단일/bulk 분기는 선택된 파일 개수와 `bulkUpload.status`가 결정한다.

### `MapCollectionManagerPanel`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 컬렉션 관리 모드 wrapper 렌더링.
- 주요 파라미터: `collectionDraft`, `collections`, `editingCollectionId`, handler props, `t`.
- 반환값: 컬렉션 관리 mode JSX.
- 내부에서 호출하는 주요 함수: `PhotoCollectionPanel`.
- 사용 위치: `Map`의 컬렉션 관리 모드.
- 주의사항: CRUD 로직은 `useMapCollectionController`에 있다.

### `Map`
- 파일 경로: `src/modules/Map.jsx`
- 역할: 사진 위치 지도 모듈의 상태 조합, IndexedDB 로드, 지도/업로드/컬렉션 모드 통합.
- 주요 파라미터: `t`.
- 반환값: Map module JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useMemo`, `useMapBulkUploadController`, `useMapCollectionController`, `getPhotoRecords`, `getPhotoCollections`, `createPhotoRecord`, `updatePhotoRecord`, `deletePhotoRecord`.
- 사용 위치: `App`.
- 주의사항: IndexedDB schema, record 저장 구조, localStorage key와 무관한 UI state만 내부에서 관리해야 한다.

## `src/modules/map/MapPhotoPreview.jsx`

### `PhotoPreview`
- 파일 경로: `src/modules/map/MapPhotoPreview.jsx`
- 역할: Blob을 object URL로 바꿔 이미지 렌더링.
- 주요 파라미터: `alt`, `blob`, `className`.
- 반환값: `img` JSX 또는 `null`.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `URL.createObjectURL`, `URL.revokeObjectURL`.
- 사용 위치: 기록 목록, 상세/편집/모바일 preview, lightbox.
- 주의사항: cleanup에서 object URL을 반드시 해제한다.

### `PhotoPreviewButton`
- 파일 경로: `src/modules/map/MapPhotoPreview.jsx`
- 역할: 사진 클릭 시 전체 보기 modal을 여는 버튼형 preview.
- 주요 파라미터: `alt`, `blob`, `className`, `onOpen`, `t`.
- 반환값: button JSX 또는 preview image.
- 내부에서 호출하는 주요 함수: `PhotoPreview`, `onOpen`.
- 사용 위치: draft, edit, detail.
- 주의사항: Blob이 없으면 버튼 없이 preview만 반환한다.

### `PhotoLightbox`
- 파일 경로: `src/modules/map/MapPhotoPreview.jsx`
- 역할: 전체 사진 보기 dialog 렌더링.
- 주요 파라미터: `photo`, `onClose`, `t`.
- 반환값: modal JSX 또는 `null`.
- 내부에서 호출하는 주요 함수: `PhotoPreview`, `onClose`.
- 사용 위치: `Map`.
- 주의사항: overlay 클릭은 닫기, body 클릭은 전파 차단한다.

## `src/modules/map/MapRecordList.jsx`

### `PhotoRecordList`
- 파일 경로: `src/modules/map/MapRecordList.jsx`
- 역할: 사진 기록 목록 렌더링.
- 주요 파라미터: `activeRecordId`, `emptyMessage`, `onSelectRecord`, `records`, `t`.
- 반환값: 목록 panel JSX.
- 내부에서 호출하는 주요 함수: `records.map`, `PhotoPreview`.
- 사용 위치: `MapExplorePanel`.
- 주의사항: 목록 선택 이후 상세 이동 여부는 상위 handler가 결정한다.

## `src/modules/map/MapCollectionSelect.jsx`

### `PhotoCollectionSelect`
- 파일 경로: `src/modules/map/MapCollectionSelect.jsx`
- 역할: 사진 record에 연결할 컬렉션 select 렌더링.
- 주요 파라미터: `collections`, `onChange`, `t`, `value`.
- 반환값: label/select JSX.
- 내부에서 호출하는 주요 함수: `collections.map`, `onChange`.
- 사용 위치: `PhotoDraftPanel`, `PhotoEditPanel`, `BulkUploadPanel`.
- 주의사항: 빈 값은 `null`로 전달한다.

## `src/modules/map/MapNavigation.jsx`

### `MapModeTabs`
- 파일 경로: `src/modules/map/MapNavigation.jsx`
- 역할: 탐색/사진 업로드/컬렉션 관리 탭 렌더링.
- 주요 파라미터: `activeMode`, `onChangeMode`, `t`.
- 반환값: tablist JSX.
- 내부에서 호출하는 주요 함수: `onChangeMode`.
- 사용 위치: `Map`.
- 주의사항: 라우팅 없이 `Map` 내부 UI state만 바꾼다.

### `MobileMapViewTabs`
- 파일 경로: `src/modules/map/MapNavigation.jsx`
- 역할: 모바일 지도/목록/상세 보기 전환 탭 렌더링.
- 주요 파라미터: `activeView`, `onChangeView`, `t`.
- 반환값: 모바일 tablist JSX.
- 내부에서 호출하는 주요 함수: `views.map`, `onChangeView`.
- 사용 위치: `Map`.
- 주의사항: PC 3패널 구조에는 영향을 주지 않는다.

### `MobileMapPreviewCard`
- 파일 경로: `src/modules/map/MapNavigation.jsx`
- 역할: 모바일 지도 보기에서 선택 사진 preview card 렌더링.
- 주요 파라미터: `collectionName`, `onOpenDetail`, `record`, `t`.
- 반환값: preview button JSX 또는 `null`.
- 내부에서 호출하는 주요 함수: `PhotoPreview`, `onOpenDetail`.
- 사용 위치: `Map`의 지도 panel.
- 주의사항: 컬렉션 이름 계산은 상위에서 수행해 순수 UI 컴포넌트로 유지한다.

### `MobileMapEmptyCard`
- 파일 경로: `src/modules/map/MapNavigation.jsx`
- 역할: 모바일 지도 보기 빈 상태 안내 렌더링.
- 주요 파라미터: `onOpenList`, `t`.
- 반환값: 안내 card JSX.
- 내부에서 호출하는 주요 함수: `onOpenList`.
- 사용 위치: `Map`의 지도 panel.
- 주의사항: 사진이 없을 때 목록 보기로 이동할 수 있게 한다.

## `src/modules/map/useMapBulkUploadController.js`

### `createBulkUploadId`
- 파일 경로: `src/modules/map/useMapBulkUploadController.js`
- 역할: bulk 분석 item id 생성.
- 주요 파라미터: `file`, `index`.
- 반환값: 파일명/수정시각/크기/index 기반 문자열.
- 내부에서 호출하는 주요 함수: 없음.
- 사용 위치: `analyzeBulkPhotoFiles`.
- 주의사항: 같은 파일 묶음 내 식별용이며 영구 id가 아니다.

### `createInitialBulkUploadState`
- 파일 경로: `src/modules/map/useMapBulkUploadController.js`
- 역할: bulk 업로드 초기 상태 객체 생성.
- 주요 파라미터: 없음.
- 반환값: bulk upload state.
- 내부에서 호출하는 주요 함수: 없음.
- 사용 위치: `useMapBulkUploadController`, reset/save 완료 후 초기화.
- 주의사항: 상태 객체 재사용을 피하려고 함수로 만든다.

### `useMapBulkUploadController`
- 파일 경로: `src/modules/map/useMapBulkUploadController.js`
- 역할: bulk 업로드 분석, 취소, 위치 보정, 저장 상태와 handler 관리.
- 주요 파라미터: `{ createViewportRequest, setActiveRecordId, setError, setRecords, setStatusMessage, setViewportRequest, t }`.
- 반환값: bulk 상태와 handler 묶음.
- 내부에서 호출하는 주요 함수: `useRef`, `useState`, `readPhotoLocation`, `createPreviewImageBlob`, `createBulkPhotoAnalysisItem`, `applyLocationToBulkItems`, `createBulkPhotoRecordInputs`, `createPhotoRecords`, `getPhotoRecords`.
- 사용 위치: `Map`.
- 주의사항: IndexedDB 저장 구조는 바꾸지 않고, 저장 후 최신 records를 다시 조회한다.

## `src/modules/map/useMapCollectionController.js`

### `useMapCollectionController`
- 파일 경로: `src/modules/map/useMapCollectionController.js`
- 역할: 컬렉션 draft, 생성, 수정, 삭제 흐름 관리.
- 주요 파라미터: `{ getCollectionRecordCount, setCollections, setError, setRecords, setSelectedCollectionFilter, setStatusMessage, t }`.
- 반환값: 컬렉션 draft 상태와 handler 묶음.
- 내부에서 호출하는 주요 함수: `useState`, `normalizePhotoCollectionInput`, `isPhotoCollectionInputValid`, `createPhotoCollection`, `updatePhotoCollection`, `deletePhotoCollection`.
- 사용 위치: `Map`.
- 주의사항: 컬렉션 삭제 시 관련 record의 `collectionId`를 `null`로 보정하고, 선택 필터가 삭제 대상이면 미분류 필터로 이동한다.

## `src/modules/mapLogic.js`

### 주요 함수
- 파일 경로: `src/modules/mapLogic.js`
- 함수명: `normalizeLocationSource`, `normalizePhotoRecordCollectionId`, `normalizePhotoCollectionInput`, `isPhotoCollectionInputValid`, `filterPhotoRecordsByCollection`, `normalizeLocationSourceForFilter`, `filterPhotoRecordsBySearchAndLocation`, `formatExifDate`, `normalizePhotoLocation`, `createManualLocation`, `createPhotoDraft`, `applySearchLocationToDraft`, `applyManualLocationToDraft`, `isPhotoDraftReadyToSave`, `createEditDraft`, `isEditDraftReadyToSave`, `createPhotoRecordUpdatePatch`, `createPhotoRecordInput`, `readPhotoLocation`.
- 역할: Map record/collection 입력 정규화, 검색/필터, EXIF 위치 읽기, draft 생성과 저장 input 생성.
- 주요 파라미터: 함수별 record, collection, draft, file, location, filter 값.
- 반환값: 정규화된 값, draft, record input, Promise location 등.
- 내부에서 호출하는 주요 함수: `exifr.parse`, `normalizeLocationSource`, `createManualLocation`, `isValidCoordinate`.
- 사용 위치: `Map`, `useMapCollectionController`, tests.
- 주의사항: IndexedDB에 저장되는 record shape와 직접 연결되므로 필드명 변경 금지.

## `src/modules/bulkPhotoUploadLogic.js`

### 주요 함수
- 파일 경로: `src/modules/bulkPhotoUploadLogic.js`
- 함수명: `normalizeBulkUploadItemStatus`, `createBulkPhotoAnalysisItem`, `getBulkMissingLocationItems`, `getBulkLocationAssignableItems`, `toggleBulkMissingLocationSelection`, `selectAllBulkMissingLocationItems`, `selectAllBulkLocationAssignableItems`, `clearBulkMissingLocationSelection`, `applyLocationToBulkItems`, `createBulkUploadSummary`, `getBulkPhotoSaveCandidates`, `createBulkPhotoRecordInput`, `createBulkPhotoRecordInputs`, `createBulkPhotoSaveResult`.
- 역할: bulk 업로드 item 상태 정규화, 위치 적용, 저장 후보 생성, 저장 결과 집계.
- 주요 파라미터: `items`, `item`, `selectedIds`, `location`, `collectionId`, `results`.
- 반환값: item, item 배열, record input 배열, summary/result 객체.
- 내부에서 호출하는 주요 함수: `normalizeBulkUploadItemStatus`, `getBulkPhotoSaveCandidates`.
- 사용 위치: `Map`, `useMapBulkUploadController`, tests.
- 주의사항: `previewImage.blob`이 없는 item은 저장 후보에서 제외된다.

## `src/modules/Calendar.jsx`, `src/modules/calendarLogic.js`

### `Calendar`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: Calendar 모듈 UI, 월 이동, 날짜 선택, 일정 추가/삭제, task 마감 표시.
- 주요 파라미터: `t`.
- 반환값: Calendar JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useMemo`, `useEffect`, `readStoredCalendarEvents`, `readStoredTasks`, `createCalendarEvent`, `removeCalendarEvent`, `getMonthCalendarCells`, `getEventsForDate`.
- 사용 위치: `App`.
- 주의사항: 일정은 `STORAGE_KEYS.calendarEvents` localStorage 구조를 유지한다.

### `readStoredCalendarEvents`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: localStorage 일정 데이터 복원.
- 주요 파라미터: 없음.
- 반환값: calendar event 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `readCalendarEvents`.
- 사용 위치: `Calendar` 초기 state.
- 주의사항: 손상 데이터는 `readCalendarEvents`에서 걸러진다.

### `readStoredTasks`
- 파일 경로: `src/modules/Calendar.jsx`
- 역할: task localStorage 데이터를 달력 표시용으로 복원.
- 주요 파라미터: 없음.
- 반환값: task 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Array.isArray`.
- 사용 위치: `Calendar`.
- 주의사항: Tasks 저장 key와 공유한다.

### `calendarLogic.js` 주요 함수
- 파일 경로: `src/modules/calendarLogic.js`
- 함수명: `getDateKey`, `parseDateKey`, `getDaysInMonth`, `getClampedDateKey`, `getAdjacentMonth`, `isFullMoonDate`, `getMonthCalendarCells`, `isValidCalendarDateRange`, `getCalendarEventStartDate`, `getCalendarEventEndDate`, `normalizeCalendarEvent`, `readCalendarEvents`, `isRangedCalendarEvent`, `formatCalendarDate`, `getCalendarEventDateLabel`, `eventOccursOnDate`, `getDateKeysBetween`, `getCalendarEventDateKeys`, `getCalendarEventRangePosition`, `getCalendarDayRangeMeta`, `getTodayEvents`, `getMonthEvents`, `getScheduledDateCount`, `getNextEvent`, `countEventsByDate`, `createCalendarEvent`, `removeCalendarEvent`.
- 역할: 날짜 key 처리, 월간 달력 cell 생성, 일정 정규화, 기간 일정 계산, 일정 CRUD helper.
- 주요 파라미터: date/dateKey/year/month/event/events.
- 반환값: date key, Date, cell 배열, event 배열, count map, event object 등.
- 내부에서 호출하는 주요 함수: `parseDateKey`, `getDateKey`, `normalizeCalendarEvent`, `eventOccursOnDate`, `getDateKeysBetween`.
- 사용 위치: `Calendar`, `Dashboard`, `Command`, tests.
- 주의사항: 기존 단일 일정 `date`와 기간 일정 `startDate/endDate`를 모두 지원한다.

## `src/modules/Tasks.jsx`, `src/modules/tasksLogic.js`

### `Tasks`
- 파일 경로: `src/modules/Tasks.jsx`
- 역할: task 입력, 완료, 삭제, 필터, localStorage 저장/복원.
- 주요 파라미터: `t`.
- 반환값: Tasks JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useMemo`, `createTask`.
- 사용 위치: `App`.
- 주의사항: `STORAGE_KEYS.tasks` 변경 금지.

### `tasksLogic.js` 주요 함수
- 파일 경로: `src/modules/tasksLogic.js`
- 함수명: `normalizeDueDate`, `createTask`, `getTasksDueOnDate`, `getActiveTasksDueOnDate`, `getTodayDueTasks`, `countDueTasksByDate`.
- 역할: task 생성과 due date 기반 조회/집계.
- 주요 파라미터: `tasks`, `dateKey`, `currentDate`, task input.
- 반환값: task, task 배열, count map.
- 내부에서 호출하는 주요 함수: `getDateKey`, `normalizeDueDate`.
- 사용 위치: `Tasks`, `Calendar`, `Dashboard`, `Command`, tests.
- 주의사항: due date는 `YYYY-MM-DD` 형식만 보존한다.

## `src/modules/Notes.jsx`

### `Notes`
- 파일 경로: `src/modules/Notes.jsx`
- 역할: note 입력, 삭제, localStorage 저장/복원.
- 주요 파라미터: `t`.
- 반환값: Notes JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `handleAddNote`, `handleDeleteNote`, `formatCreatedAt`.
- 사용 위치: `App`.
- 주의사항: `STORAGE_KEYS.notes` 변경 금지.

### `handleAddNote`, `handleDeleteNote`, `formatCreatedAt`
- 파일 경로: `src/modules/Notes.jsx`
- 역할: note 추가, note 삭제, 생성시각 표시 문자열 생성.
- 주요 파라미터: submit event, `noteId`, date value.
- 반환값: 없음 또는 날짜 문자열.
- 내부에서 호출하는 주요 함수: `crypto.randomUUID`, `setNotes`, `Array.filter`, `Intl.DateTimeFormat`.
- 사용 위치: `Notes` 내부.
- 주의사항: `crypto.randomUUID` 미지원 환경 fallback은 없음.

## `src/modules/Timer.jsx`, `src/modules/timerLogic.js`

### `Timer`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: focus/break timer, stopwatch, lap, 완료 세션 저장.
- 주요 파라미터: `t`.
- 반환값: Timer JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useCallback`, `minutesToSeconds`, `formatTime`, `formatStopwatchTime`, `normalizeMinutes`.
- 사용 위치: `App`.
- 주의사항: interval cleanup과 localStorage completed sessions 저장 흐름 유지 필요.

### `readCompletedSessions`
- 파일 경로: `src/modules/Timer.jsx`
- 역할: 완료된 focus session count 복원.
- 주요 파라미터: 없음.
- 반환값: 0 이상 숫자.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `Number.parseInt`, `Math.max`.
- 사용 위치: `Timer` 초기 state.
- 주의사항: 음수는 0으로 보정한다.

### `timerLogic.js` 주요 함수
- 파일 경로: `src/modules/timerLogic.js`
- 함수명: `minutesToSeconds`, `formatTime`, `formatStopwatchTime`, `normalizeMinutes`.
- 역할: 시간 변환과 표시 포맷 정규화.
- 주요 파라미터: minutes/seconds/milliseconds/value/fallback.
- 반환값: 숫자 또는 시간 문자열.
- 내부에서 호출하는 주요 함수: `Math.floor`, `String.padStart`, `Number.parseInt`.
- 사용 위치: `Timer`, tests.
- 주의사항: `normalizeMinutes`는 1~240분 범위로 제한한다.

## `src/modules/Command.jsx`, `src/modules/commandLogic.js`

### `Command`
- 파일 경로: `src/modules/Command.jsx`
- 역할: 명령 입력, 결과 표시, 최근 명령 history 관리.
- 주요 파라미터: `onModuleChange`, `t`.
- 반환값: Command JSX.
- 내부에서 호출하는 주요 함수: `useState`, `executeCommand`, `parseCommand`, `createResult`.
- 사용 위치: `App`.
- 주의사항: history는 session state이며 localStorage에 저장하지 않는다.

### `commandLogic.js` 주요 함수
- 파일 경로: `src/modules/commandLogic.js`
- 함수명: `readStoredList`, `readStoredNumber`, `readStoredChoice`, `readCommandDataStatus`, `getRecentNotes`, `getTaskStats`, `normalizeCommand`, `parseCommand`, `getRecommendedTask`, `createResult`.
- 역할: command 입력 해석, localStorage 읽기, task/note/calendar 요약 결과 생성.
- 주요 파라미터: command text, tasks, notes, calendarEvents, `t`, `onModuleChange`.
- 반환값: command parse result, metrics/list/result 객체.
- 내부에서 호출하는 주요 함수: `JSON.parse`, `getTodayDueTasks`, `getTodayEvents`, `getNextEvent`, `getTaskStats`.
- 사용 위치: `Command`, tests.
- 주의사항: localStorage key는 `STORAGE_KEYS`를 통해 공유한다.

## `src/modules/Dashboard.jsx`

### `Dashboard`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: dashboard 탭, task/note/calendar/timer/map 요약 렌더링.
- 주요 파라미터: `onModuleChange`, `t`.
- 반환값: Dashboard JSX.
- 내부에서 호출하는 주요 함수: `useState`, `useEffect`, `useMemo`, `readStoredList`, `readStoredNumber`, `getTodayDueTasks`, `getTodayEvents`, `getNextEvent`, `getMapArchiveSummary`.
- 사용 위치: `App`.
- 주의사항: 여러 저장소/localStorage/IndexedDB 요약을 읽기 때문에 실패 fallback을 유지해야 한다.

### `readStoredList`, `readStoredNumber`, `getNoteTime`
- 파일 경로: `src/modules/Dashboard.jsx`
- 역할: dashboard 요약용 저장 데이터 복원과 note 정렬 timestamp 생성.
- 주요 파라미터: storage key 또는 note.
- 반환값: 배열, 숫자, timestamp.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Date`.
- 사용 위치: `Dashboard`.
- 주의사항: 손상 데이터는 빈 값 또는 0으로 fallback한다.

## `src/modules/Settings.jsx`, `src/modules/settingsBackup.js`

### `Settings`
- 파일 경로: `src/modules/Settings.jsx`
- 역할: 언어/시작 모듈/HUD/theme 설정, reset, 백업/복원 UI.
- 주요 파라미터: 설정 값과 setter props, `t`.
- 반환값: Settings JSX.
- 내부에서 호출하는 주요 함수: `readStoredCount`, `readStoredList`, `createBackupFileName`, `validateBackupPayload`, backup/restore service 함수들.
- 사용 위치: `App`.
- 주의사항: reset과 restore는 사용자 확인 후 수행해야 한다.

### `Settings.jsx` helper 함수
- 파일 경로: `src/modules/Settings.jsx`
- 함수명: `readStoredCount`, `readStoredList`, `readStoredCompletedSessions`.
- 역할: settings 화면의 데이터 개수/세션 수 표시용 저장값 복원.
- 주요 파라미터: storage key.
- 반환값: 숫자 또는 배열.
- 내부에서 호출하는 주요 함수: `localStorage.getItem`, `JSON.parse`, `Number.parseInt`.
- 사용 위치: `Settings`.
- 주의사항: 손상 데이터는 0 또는 빈 배열로 fallback한다.

### `settingsBackup.js` 주요 함수
- 파일 경로: `src/modules/settingsBackup.js`
- 함수명: `createBackupFileName`, `validateBackupPayload`.
- 역할: 백업 파일명 생성과 백업 JSON 구조 검증.
- 주요 파라미터: 없음 또는 backup payload.
- 반환값: 파일명 문자열 또는 검증 결과 객체.
- 내부에서 호출하는 주요 함수: `Date`, `isPlainObject`, `Array.includes`.
- 사용 위치: `Settings`, tests.
- 주의사항: 앱 이름/type/version 검증은 복원 안전장치다.

## `src/services/photoArchiveRepository.js`

### 주요 함수
- 파일 경로: `src/services/photoArchiveRepository.js`
- 함수명: `openPhotoArchiveDatabase`, `getPhotoRecords`, `getPhotoRecordCount`, `createPhotoRecord`, `createPhotoRecords`, `updatePhotoRecord`, `deletePhotoRecord`, `replacePhotoArchiveData`, `replacePhotoRecords`.
- 역할: IndexedDB photo records/collections 저장소 열기와 record CRUD/replace 처리.
- 주요 파라미터: record input, id, patch, replace payload.
- 반환값: Promise 기반 record/count/result.
- 내부에서 호출하는 주요 함수: `indexedDB.open`, `runStoreTransaction`, `normalizePhotoRecord`.
- 사용 위치: `Map`, `Settings`, `Dashboard`, backup/summary services.
- 주의사항: DB 이름, version, store 이름 변경은 기존 데이터 손상 위험이 있다.

## `src/services/photoCollectionRepository.js`

### 주요 함수
- 파일 경로: `src/services/photoCollectionRepository.js`
- 함수명: `getPhotoCollections`, `createPhotoCollection`, `updatePhotoCollection`, `deletePhotoCollection`.
- 역할: IndexedDB collection CRUD와 삭제 시 record 연결 해제.
- 주요 파라미터: collection input, id, patch, collectionId.
- 반환값: Promise 기반 collection 또는 삭제 결과.
- 내부에서 호출하는 주요 함수: `openPhotoArchiveDatabase`, `runCollectionTransaction`, `normalizeCollection`.
- 사용 위치: `Map`, `useMapCollectionController`, `Settings`, `Dashboard`.
- 주의사항: 삭제 시 사진 record 자체는 삭제하지 않고 `collectionId`만 해제한다.

## `src/services/photoArchiveBackupService.js`

### 주요 함수
- 파일 경로: `src/services/photoArchiveBackupService.js`
- 함수명: `blobToDataUrl`, `dataUrlToBlob`, `serializePhotoRecordsForBackup`, `validateMapBackupRecordShape`, `validateMapCollectionBackupRecordShape`, `serializePhotoCollectionsForBackup`, `preparePhotoCollectionsForRestore`, `preparePhotoRecordsForRestore`.
- 역할: Map records/collections 백업 직렬화, 검증, 복원 준비.
- 주요 파라미터: Blob, data URL, backup records/collections.
- 반환값: Promise 또는 검증/복원 계획 객체.
- 내부에서 호출하는 주요 함수: `FileReader`, `fetch`, `isPlainObject`, `isFiniteCoordinate`, `normalizeCollectionId`.
- 사용 위치: `Settings`.
- 주의사항: Blob 변환 실패는 damaged record로 처리한다.

## `src/services/photoArchiveSummaryService.js`

### 주요 함수
- 파일 경로: `src/services/photoArchiveSummaryService.js`
- 함수명: `createMapArchiveSummary`, `getMapArchiveSummary`.
- 역할: Dashboard Map 요약 생성과 IndexedDB 조회.
- 주요 파라미터: `records`, `collections`.
- 반환값: summary 객체 또는 Promise<summary>.
- 내부에서 호출하는 주요 함수: `getPhotoRecords`, `getPhotoCollections`, `getTimestamp`, `getSummaryLocationSource`.
- 사용 위치: `Dashboard`.
- 주의사항: 대표 컬렉션은 사진 수와 updatedAt 기준으로 계산한다.

## `src/services/placeSearchService.js`

### 주요 함수
- 파일 경로: `src/services/placeSearchService.js`
- 함수명: `getCountryCodeForSearchScope`, `createAddressSummary`, `normalizePlaceSearchResult`, `clearPlaceSearchCache`, `searchPlaces`.
- 역할: Nominatim 장소 검색, scope/country code 변환, 결과 정규화, cache 관리.
- 주요 파라미터: query, language, scope, fetcher, raw result.
- 반환값: place 배열 또는 정규화된 place 객체.
- 내부에서 호출하는 주요 함수: `wait`, `getCacheKey`, `URLSearchParams`, `fetcher`.
- 사용 위치: `PlaceSearchPanel`, tests.
- 주의사항: 무료 Nominatim rate limit 준수를 위해 요청 간격과 cache를 유지한다.

## `src/utils/imageUtils.js`

### 주요 함수
- 파일 경로: `src/utils/imageUtils.js`
- 함수명: `calculatePreviewSize`, `createPreviewImageBlob`.
- 역할: 이미지 preview 크기 계산과 IndexedDB 저장용 축소 Blob 생성.
- 주요 파라미터: width, height, maxSize, file, mimeType, quality.
- 반환값: preview size 객체 또는 Promise<{ blob, width, height, mimeType }>.
- 내부에서 호출하는 주요 함수: `loadImageFromFile`, `canvasToBlob`, canvas APIs.
- 사용 위치: `Map`, `useMapBulkUploadController`.
- 주의사항: 원본 이미지를 직접 저장하지 않고 축소 preview Blob을 저장한다.

## `src/i18n/translations.js`

### `isSupportedLanguage`
- 파일 경로: `src/i18n/translations.js`
- 역할: 언어 코드가 translations object에 존재하는지 확인.
- 주요 파라미터: `language`.
- 반환값: boolean.
- 내부에서 호출하는 주요 함수: `Object.prototype.hasOwnProperty.call`.
- 사용 위치: `App`.
- 주의사항: 언어 추가 시 ko/en key 구조 일치 테스트를 유지해야 한다.

### 동적 번역 함수
- 파일 경로: `src/i18n/translations.js`
- 역할: 숫자, 날짜, 모듈명, count 값에 따라 UI 문구 생성.
- 주요 파라미터: `count`, `moduleName`, `source`, `month`, `date`, `index`, `minutes`, `total`, `valid`, `damaged`, `success`, `failed`, `processed`.
- 반환값: 번역 문자열.
- 내부에서 호출하는 주요 함수: 일부 `Date.toLocaleString`.
- 사용 위치: App/modules/components 전반.
- 주의사항: ko/en 양쪽에 동일 key가 있어야 한다.

## `src/constants/storageKeys.js`

### `STORAGE_KEYS`
- 파일 경로: `src/constants/storageKeys.js`
- 역할: localStorage key 중앙 정의.
- 주요 파라미터: 없음.
- 반환값: 상수 객체.
- 내부에서 호출하는 주요 함수: 없음.
- 사용 위치: App, Tasks, Notes, Calendar, Command, Settings, Timer.
- 주의사항: 기존 사용자 데이터 보호를 위해 key 이름 변경 금지.
