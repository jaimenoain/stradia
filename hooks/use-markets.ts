'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Market } from '@/types'

export function useMarkets() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      if (!supabase) {
        return [] as Market[]
      }

      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('name')

      if (error) {
        throw error
      }

      return data as Market[]
    },
    enabled: !!supabase,
  })
}
