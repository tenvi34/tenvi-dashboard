import { STORAGE_KEYS } from '../../constants/storageKeys.js'

export const BOARD_STORAGE_MODES = {
  local: 'local',
  remote: 'remote',
}

// 잘못된 설정값에서도 기존 로컬 게시글을 보호하는 기본 모드
export const readBoardStorageMode = (storage = globalThis.localStorage) => {
  try {
    return storage?.getItem(STORAGE_KEYS.boardStorageMode) === BOARD_STORAGE_MODES.remote
      ? BOARD_STORAGE_MODES.remote
      : BOARD_STORAGE_MODES.local
  } catch {
    return BOARD_STORAGE_MODES.local
  }
}

export const saveBoardStorageMode = (mode, storage = globalThis.localStorage) => {
  const nextMode =
    mode === BOARD_STORAGE_MODES.remote
      ? BOARD_STORAGE_MODES.remote
      : BOARD_STORAGE_MODES.local

  storage?.setItem(STORAGE_KEYS.boardStorageMode, nextMode)
  return nextMode
}
