-- Enable RLS for Template Engine Tables (if not already enabled, though previous migration did it)

-- Templates Policies
create policy "Enable access for users in the same organization"
on public.templates
for all
using (owner_org_id = public.get_my_org_id())
with check (owner_org_id = public.get_my_org_id());

-- Template Versions Policies
create policy "Enable access based on parent template"
on public.template_versions
for all
using (
  exists (
    select 1 from public.templates t
    where t.id = template_id
    and t.owner_org_id = public.get_my_org_id()
  )
)
with check (
  exists (
    select 1 from public.templates t
    where t.id = template_id
    and t.owner_org_id = public.get_my_org_id()
  )
);

-- Template Tasks Policies
create policy "Enable access based on parent version"
on public.template_tasks
for all
using (
  exists (
    select 1 from public.template_versions tv
    join public.templates t on t.id = tv.template_id
    where tv.id = template_version_id
    and t.owner_org_id = public.get_my_org_id()
  )
)
with check (
  exists (
    select 1 from public.template_versions tv
    join public.templates t on t.id = tv.template_id
    where tv.id = template_version_id
    and t.owner_org_id = public.get_my_org_id()
  )
);
