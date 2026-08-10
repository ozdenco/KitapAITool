import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse, ToolUsage } from '@/types'

/** Backend planLabel göndermiyorsa limit'e göre tahmin et */
function resolvePlanLabel(u: ToolUsage): ToolUsage {
  if (u.planLabel) return u
  if (u.limit == null) return { ...u, planLabel: 'Admin' }
  if (u.limit <= 3) return { ...u, planLabel: 'Ücretsiz' }
  if (u.limit <= 10) return { ...u, planLabel: 'Standart' }
  if (u.limit <= 25) return { ...u, planLabel: 'Premium' }
  return { ...u, planLabel: 'Kurumsal' }
}

export function useToolUsage() {
  return useQuery({
    queryKey: ['tool-usage'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ToolUsage[]> | ToolUsage[]>('/tools/usage')
      // Backend {success, data} envelope veya ham array dönebilir
      const raw: ToolUsage[] = Array.isArray(data)
        ? data
        : ((data as ApiResponse<ToolUsage[]>).data ?? [])
      if (!Array.isArray(data) && !(data as ApiResponse<ToolUsage[]>).success) {
        throw new Error((data as ApiResponse<ToolUsage[]>).error)
      }
      return raw.map(resolvePlanLabel)
    },
    staleTime: 30_000,
  })
}

export function useToolUsageById(toolId: string) {
  const { data: usages, ...rest } = useToolUsage()
  const usage = usages?.find((u) => u.toolId === toolId)
  return { usage, ...rest }
}
