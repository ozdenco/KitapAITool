import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse, ToolUsage } from '@/types'

export function useToolUsage() {
  return useQuery({
    queryKey: ['tool-usage'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ToolUsage[]>>('/tools/usage')
      if (!data.success) throw new Error(data.error)
      return data.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useToolUsageById(toolId: string) {
  const { data: usages, ...rest } = useToolUsage()
  const usage = usages?.find((u) => u.toolId === toolId)
  return { usage, ...rest }
}
