import { useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { createTask, normalizeDueDate } from './tasksLogic.js'

// TENVI로 이름이 바뀌어도 기존 todo-manager-lite 사용자의 Tasks 데이터를 보존해야 합니다.
const STORAGE_KEY = STORAGE_KEYS.tasks

const FILTERS = ['all', 'active', 'completed']

// 사용자의 Task 추가, 완료, 삭제, 필터링을 관리하는 컴포넌트입니다.
function Tasks({ t }) {
  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem(STORAGE_KEY)

    if (!savedTodos) {
      return []
    }

    try {
      // 저장 데이터가 깨져도 앱 전체가 멈추지 않도록 빈 목록으로 복구합니다.
      return JSON.parse(savedTodos)
    } catch {
      return []
    }
  })
  const [newTodo, setNewTodo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState('all')

  // todos 상태가 Tasks 데이터의 단일 저장 원천입니다.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  // 입력 폼의 제목과 마감일로 새 Task를 생성해 목록 앞에 추가합니다.
  const handleAddTodo = (event) => {
    event.preventDefault()

    const title = newTodo.trim()

    if (!title) {
      return
    }

    const nextTask = createTask({ dueDate, title })

    if (!nextTask) {
      return
    }

    setTodos((currentTodos) => [nextTask, ...currentTodos])
    setNewTodo('')
    setDueDate('')
  }

  // 지정한 Task의 완료 상태를 반대로 전환합니다.
  const handleToggleTodo = (todoId) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  // 지정한 Task를 현재 목록에서 제거합니다.
  const handleDeleteTodo = (todoId) => {
    setTodos((currentTodos) =>
      currentTodos.filter((todo) => todo.id !== todoId),
    )
  }

  const completedCount = todos.filter((todo) => todo.completed).length
  const activeCount = todos.length - completedCount

  const filteredTodos = useMemo(() => {
    // 원본 todos는 그대로 두고 화면에 보여줄 목록만 필터링합니다.
    if (filter === 'active') {
      return todos.filter((todo) => !todo.completed)
    }

    if (filter === 'completed') {
      return todos.filter((todo) => todo.completed)
    }

    return todos
  }, [filter, todos])

  const currentFilterLabel = t.tasks[filter]

  return (
    <section className="module-panel todo-module" aria-labelledby="todo-title">
      {/* Tasks 상단 제목과 현재 필터 표시 영역 */}
      <div className="module-header todo-module-header">
        <div>
          <p className="module-label">{t.tasks.label}</p>
          <h2 id="todo-title">{t.tasks.title}</h2>
        </div>
        <p className="module-meta">
          {t.tasks.filter}: <span>{currentFilterLabel}</span>
        </p>
      </div>

      {/* Tasks 개수 요약 카드 */}
      <div className="status-stack task-stats" aria-label={t.tasks.summaryLabel}>
        <div className="status-card">
          <span>{t.tasks.total}</span>
          <strong>{todos.length}</strong>
        </div>
        <div className="status-card">
          <span>{t.tasks.active}</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="status-card">
          <span>{t.tasks.completed}</span>
          <strong>{completedCount}</strong>
        </div>
      </div>

      {/* 새 Task 입력 영역 */}
      <form className="todo-form" onSubmit={handleAddTodo}>
        <label className="sr-only" htmlFor="todo-input">
          {t.tasks.inputLabel}
        </label>
        <input
          id="todo-input"
          type="text"
          value={newTodo}
          onChange={(event) => setNewTodo(event.target.value)}
          placeholder={t.tasks.inputPlaceholder}
        />
        <label className="sr-only" htmlFor="todo-due-date">
          {t.tasks.dueDateLabel}
        </label>
        <input
          id="todo-due-date"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label={t.tasks.dueDateLabel}
        />
        <button type="submit">{t.tasks.add}</button>
      </form>

      {/* Task 필터 버튼 영역 */}
      <div className="todo-filters" aria-label={t.tasks.filtersLabel}>
        {FILTERS.map((item) => (
          <button
            className={`filter-button ${filter === item ? 'is-active' : ''}`}
            key={item}
            type="button"
            onClick={() => setFilter(item)}
          >
            {t.tasks[item]}
          </button>
        ))}
      </div>

      {/* Task 목록 또는 빈 상태 메시지 */}
      {filteredTodos.length > 0 ? (
        <ul className="todo-list" aria-label={t.tasks.listLabel}>
          {filteredTodos.map((todo) => (
            <li
              className={`todo-item ${todo.completed ? 'is-completed' : ''}`}
              key={todo.id}
            >
              <label className="todo-check">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo.id)}
                />
                <span>
                  {todo.title}
                  {normalizeDueDate(todo.dueDate) ? (
                    <small>{t.tasks.dueDateValue(todo.dueDate)}</small>
                  ) : null}
                </span>
              </label>
              <button
                type="button"
                className="delete-button"
                onClick={() => handleDeleteTodo(todo.id)}
              >
                {t.common.delete}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{t.tasks.emptyMessage}</p>
        </div>
      )}
    </section>
  )
}

export default Tasks
