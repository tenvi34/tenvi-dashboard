// 외부 지도 URL만 생성하며 Google API 호출/검색 결과 저장은 하지 않음
export const getGoogleMapsSearchUrl = ({ query = '', name = '', address = '', region = '' } = {}) => {
  const searchText = query.trim() || [name, address || region].filter(Boolean).join(' ').trim()
  if (!searchText) return null
  // 한국어 URL 인코딩 후에도 Maps URL 길이 제한 안에 들어오도록 검색어 길이 제한
  const params = new URLSearchParams({ api: '1', query: Array.from(searchText).slice(0, 150).join('') })
  return `https://www.google.com/maps/search/?${params}`
}
