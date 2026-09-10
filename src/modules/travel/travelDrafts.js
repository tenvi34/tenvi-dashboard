// 저장 실패/탭 전환 시 편집 내용을 현재 세션에 보존. 확정 데이터는 repository만 저장
const drafts = new Map()
export const readTravelDraft = (key) => drafts.get(key)
export const rememberTravelDraft = (key, value, baseline) => {
  if (key) drafts.set(key, { value, baseline })
}
export const acknowledgeTravelDraft = (key, baseline) => {
  const current = drafts.get(key)
  if (!current) return
  if (JSON.stringify(current.value) === JSON.stringify(baseline)) drafts.delete(key)
  else drafts.set(key, { ...current, baseline })
}
export const forgetTravelDraft = (key) => drafts.delete(key)

// 미저장 입력이 남은 채 브라우저 종료/새로고침 시 기본 이탈 경고
if (typeof window !== 'undefined') window.addEventListener('beforeunload', (event) => {
  if ([...drafts.values()].some(({ value, baseline }) => JSON.stringify(value) !== JSON.stringify(baseline))) {
    event.preventDefault()
    event.returnValue = ''
  }
})
