import { deleteManualTodo } from '../../utils/manualTodos'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })
  const ok = await deleteManualTodo(id)
  if (!ok) throw createError({ statusCode: 404, message: 'todo not found' })
  return { ok: true }
})
