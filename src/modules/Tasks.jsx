import { useMemo, useState } from 'react'
import { normalizeDueDate } from './tasksLogic.js'
import useTasks from './tasks/useTasks.js'
import './Tasks.css'

const FILTERS = ['all', 'active', 'completed']

// Tasks 컴포넌트
function Tasks({ t }) {
  const {
    createTask,
    deleteTask,
    error: tasksError,
    loading: tasksLoading,
    tasks: todos,
    updateTask,
  } = useTasks()
  const [newTodo, setNewTodo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState('all')

  // Task 생성
  const handleAddTodo = async (event) => {
    event.preventDefault()

    const title = newTodo.trim()

    if (!title) {
      return
    }

    try {
      await createTask({ dueDate, title })
      setNewTodo('')
      setDueDate('')
    } catch {
      // 저장 실패 메시지는 hook error로 표시
    }
  }

  // Task 완료 토글
  const handleToggleTodo = async (todo) => {
    try {
      await updateTask(todo.id, {
        ...todo,
        completed: !todo.completed,
      })
    } catch {
      // 저장 실패 메시지는 hook error로 표시
    }
  }

  // Task 삭제
  const handleDeleteTodo = async (todoId) => {
    try {
      await deleteTask(todoId)
    } catch {
      // 저장 실패 메시지는 hook error로 표시
    }
  }

  const completedCount = todos.filter((todo) => todo.completed).length
  const activeCount = todos.length - completedCount

  const filteredTodos = useMemo(() => {
    // 화면 목록 필터만 state로 유지
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
      <div className="module-header todo-module-header">
        <div>
          <p className="module-label">{t.tasks.label}</p>
          <h2 id="todo-title">{t.tasks.title}</h2>
        </div>
        <p className="module-meta">
          {t.tasks.filter}: <span>{currentFilterLabel}</span>
        </p>
      </div>

      {tasksLoading ? (
        <p className="board-storage-status">Tasks 데이터를 불러오는 중입니다.</p>
      ) : null}
      {tasksError ? (
        <p className="board-storage-status is-error" role="alert">
          {tasksError}
        </p>
      ) : null}

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
                  onChange={() => handleToggleTodo(todo)}
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
