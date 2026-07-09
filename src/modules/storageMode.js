export const STORAGE_MODES = {
  local: 'local',
  remote: 'remote',
}

// 기능별 LOCAL/REMOTE 선택값 보정
// 기능별 LOCAL/REMOTE 선택값 읽기
export const readStorageMode = (storageKey, storage = globalThis.localStorage) => {
  try {
    return storage?.getItem(storageKey) === STORAGE_MODES.remote
      ? STORAGE_MODES.remote
      : STORAGE_MODES.local
  } catch {
    return STORAGE_MODES.local
  }
}

// 기능별 LOCAL/REMOTE 선택값 저장
export const saveStorageMode = (
  storageKey,
  mode,
  storage = globalThis.localStorage,
) => {
  const nextMode =
    mode === STORAGE_MODES.remote ? STORAGE_MODES.remote : STORAGE_MODES.local

  storage?.setItem(storageKey, nextMode)
  return nextMode
}
