import { createTask } from '../utils/tasks'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.title?.trim()) throw createError({ statusCode: 400, message: 'title is required' })
  const task = await createTask(body.title.trim(), body.description?.trim(), body.status)
  return { task }
})
