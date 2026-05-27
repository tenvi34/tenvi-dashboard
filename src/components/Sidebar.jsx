// 모듈 목록을 표시하고 선택된 모듈 전환을 요청하는 사이드바 컴포넌트입니다.
function Sidebar({ activeModule, modules, onModuleChange, t }) {
  return (
    <aside className="tenvi-sidebar" aria-label="TENVI modules">
      {/* Sidebar 상단 라벨 영역 */}
      <div className="sidebar-header">
        <p className="module-label">{t.sidebar.label}</p>
        <h2>{t.sidebar.title}</h2>
      </div>

      {/* 모듈 전환 버튼 목록: activeModule 상태만 변경하고 라우터는 사용하지 않습니다. */}
      <nav className="sidebar-nav">
        {modules.map((module) => (
          <button
            className={`sidebar-button ${
              activeModule === module.id ? 'is-active' : ''
            }`}
            key={module.id}
            type="button"
            onClick={() => onModuleChange(module.id)}
          >
            <span>{t.modules[module.id]}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
