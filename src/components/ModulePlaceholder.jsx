// 미구현 모듈 안내
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
