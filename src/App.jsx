import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'todo-manager-lite.todos'

function App() {
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

  return (
    <main className="todo-app">
      <section className="todo-shell" aria-labelledby="todo-title">
        <div className="todo-header">
          <p className="eyebrow">Todo Manager Lite</p>
          <h1 id="todo-title">오늘 할 일</h1>
          <p className="todo-summary">
            {todos.length === 0
              ? '아직 등록된 할 일이 없습니다.'
              : `${todos.length}개 중 ${completedCount}개 완료`}
          </p>
        </div>

        <form className="todo-form" onSubmit={handleAddTodo}>
          <label className="sr-only" htmlFor="todo-input">
            할 일 입력
          </label>
          <input
            id="todo-input"
            type="text"
            value={newTodo}
            onChange={(event) => setNewTodo(event.target.value)}
            placeholder="할 일을 입력하세요"
          />
          <button type="submit">추가</button>
        </form>

        <ul className="todo-list" aria-label="할 일 목록">
          {todos.map((todo) => (
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
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
