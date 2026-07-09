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

// localStorage/REMOTE 응답 Task 구조 보정
export const normalizeTask = (task, fallbackCreatedAt = new Date().toISOString()) => {
  const title = String(task?.title ?? '').trim()

  if (!task?.id || !title) {
    return null
  }

  const normalizedTask = {
    id: String(task.id),
    title,
    completed: task.completed === true,
  }
  const dueDate = normalizeDueDate(task.dueDate)

  if (dueDate) {
    normalizedTask.dueDate = dueDate
  }

  if (task.createdAt) {
    normalizedTask.createdAt = String(task.createdAt)
  } else if (task.updatedAt || task.deletedAt) {
    normalizedTask.createdAt = fallbackCreatedAt
  }

  if (task.updatedAt) {
    normalizedTask.updatedAt = String(task.updatedAt)
  }

  if (task.deletedAt) {
    normalizedTask.deletedAt = String(task.deletedAt)
  }

  return normalizedTask
}

export const parseTasks = (rawTasks, fallbackTasks = []) => {
  if (!rawTasks) {
    return fallbackTasks
  }

  try {
    const parsedTasks = JSON.parse(rawTasks)

    return Array.isArray(parsedTasks)
      ? parsedTasks.map((task) => normalizeTask(task)).filter(Boolean)
      : []
  } catch {
    return []
  }
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
