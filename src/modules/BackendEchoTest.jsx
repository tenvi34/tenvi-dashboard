import { useState } from 'react'
import { fetchTestEcho } from '../api/testEchoApi.js'

const DEFAULT_MESSAGE = 'ping message'

// 서버 UTC 시간을 브라우저 로컬 시간으로 표시
const formatServerTime = (serverTime) => {
  if (!serverTime) {
    return '-'
  }

  const parsedDate = new Date(serverTime)

  if (Number.isNaN(parsedDate.getTime())) {
    return serverTime
  }

  const padDatePart = (value) => String(value).padStart(2, '0')
  const datePart = [
    parsedDate.getFullYear(),
    padDatePart(parsedDate.getMonth() + 1),
    padDatePart(parsedDate.getDate()),
  ].join('-')
  const timePart = [
    padDatePart(parsedDate.getHours()),
    padDatePart(parsedDate.getMinutes()),
    padDatePart(parsedDate.getSeconds()),
  ].join(':')

  return `${datePart} ${timePart}`
}

// POST 요청까지 확인하는 백엔드 연결 테스트 카드
function BackendEchoTest() {
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [response, setResponse] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSending(true)
    setErrorMessage('')
    setResponse(null)

    try {
      const echoResponse = await fetchTestEcho({ message })

      setResponse(echoResponse)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Echo test failed.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="settings-panel backend-echo-test">
      <div className="settings-panel-header">
        <p className="module-label">Backend</p>
        <h3>백엔드 Echo 테스트</h3>
      </div>

      <form className="backend-echo-test__form" onSubmit={handleSubmit}>
        <label className="settings-field">
          <span>Message</span>
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="전송할 메시지"
          />
        </label>
        <button
          className="settings-option"
          type="submit"
          disabled={isSending}
        >
          {isSending ? '전송 중' : '전송'}
        </button>
      </form>

      {response ? (
        <dl className="backend-echo-test__result">
          <div>
            <dt>Message</dt>
            <dd>{response.message}</dd>
          </div>
          <div>
            <dt>ServerTime</dt>
            <dd>{formatServerTime(response.serverTime)}</dd>
          </div>
        </dl>
      ) : null}

      {errorMessage ? (
        <p className="backend-echo-test__error">{errorMessage}</p>
      ) : null}
    </section>
  )
}

export default BackendEchoTest
