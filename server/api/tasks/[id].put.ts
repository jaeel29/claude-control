import { updateTask } from '../../utils/tasks'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })
  const body = await readBody(event)
  const task = await updateTask(id, body)
  if (!task) throw createError({ statusCode: 404, message: 'task not found' })
  return { task }
})
