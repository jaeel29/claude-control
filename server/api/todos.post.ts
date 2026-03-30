import { addManualTodo } from '../utils/manualTodos'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const content: string = body?.content?.trim()
  if (!content) throw createError({ statusCode: 400, message: 'content is required' })
  const todo = await addManualTodo(content)
  return { todo }
})
