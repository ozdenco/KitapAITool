import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse, ToolUsage } from '@/types'

export function useToolUsage() {
  return useQuery({
    queryKey: ['tool-usage'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ToolUsage[]> | ToolUsage[]>('/tools/usage')
      // Backend {success, data} envelope veya ham array dönebilir
      if (Array.isArray(data)) return data
      if (!data.success) throw new Error((data as ApiResponse<ToolUsage[]>).error)
      return (data as ApiResponse<ToolUsage[]>).data ?? []
    },
    staleTime: 30_000,
  })
}

export function useToolUsageById(toolId: string) {
  const { data: usages, ...rest } = useToolUsage()
  const usage = usages?.find((u) => u.toolId === toolId)
  return { usage, ...rest }
}
