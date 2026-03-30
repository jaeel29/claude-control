import { getRunHistory } from '../../utils/runHistory'

export default defineEventHandler(() => {
  return { history: getRunHistory() }
})
