import { updateManualTodo } from '../../utils/manualTodos'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })
  const { status } = await readBody(event)
  const ok = await updateManualTodo(id, status)
  if (!ok) throw createError({ statusCode: 404, message: 'todo not found' })
  return { ok: true }
})
