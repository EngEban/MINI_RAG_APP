import { useOutletContext } from 'react-router-dom'
import type { AppRouteContext } from '../types'
export { useTheme } from './useTheme'

export const useProjectId = () => {
  return useOutletContext<AppRouteContext>().projectId
}

export const useAppContext = () => useOutletContext<AppRouteContext>()
