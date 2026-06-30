-- CTA click breakdown for the analytics dashboard. The `leads` table already
-- records WhatsApp / call / directions clicks (lead_type/action set by the
-- listing CTA buttons); this surfaces them split by type, scoped to a date range.

create or replace function analytics_cta_breakdown(p_from timestamptz, p_to timestamptz)
returns table (cta text, clicks bigint)
language sql security definer set search_path = public as $$
  select coalesce(lead_type, action) as cta, count(*)
  from leads
  where created_at >= p_from and created_at <= p_to
    and coalesce(lead_type, action) in ('whatsapp', 'call', 'directions_maps', 'directions_waze')
  group by 1
  order by 2 desc;
$$;

notify pgrst, 'reload schema';
