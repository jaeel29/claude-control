import { readTasks } from '../utils/tasks'

export default defineEventHandler(async () => {
  const tasks = await readTasks()
  return { tasks }
})
