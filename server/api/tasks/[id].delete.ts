import { deleteTask } from '../../utils/tasks'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })
  const ok = await deleteTask(id)
  if (!ok) throw createError({ statusCode: 404, message: 'task not found' })
  return { ok: true }
})
