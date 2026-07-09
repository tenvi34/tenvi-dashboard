import { useOutletContext } from 'react-router-dom'

// 라우트 뷰에서 AppLayout context 접근
export default function useAppViewContext() {
  return useOutletContext()
}
