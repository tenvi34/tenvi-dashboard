import { getDateKey } from './calendarLogic.js'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const normalizeDueDate = (dueDate) =>
  typeof dueDate === 'string' && DATE_KEY_PATTERN.test(dueDate) ? dueDate : ''

export const createTask = ({ dueDate = '', id, title }) => {
  const normalizedTitle = title.trim()
  const normalizedDueDate = normalizeDueDate(dueDate)

  if (!normalizedTitle) {
    return null
  }

  const task = {
    id: id ?? crypto.randomUUID(),
    title: normalizedTitle,
    completed: false,
  }

  // dueDate는 선택 필드라서 값이 있을 때만 저장해 기존 Tasks 데이터 구조와 자연스럽게 공존시킵니다.
  if (normalizedDueDate) {
    task.dueDate = normalizedDueDate
  }

  return task
}

export const getTasksDueOnDate = (tasks, dateKey) =>
  tasks.filter((task) => normalizeDueDate(task.dueDate) === dateKey)

export const getActiveTasksDueOnDate = (tasks, dateKey) =>
  getTasksDueOnDate(tasks, dateKey).filter((task) => !task.completed)

export const getTodayDueTasks = (tasks, currentDate = new Date()) =>
  getActiveTasksDueOnDate(tasks, getDateKey(currentDate))

export const countDueTasksByDate = (tasks) =>
  tasks.reduce((taskCounts, task) => {
    const dueDate = normalizeDueDate(task.dueDate)

    if (dueDate) {
      taskCounts[dueDate] = (taskCounts[dueDate] ?? 0) + 1
    }

    return taskCounts
  }, {})
