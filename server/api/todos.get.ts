import { getLiveTodos } from '../utils/todos'

export default defineEventHandler(async () => {
  const sessions = await getLiveTodos()
  return { sessions }
})
