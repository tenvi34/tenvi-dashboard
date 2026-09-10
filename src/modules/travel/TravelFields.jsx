import { useRef, useState } from 'react'
import { acknowledgeTravelDraft, readTravelDraft, rememberTravelDraft } from './travelDrafts.js'

// 생성은 제출, 기존 항목은 blur 시 자동 저장하는 공통 편집기
export default function TravelFields({ initial, fields, onSave, t, autoSave = false, validate, draftKey, beforeComponent: BeforeComponent, extraComponent: ExtraComponent, extraProps }) {
  const [restored] = useState(() => readTravelDraft(draftKey))
  const [draft, setDraft] = useState(restored?.value || initial)
  const [error, setError] = useState(restored ? 'recoveredDraft' : '')
  const [pending, setPending] = useState(0)
  const lastSaved = useRef(JSON.stringify(restored?.baseline || initial))
  const saveQueue = useRef(Promise.resolve())
  const form = useRef(null)
  const draftRef = useRef(draft)
  const change = (patch) => {
    const next = { ...draftRef.current, ...patch }
    draftRef.current = next
    if (autoSave) rememberTravelDraft(draftKey, next, JSON.parse(lastSaved.current))
    setDraft(next)
    return next
  }
  const save = async (value = draftRef.current) => {
    if (!form.current?.checkValidity()) { setError('invalidForm'); return }
    const validationError = validate?.(value)
    if (validationError) { setError(validationError); return }
    setPending((count) => count + 1)
    // blur와 검색/지도 선택이 겹쳐도 요청 순서를 보존하고 변경 필드만 전달
    const request = saveQueue.current.then(async () => {
      const signature = JSON.stringify(value)
      if (autoSave && signature === lastSaved.current) { setError(''); return }
      const baseline = JSON.parse(lastSaved.current)
      const changes = Object.fromEntries(Object.entries(value).filter(([key, entry]) => entry !== baseline[key]))
      try {
        const result = await onSave(value, changes)
        if (result) {
          lastSaved.current = signature
          acknowledgeTravelDraft(draftKey, value)
          setError('')
        } else setError('saveError')
      } catch { setError('saveError') }
    })
    saveQueue.current = request.catch(() => {})
    await request.finally(() => setPending((count) => count - 1))
  }
  return <form className="travel-editor" ref={form} onSubmit={(event) => { event.preventDefault(); save() }}>
    {BeforeComponent && <BeforeComponent t={t} commit={(patch) => { const next = change(patch); if (autoSave) save(next) }} />}
    <div className="travel-fields">
      {fields.map(({ key, label, type = 'text', options, ...attributes }) => <label key={key} className={type === 'textarea' ? 'travel-wide' : ''}>
        <span>{label}</span>
        {options ? <select value={draft[key] ?? ''} onChange={(event) => change({ [key]: event.target.value })} onBlur={() => autoSave && save()} {...attributes}>
          {options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
        </select> : type === 'textarea' ? <textarea value={draft[key] ?? ''} maxLength={10000}
          onChange={(event) => change({ [key]: event.target.value })} onBlur={() => autoSave && save()} {...attributes} />
          : <input type={type} value={draft[key] ?? ''} onChange={(event) => change({ [key]: event.target.value })}
            onBlur={() => autoSave && save()} {...attributes} />}
      </label>)}
    </div>
    {ExtraComponent && <ExtraComponent {...extraProps} draft={draft} change={change} commit={(patch) => { const next = change(patch); if (autoSave) save(next) }} />}
    <div className="travel-actions">
      {autoSave ? <small>{pending ? t.saving : t.autoSave}</small> : <button type="submit" disabled={pending > 0}>{pending ? t.saving : t.create}</button>}
      {error && <><p role="alert" className="travel-error">{t[error]}</p>{autoSave && <button type="submit" disabled={pending > 0}>{t.retrySave}</button>}</>}
    </div>
  </form>
}
