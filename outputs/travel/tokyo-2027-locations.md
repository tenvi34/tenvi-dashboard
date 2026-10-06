# 도쿄 2027 일정의 지도 위치

좌표가 없던 가져오기 파일을 보완했습니다. 앱의 유료 API나 새 서비스를 추가하지 않았습니다.

## 적용

여행 목록 → JSON 가져오기 → `outputs/travel/tokyo-2027.json` 선택 → 새로 추가된 여행의 지도 탭 확인.
파일 수정만으로 이미 가져온 브라우저 데이터가 갱신되지는 않습니다. 가져오기는 기존 여행을 유지하고 새 여행을 만듭니다. 기존 여행에서 추가로 수정한 내용이 있다면 먼저 JSON 백업하세요.

## 정확도와 미확정 사항

19개 장소의 좌표를 포함합니다. 지도 핀은 이동 계획을 위한 참고 위치이며 출입구나 실내 매장까지의 경로를 보장하지 않습니다. 타바타역은 남쪽 출구 대신 역 대표점, 공원·거리·해변은 대표점, 나리타는 공항 대표점입니다. 숙소와 아키하바라 12개 개별 매장, 공항 터미널은 아직 미지정입니다.

OUR HERO의 건물 및 층은 [공식 전시 안내](https://heroaca-anime-10th-ex.com/)를 반영했습니다. 가샤폰 백화점은 일정의 동선에 따라 이케부쿠로 총본점으로 해석했으며, [공식 매장 안내](https://bandainamco-am.co.jp/en/others/capsule-toy-store/store/ikebukuro/)에 따른 건물 대표 좌표를 사용했습니다.

## 좌표 출처

공개 지리 자료를 수동으로 확인하여 기록했습니다. 날짜: 2026-09-17. Mapcarta 자료는 OpenStreetMap 등 원 출처를 해당 페이지에서 안내합니다. 도분초 자료는 십진수로 변환했습니다.

| 장소 | 위도, 경도 | 출처 | 위치 기준 |
| --- | --- | --- | --- |
| 타바타역 남쪽 출구 | 35.7379, 139.761253 | [자료](https://commons.wikimedia.org/wiki/Category:Tabata_Station_(Tokyo)) | 타바타역 대표 위치. 남쪽 출구의 정확한 핀은 방문 전 확인 필요. |
| 스카이트리타운 소라마치 | 35.710333, 139.812222 | [자료](https://fr.wikipedia.org/wiki/Tokyo_Solamachi) | 소라마치 시설 대표 위치. |
| 도쿄 스카이트리 전망대 | 35.710056, 139.810722 | [자료](https://www.wikidata.org/wiki/Q57965) | 스카이트리 건물 위치. 전망대 입구는 현장 안내 확인. |
| OUR HERO 전시회 | 35.68084, 139.77061 | [자료](https://mapcarta.com/W857738563) | 공식 전시 안내의 TOFROM YAESU TOWER 6F. 지도는 건물 대표 위치. 전시 안내: https://heroaca-anime-10th-ex.com/ |
| 아키하바라 | 35.698333, 139.773056 | [자료](https://www.wikidata.org/wiki/Q800374) | 아키하바라역 대표 위치. 12개 매장 각각의 위치는 미입력. |
| 나카노 브로드웨이 | 35.709167, 139.665556 | [자료](https://www.wikidata.org/wiki/Q86661760) | 나카노 브로드웨이 건물 위치. |
| 쓰루가오카 하치만구 | 35.325893, 139.556338 | [자료](https://jmapps.ne.jp/kokugakuin/det.html?data_id=53485) | 신사 대표 위치. |
| 고마치도리 | 35.321531, 139.552319 | [자료](https://commons.wikimedia.org/wiki/Category:Komachi_Street) | 고마치도리 거리 대표 위치. |
| 고토쿠인 (가마쿠라 대불) | 35.316944, 139.535833 | [자료](https://www.wikidata.org/wiki/Q672056) | 고토쿠인 경내 대표 위치. |
| 가마쿠라코코마에역 | 35.30672, 139.50071 | [자료](https://mapcarta.com/27448760) | 역 위치. 슬램덩크 건널목 촬영 지점과는 다름. |
| 시치리가하마 해변 | 35.306364, 139.509456 | [자료](https://www.wikidata.org/wiki/Q7496115) | 시치리가하마 해변 대표 위치. |
| 에노시마 전망대 | 35.29976, 139.47848 | [자료](https://mapcarta.com/W1311985404) | 에노시마 시 캔들 전망대로 해석한 위치. |
| 도립 시바 공원 | 35.656111, 139.748333 | [자료](https://www.wikidata.org/wiki/Q42311591) | 시바 공원 대표 위치. 특정 영화 장면의 촬영 지점은 별도 확인 필요. |
| 도쿄 타워 | 35.658584, 139.745432 | [자료](https://mapfan.com/spots/SCCC5%2CJ%2CY5) | 도쿄 타워 건물 위치. |
| 펜더 플래그십 도쿄 | 35.66959, 139.70607 | [자료](https://mapcarta.com/N12425861572) | 펜더 플래그십 도쿄 매장 위치. |
| 애니메이트 이케부쿠로 본점 | 35.7311443, 139.7154592 | [자료](https://www.google.com/maps/search/?api=1&query=35.7311443,139.7154592) | 애니메이트 이케부쿠로 본점 위치. |
| 포켓몬센터 메가 도쿄 | 35.72889, 139.71918 | [자료](https://mapcarta.com/N3350332481) | 포켓몬센터 메가 도쿄 매장 위치. |
| 가샤폰 백화점 | 35.728816, 139.719948 | [자료](https://www.navitime.co.jp/poi?spot=02022-1254276) | 일정의 이케부쿠로 동선을 기준으로 가샤폰 백화점 이케부쿠로 총본점으로 해석. 월드 임포트 마트 건물 대표 위치, 매장은 3층. 공식 안내: https://bandainamco-am.co.jp/en/others/capsule-toy-store/store/ikebukuro/ |
| 나리타 공항 | 35.765, 140.385 | [자료](https://www.data.jma.go.jp/obd/stats/koku/kikohyo/commentary_e.pdf) | 공항 대표 위치. 탑승 터미널 및 스카이라이너 하차역은 항공권 확인 후 지정 필요. |

애니메이트 좌표는 검색에 노출된 [본점 Google Maps 장소 정보](https://www.google.com/maps/place/?q=place_id:ChIJi0VhQ2-NGGARGsbajebyPVA)의 위치를 참고했습니다. 유료 API를 호출하거나 연결하지 않았습니다.

