import { getDateKey } from './calendarLogic.js'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// dueDate 형식 보존
export const normalizeDueDate = (dueDate) =>
  typeof dueDate === 'string' && DATE_KEY_PATTERN.test(dueDate) ? dueDate : ''

// Task 객체 생성
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

  // dueDate 선택 저장
  if (normalizedDueDate) {
    task.dueDate = normalizedDueDate
  }

  return task
}

// 날짜별 Task 반환
export const getTasksDueOnDate = (tasks, dateKey) =>
  tasks.filter((task) => normalizeDueDate(task.dueDate) === dateKey)

// 날짜별 미완료 Task
export const getActiveTasksDueOnDate = (tasks, dateKey) =>
  getTasksDueOnDate(tasks, dateKey).filter((task) => !task.completed)

// 오늘 마감 Task
export const getTodayDueTasks = (tasks, currentDate = new Date()) =>
  getActiveTasksDueOnDate(tasks, getDateKey(currentDate))

// Task 마감 배지 집계
export const countDueTasksByDate = (tasks) =>
  tasks.reduce((taskCounts, task) => {
    const dueDate = normalizeDueDate(task.dueDate)

    if (dueDate) {
      taskCounts[dueDate] = (taskCounts[dueDate] ?? 0) + 1
    }

    return taskCounts
  }, {})
