// 외부 아이콘 패키지 없이 공통 탐색에 사용하는 선형 아이콘
const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  board: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
  map: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
  travel: 'M9 7V4h6v3 M5 7h14v14H5z M9 7v14 M15 7v14',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  more: 'M5 11h2v2H5z M11 11h2v2h-2z M17 11h2v2h-2z',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
}
export default function ModuleIcon({ name, className = '' }) {
  return <svg className={`module-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] || paths.dashboard} /></svg>
}
