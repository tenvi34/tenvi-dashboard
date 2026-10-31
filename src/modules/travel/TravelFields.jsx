import { useRef, useState } from 'react'
import { acknowledgeTravelDraft, readTravelDraft, rememberTravelDraft } from './travelDrafts.js'

// 생성은 제출, 기존 항목은 blur 시 자동 저장하는 공통 편집기
export default function TravelFields({
  initial,
  fields,
  onSave,
  t,
  autoSave = false,
  submitLabel,
  validate,
  draftKey,
  beforeComponent: BeforeComponent,
  extraComponent: ExtraComponent,
  extraProps,
}) {
  // 편집기 재진입 시 미저장 입력과 복구 안내를 함께 복원
  const [restored] = useState(() => readTravelDraft(draftKey))
  const [draft, setDraft] = useState(restored?.value || initial)
  const [error, setError] = useState(restored ? 'recoveredDraft' : '')

  // 겹친 저장 요청 수와 마지막 성공 상태를 구분해 표시
  const [pending, setPending] = useState(0)
  const [saved, setSaved] = useState(false)

  // 저장 기준값과 요청 큐를 유지해 자동 저장의 중복·순서 역전 방지
  const lastSaved = useRef(JSON.stringify(restored?.baseline || initial))
  const saveQueue = useRef(Promise.resolve())
  const form = useRef(null)
  const draftRef = useRef(draft)

  const change = (patch) => {
    const next = { ...draftRef.current, ...patch }
    draftRef.current = next

    if (autoSave) {
      rememberTravelDraft(draftKey, next, JSON.parse(lastSaved.current))
    }

    setSaved(false)
    setDraft(next)

    return next
  }

  const save = async (value = draftRef.current) => {
    // dialog 포커스 복원과 StrictMode ref 정리 중 발생하는 blur는 저장 대상에서 제외
    if (!form.current) {
      return
    }

    if (!form.current.checkValidity()) {
      setError('invalidForm')

      return
    }

    const validationError = validate?.(value)

    if (validationError) {
      setError(validationError)

      return
    }

    setPending((count) => count + 1)
    // blur와 검색/지도 선택이 겹쳐도 요청 순서를 보존하고 변경 필드만 전달
    const request = saveQueue.current.then(async () => {
      const signature = JSON.stringify(value)

      if (autoSave && signature === lastSaved.current) {
        setError('')
        setSaved(true)

        return
      }

      const baseline = JSON.parse(lastSaved.current)
      const changes = Object.fromEntries(
        Object.entries(value).filter(([key, entry]) => entry !== baseline[key]),
      )

      try {
        const result = await onSave(value, changes)

        if (result) {
          lastSaved.current = signature
          acknowledgeTravelDraft(draftKey, value)
          setError('')
          setSaved(true)
        } else {
          setError('saveError')
        }
      } catch {
        setError('saveError')
      }
    })
    saveQueue.current = request.catch(() => {})
    await request.finally(() => setPending((count) => count - 1))
  }

  return (
    <form
      className="travel-editor"
      aria-busy={pending > 0}
      ref={form}
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      {BeforeComponent && (
        <details className="travel-disclosure">
          <summary>{t.addressTools}</summary>
          <BeforeComponent
            t={t}
            commit={(patch) => {
              const next = change(patch)

              if (autoSave) {
                save(next)
              }
            }}
          />
        </details>
      )}
      <div className="travel-fields">
        {fields.map(({ key, label, type = 'text', options, ...attributes }) => (
          <label
            key={key}
            className={type === 'textarea' || key === 'address' ? 'travel-wide' : ''}
          >
            <span>
              {label}
              {attributes.required && (
                <span
                  className="travel-required-marker"
                  aria-hidden="true"
                >
                  {' '}
                  *
                </span>
              )}
            </span>
            {options ? (
              <select
                value={draft[key] ?? ''}
                onChange={(event) => change({ [key]: event.target.value })}
                onBlur={() => autoSave && save()}
                {...attributes}
              >
                {options.map(([value, title]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {title}
                  </option>
                ))}
              </select>
            ) : type === 'textarea' ? (
              <textarea
                value={draft[key] ?? ''}
                maxLength={10000}
                onChange={(event) => change({ [key]: event.target.value })}
                onBlur={() => autoSave && save()}
                {...attributes}
              />
            ) : (
              <input
                type={type}
                value={draft[key] ?? ''}
                onChange={(event) => change({ [key]: event.target.value })}
                onBlur={() => autoSave && save()}
                {...attributes}
              />
            )}
          </label>
        ))}
      </div>
      {ExtraComponent && (
        <details className="travel-disclosure">
          <summary>{t.locationTools}</summary>
          <ExtraComponent
            {...extraProps}
            draft={draft}
            change={change}
            commit={(patch) => {
              const next = change(patch)

              if (autoSave) {
                save(next)
              }
            }}
          />
        </details>
      )}
      <div className="travel-actions travel-editor-footer">
        <button
          className="travel-primary"
          type="submit"
          disabled={pending > 0}
        >
          {pending
            ? t.saving
            : error === 'saveError'
              ? t.retrySave
              : submitLabel || (autoSave ? t.saveChanges : t.create)}
        </button>
        {autoSave && (
          <small role="status">{pending ? t.saving : saved ? t.saved : t.autoSave}</small>
        )}
        {error && (
          <p
            role="alert"
            className="travel-error"
          >
            {t[error]}
          </p>
        )}
      </div>
    </form>
  )
}
