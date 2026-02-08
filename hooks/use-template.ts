'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Template, TemplateVersion, TemplateTask } from '@/types'

export function useTemplate(templateId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError) throw templateError

      // Fetch versions
      const { data: versions, error: versionsError } = await supabase
        .from('template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })

      if (versionsError) throw versionsError

      let tasks: TemplateTask[] = []

      // If there are versions, fetch tasks for the latest version
      if (versions && versions.length > 0) {
        const latestVersion = versions[0]
        const { data: fetchedTasks, error: tasksError } = await supabase
          .from('template_tasks')
          .select('*')
          .eq('template_version_id', latestVersion.id)
          .order('weight', { ascending: true })

        if (tasksError) throw tasksError
        tasks = fetchedTasks as TemplateTask[]
      }

      return {
        template: template as Template,
        versions: versions as TemplateVersion[],
        tasks,
      }
    },
    enabled: !!templateId,
  })
}
