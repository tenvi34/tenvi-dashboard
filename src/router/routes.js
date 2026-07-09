// 모듈별 기준 URL
export const MODULE_PATHS = {
  board: '/board',
  calendar: '/calendar',
  command: '/command',
  dashboard: '/dashboard',
  map: '/map',
  notes: '/notes',
  settings: '/settings',
  tasks: '/tasks',
  timer: '/timer',
}

// URL에서 활성 모듈 계산
export const getModuleFromPathname = (pathname) => {
  if (pathname.startsWith('/board')) return 'board'
  if (pathname.startsWith('/settings')) return 'settings'

  const pathModule = Object.entries(MODULE_PATHS).find(
    ([, modulePath]) => pathname === modulePath,
  )

  return pathModule?.[0] ?? 'dashboard'
}

export const getModulePath = (moduleId) =>
  MODULE_PATHS[moduleId] ?? MODULE_PATHS.dashboard
