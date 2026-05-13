import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'todo-manager-lite.todos'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

function Tasks() {
  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem(STORAGE_KEY)

    if (!savedTodos) {
      return []
    }

    try {
      return JSON.parse(savedTodos)
    } catch {
      return []
    }
  })
  const [newTodo, setNewTodo] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  const handleAddTodo = (event) => {
    event.preventDefault()

    const title = newTodo.trim()

    if (!title) {
      return
    }

    setTodos((currentTodos) => [
      {
        id: crypto.randomUUID(),
        title,
        completed: false,
      },
      ...currentTodos,
    ])
    setNewTodo('')
  }

  const handleToggleTodo = (todoId) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  const handleDeleteTodo = (todoId) => {
    setTodos((currentTodos) =>
      currentTodos.filter((todo) => todo.id !== todoId),
    )
  }

  const completedCount = todos.filter((todo) => todo.completed).length
  const activeCount = todos.length - completedCount

  const filteredTodos = useMemo(() => {
    if (filter === 'active') {
      return todos.filter((todo) => !todo.completed)
    }

    if (filter === 'completed') {
      return todos.filter((todo) => todo.completed)
    }

    return todos
  }, [filter, todos])

  const currentFilterLabel = FILTERS.find((item) => item.id === filter)?.label

  return (
    <section className="module-panel todo-module" aria-labelledby="todo-title">
      <div className="module-header todo-module-header">
        <div>
          <p className="module-label">TASK MODULE</p>
          <h2 id="todo-title">Task Queue</h2>
        </div>
        <p className="module-meta">
          FILTER: <span>{currentFilterLabel}</span>
        </p>
      </div>

      <div className="status-stack task-stats" aria-label="Task summary">
        <div className="status-card">
          <span>Total</span>
          <strong>{todos.length}</strong>
        </div>
        <div className="status-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="status-card">
          <span>Completed</span>
          <strong>{completedCount}</strong>
        </div>
      </div>

      <form className="todo-form" onSubmit={handleAddTodo}>
        <label className="sr-only" htmlFor="todo-input">
          Task input
        </label>
        <input
          id="todo-input"
          type="text"
          value={newTodo}
          onChange={(event) => setNewTodo(event.target.value)}
          placeholder="Enter a new task"
        />
        <button type="submit">Add</button>
      </form>

      <div className="todo-filters" aria-label="Task filters">
        {FILTERS.map((item) => (
          <button
            className={`filter-button ${filter === item.id ? 'is-active' : ''}`}
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredTodos.length > 0 ? (
        <ul className="todo-list" aria-label="Task list">
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
                <span>{todo.title}</span>
              </label>
              <button
                type="button"
                className="delete-button"
                onClick={() => handleDeleteTodo(todo.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state" role="status">
          <span>SYSTEM MESSAGE</span>
          <p>No tasks match the {currentFilterLabel} filter.</p>
        </div>
      )}
    </section>
  )
}

export default Tasks
