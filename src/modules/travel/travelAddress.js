// 주소 원문은 보존하고 지역만 보수적으로 추정. 인식하지 못한 지역은 UI에서 기존 값 유지
export const parseTravelAddress = (input) => {
  const address = String(input ?? '').replace(/\s+/g, ' ').trim()
  if (!address || address.length > 1000 || /https?:\/\//i.test(address)) return null
  const normalized = address.replace(/[，、]/g, ',')
  const withoutCountry = normalized
    .replace(/(?:,?\s*)(?:Japan|일본|日本|South Korea|대한민국|한국)\s*$/i, '')
    .replace(/〒?\s*\b\d{3}-\d{4}\b/g, '').trim()
  const parts = withoutCountry.split(',').map((part) => part.trim()).filter(Boolean)
  let region = ''
  if (parts.length > 1) {
    // 영문 번지부터 시작하는 주소의 후행 행정구역. 숫자가 남은 구간은 제외
    const administrativeParts = parts.slice(1).filter((part) => !/\d/.test(part))
    region = administrativeParts.slice(-2).join(', ')
  }
  if (!region) {
    const japanese = withoutCountry.match(/(?:東京都|北海道|[^\s,\d]{2,3}[府県])(?:[^\s,\d]+?[市区郡町村]){1,2}/u)
    const korean = withoutCountry.match(/(?:[가-힣]+(?:특별자치도|특별자치시|특별시|광역시|도|시))\s+[가-힣]+(?:시|군|구)(?:\s+[가-힣]+구)?/u)
    region = japanese?.[0] || korean?.[0] || ''
  }
  return { address, region: region.length <= 300 ? region : '' }
}
