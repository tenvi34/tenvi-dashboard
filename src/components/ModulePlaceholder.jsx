// 아직 구현되지 않은 모듈의 기본 안내 화면을 렌더링하는 컴포넌트입니다.
function ModulePlaceholder({ label, title, message, systemMessage }) {
  return (
    <section className="module-panel placeholder-module">
      <div className="module-header">
        <div>
          <p className="module-label">{label}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="empty-state" role="status">
        <span>{systemMessage}</span>
        <p>{message}</p>
      </div>
    </section>
  )
}

export default ModulePlaceholder
