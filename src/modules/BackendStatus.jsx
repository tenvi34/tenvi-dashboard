import { useCallback, useEffect, useState } from 'react'
import { getBackendHealthUrl, fetchBackendHealth } from '../api/healthApi.js'

const STATUS = {
  checking: 'checking',
  connected: 'connected',
  failed: 'failed',
}

const DEFAULT_BACKEND_STATUS_TEXT = {
  label: 'Backend',
  title: '백엔드 연결 상태',
  checking: '백엔드 연결을 확인하는 중입니다.',
  connected: '연결됨',
  failed: '연결 실패',
  failedHint: '백엔드 서버가 실행 중인지 확인해주세요.',
  expectedUrl: '예상 주소',
  retry: '다시 확인',
}

// Settings 안에서 백엔드 연결만 가볍게 점검하는 상태 카드
// API 원본 시간은 유지하고 카드 표시는 초 단위로 압축
const formatCheckedAt = (checkedAt) => {
  if (!checkedAt) {
    return '-'
  }

  const checkedDate = new Date(checkedAt)

  if (Number.isNaN(checkedDate.getTime())) {
    return checkedAt
  }

  const padDatePart = (value) => String(value).padStart(2, '0')
  const datePart = [
    checkedDate.getFullYear(),
    padDatePart(checkedDate.getMonth() + 1),
    padDatePart(checkedDate.getDate()),
  ].join('-')
  const timePart = [
    padDatePart(checkedDate.getHours()),
    padDatePart(checkedDate.getMinutes()),
    padDatePart(checkedDate.getSeconds()),
  ].join(':')

  return `${datePart} ${timePart}`
}

function BackendStatus({ t }) {
  const [status, setStatus] = useState(STATUS.checking)
  const [health, setHealth] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const backendStatusText =
    t.settings.backendStatus ?? DEFAULT_BACKEND_STATUS_TEXT
  const healthUrl = getBackendHealthUrl()

  const checkBackendHealth = useCallback(async () => {
    setStatus(STATUS.checking)
    setErrorMessage('')

    try {
      const healthPayload = await fetchBackendHealth()

      setHealth(healthPayload)
      setStatus(STATUS.connected)
    } catch (error) {
      setHealth(null)
      setErrorMessage(error instanceof Error ? error.message : '')
      setStatus(STATUS.failed)
    }
  }, [])

  useEffect(() => {
    checkBackendHealth()
  }, [checkBackendHealth])

  return (
    <section className="settings-panel backend-status">
      <div className="settings-panel-header">
        <p className="module-label">{backendStatusText.label}</p>
        <h3>{backendStatusText.title}</h3>
      </div>

      <div
        className={`backend-status__card backend-status__state backend-status__state--${status}`}
      >
        {status === STATUS.checking ? (
          <p>{backendStatusText.checking}</p>
        ) : null}

        {status === STATUS.connected ? (
          <dl className="backend-status__details">
            <div>
              <dt>Backend</dt>
              <dd>{backendStatusText.connected}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{health?.service ?? '-'}</dd>
            </div>
            <div>
              <dt>Message</dt>
              <dd>{health?.message ?? '-'}</dd>
            </div>
            <div>
              <dt>CheckedAt</dt>
              <dd className="backend-status__checked-at">
                {formatCheckedAt(health?.checkedAt)}
              </dd>
            </div>
          </dl>
        ) : null}

        {status === STATUS.failed ? (
          <div className="backend-status__failure">
            <p>
              <strong>Backend: {backendStatusText.failed}</strong>
            </p>
            <p>{backendStatusText.failedHint}</p>
            <p>
              {backendStatusText.expectedUrl}:{' '}
              <code>{healthUrl}</code>
            </p>
            {errorMessage ? <p>{errorMessage}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="backend-status__actions">
        <button
          className="settings-option"
          type="button"
          onClick={checkBackendHealth}
          disabled={status === STATUS.checking}
        >
          {backendStatusText.retry}
        </button>
      </div>
    </section>
  )
}

export default BackendStatus
