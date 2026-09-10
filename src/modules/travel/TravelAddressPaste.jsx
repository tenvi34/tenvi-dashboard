import { useState } from 'react'
import { parseTravelAddress } from './travelAddress.js'

export default function TravelAddressPaste({ commit, t }) {
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const apply = (value) => {
    const parsed = parseTravelAddress(value)
    if (!parsed) { setMessage('addressPasteInvalid'); return }
    // 장소명/메모/좌표는 건드리지 않고 인식 가능한 주소 필드만 반영
    commit({ address: parsed.address, ...(parsed.region ? { region: parsed.region } : {}) })
    setMessage(parsed.region ? 'addressPasteApplied' : 'addressPastePartial')
  }
  return <div className="travel-address-paste">
    <label>{t.addressPasteLabel}<textarea value={text} maxLength={1000} placeholder={t.addressPastePlaceholder}
      onChange={(event) => { setText(event.target.value); setMessage('') }}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData('text/plain')
        if (!pasted) return
        event.preventDefault()
        setText(pasted)
        apply(pasted)
      }} /></label>
    <div className="travel-actions"><button type="button" disabled={!text.trim()} onClick={() => apply(text)}>{t.addressPasteApply}</button>
      {message && <small role="status">{t[message]}</small>}
    </div>
    <small>{t.addressPasteHint}</small>
  </div>
}
