import { getDateKey } from './calendarLogic.js'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// 기존 task와 새 task의 dueDate 값을 YYYY-MM-DD 형식일 때만 유지합니다.
export const normalizeDueDate = (dueDate) =>
  typeof dueDate === 'string' && DATE_KEY_PATTERN.test(dueDate) ? dueDate : ''

// 입력값을 정리해 저장 가능한 Task 객체를 생성합니다.
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

// 지정한 날짜에 마감되는 Task 목록을 반환합니다.
export const getTasksDueOnDate = (tasks, dateKey) =>
  tasks.filter((task) => normalizeDueDate(task.dueDate) === dateKey)

// 지정한 날짜에 마감되는 미완료 Task 목록을 반환합니다.
export const getActiveTasksDueOnDate = (tasks, dateKey) =>
  getTasksDueOnDate(tasks, dateKey).filter((task) => !task.completed)

// 오늘 날짜에 마감되는 미완료 Task 목록을 반환합니다.
export const getTodayDueTasks = (tasks, currentDate = new Date()) =>
  getActiveTasksDueOnDate(tasks, getDateKey(currentDate))

// Calendar 배지에 사용할 날짜별 Task 마감 개수를 집계합니다.
export const countDueTasksByDate = (tasks) =>
  tasks.reduce((taskCounts, task) => {
    const dueDate = normalizeDueDate(task.dueDate)

    if (dueDate) {
      taskCounts[dueDate] = (taskCounts[dueDate] ?? 0) + 1
    }

    return taskCounts
  }, {})
