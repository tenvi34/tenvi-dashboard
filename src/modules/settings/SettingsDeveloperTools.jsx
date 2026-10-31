import { useState } from 'react'
import BackendEchoTest from '../BackendEchoTest.jsx'
import BoardApiTest from '../BoardApiExtendedTest.jsx'

// 명시적으로 펼친 경우에만 개발용 API 조작 화면 마운트
export default function SettingsDeveloperTools({ t }) {
  const [open, setOpen] = useState(false)

  return (
    <details
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="settings-panel"
    >
      <summary>{t.settings.developerTools}</summary>
      {open && (
        <>
          <BackendEchoTest />
          <BoardApiTest />
        </>
      )}
    </details>
  )
}
