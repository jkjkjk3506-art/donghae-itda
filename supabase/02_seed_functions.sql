-- 일회용 데이터 적재 함수. <SEED_TOKEN> 을 Vercel SEED_TOKEN 과 같은 값으로 바꿔 실행.
-- 적재가 끝나면 맨 아래 revoke 두 줄을 꼭 실행하세요.
insert into public.app_secrets values ('seed_token','<SEED_TOKEN>') on conflict (key) do update set value = excluded.value;

create or replace function public.seed_import(token text, kind text, payload jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if token is distinct from (select value from app_secrets where key='seed_token') then raise exception 'invalid token'; end if;
  if kind = 'work_types' then
    insert into work_types select * from jsonb_populate_recordset(null::work_types, payload)
    on conflict (code) do update set name=excluded.name, plain_examples=excluded.plain_examples, defect_hint=excluded.defect_hint,
      db_categories=excluded.db_categories, program_tags=excluded.program_tags, license_note=excluded.license_note, sort=excluded.sort;
  elsif kind = 'programs' then
    insert into programs (id,name,level,operator,audience,donghae_status,verification_status,work_types,building_types,support_type,requires,amount_text,max_krw,eligibility,schedule_2026,expected_next,apply_where,contact,contractor_opportunity,keywords,official_source_url,verified_note,verified_date)
    select id,name,level,operator,audience,donghae_status,verification_status,work_types,building_types,support_type,requires,amount_text,max_krw,eligibility,schedule_2026,expected_next,apply_where,contact,contractor_opportunity,keywords,official_source_url,verified_note,verified_date
    from jsonb_populate_recordset(null::programs, payload)
    on conflict (id) do update set name=excluded.name, audience=excluded.audience, work_types=excluded.work_types, building_types=excluded.building_types,
      support_type=excluded.support_type, requires=excluded.requires, amount_text=excluded.amount_text, max_krw=excluded.max_krw, eligibility=excluded.eligibility,
      schedule_2026=excluded.schedule_2026, expected_next=excluded.expected_next, apply_where=excluded.apply_where, contact=excluded.contact,
      contractor_opportunity=excluded.contractor_opportunity, keywords=excluded.keywords, official_source_url=excluded.official_source_url,
      verified_note=excluded.verified_note, verified_date=excluded.verified_date, updated_at=now();
  elsif kind = 'businesses' then
    insert into businesses (id,name,category,sub_category,trust_level,source_count,sources,phone,address,dong,licenses,biz_status,biz_type,employees,public_works,public_works_total,homepage,aliases,visible,is_newcomer)
    select id,name,category,sub_category,trust_level,source_count,sources,phone,address,dong,licenses,biz_status,biz_type,employees,public_works,public_works_total,homepage,aliases,visible,is_newcomer
    from jsonb_populate_recordset(null::businesses, payload)
    on conflict (id) do update set name=excluded.name, category=excluded.category, sub_category=excluded.sub_category, trust_level=excluded.trust_level,
      source_count=excluded.source_count, sources=excluded.sources, phone=excluded.phone, address=excluded.address, licenses=excluded.licenses,
      biz_status=excluded.biz_status, public_works=excluded.public_works, public_works_total=excluded.public_works_total, visible=excluded.visible, is_newcomer=excluded.is_newcomer;
  elsif kind = 'business_private' then
    insert into business_private select * from jsonb_populate_recordset(null::business_private, payload)
    on conflict (business_id) do update set biz_no=excluded.biz_no;
  else raise exception 'unknown kind %', kind;
  end if;
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.seed_legal(token text, payload jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if token is distinct from (select value from app_secrets where key='seed_token') then raise exception 'invalid token'; end if;
  insert into legal_notes select * from jsonb_populate_recordset(null::legal_notes, payload)
  on conflict (code) do update set work_codes=excluded.work_codes, audience=excluded.audience, level=excluded.level,
    condition=excluded.condition, title=excluded.title, body=excluded.body, law=excluded.law, sort=excluded.sort;
  get diagnostics n = row_count; return n;
end $$;

revoke all on function public.seed_import(text,text,jsonb) from public;
revoke all on function public.seed_legal(text,jsonb) from public;
grant execute on function public.seed_import(text,text,jsonb) to anon;
grant execute on function public.seed_legal(text,jsonb) to anon;

-- ▼ /api/seed?token=... 실행이 끝난 뒤 실행
-- revoke execute on function public.seed_import(text,text,jsonb) from anon, authenticated;
-- revoke execute on function public.seed_legal(text,jsonb) from anon, authenticated;
