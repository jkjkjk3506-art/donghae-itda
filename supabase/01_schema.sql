-- 동해시 AI 잇다: 스키마 + RLS  (Supabase SQL Editor에 그대로 붙여 실행)
create table public.businesses (
  id bigint primary key, name text not null, category text not null, sub_category text,
  trust_level smallint not null, source_count smallint, sources text, phone text, address text, dong text,
  licenses text, biz_status text, biz_type text, employees int, public_works text, public_works_total int default 0,
  homepage text, aliases text,
  visible boolean not null default false,      -- 시민 화면 노출
  is_newcomer boolean not null default false,  -- 실적 적은 업체(고르게 노출)
  is_demo boolean not null default false,      -- 시연용 가상 업체
  work_codes text[] not null default '{}',     -- 업체가 직접 고른 공정
  intro text, updated_by_owner_at timestamptz, created_at timestamptz not null default now()
);
create index on public.businesses (category);
create index on public.businesses (visible);
create table public.business_private (business_id bigint primary key references public.businesses(id) on delete cascade, biz_no text);
create table public.work_types (
  code text primary key, name text not null, plain_examples text[] not null default '{}', defect_hint text,
  db_categories text[] not null default '{}', program_tags text[] not null default '{}', license_note text, sort smallint default 0
);
create table public.programs (
  id text primary key, name text not null, level text, operator text,
  audience text not null default 'citizen',  -- citizen | store | facility | business | info
  donghae_status text, verification_status text, work_types text[] default '{}', building_types text[] default '{}',
  support_type text[] default '{}', requires text[] default '{}', amount_text text, max_krw bigint, eligibility jsonb,
  schedule_2026 text, expected_next text, apply_where text, contact text, contractor_opportunity text,
  keywords text[] default '{}', official_source_url text[] default '{}', verified_note text, verified_date date,
  active boolean not null default true, updated_at timestamptz not null default now()
);
create table public.legal_notes (
  code text primary key, work_codes text[] not null default '{*}',
  audience text not null default 'both' check (audience in ('citizen','contractor','both')),
  level text not null default 'info' check (level in ('info','warn','danger')),
  condition text, title text not null, body text not null, law text, sort smallint default 0
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','contractor')), display_name text, business_id bigint references public.businesses(id)
);
create table public.consultations (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  channel text not null default 'citizen' check (channel in ('citizen','counter','demo')),
  dong text, housing text, conditions text[] default '{}', input_text text, has_photo boolean default false,
  diagnosis jsonb, work_code text references public.work_types(code), program_ids text[] default '{}', business_ids bigint[] default '{}'
);
create table public.inquiries (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  consultation_id uuid references public.consultations(id) on delete set null,
  business_id bigint not null references public.businesses(id), citizen_name text not null, citizen_phone text not null,
  dong text, work_code text references public.work_types(code), message text, consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new','contacted','done','declined'))
);
create index on public.inquiries (business_id, created_at desc);
create table public.app_secrets (key text primary key, value text not null);

create or replace function public.my_role() returns text language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.my_business() returns bigint language sql stable security definer set search_path = public as
$$ select business_id from public.profiles where id = auth.uid() $$;

alter table public.businesses enable row level security;
alter table public.business_private enable row level security;
alter table public.work_types enable row level security;
alter table public.programs enable row level security;
alter table public.legal_notes enable row level security;
alter table public.profiles enable row level security;
alter table public.consultations enable row level security;
alter table public.inquiries enable row level security;
alter table public.app_secrets enable row level security;  -- 정책 없음 = 아무도 못 읽음

create policy "공개 업체 조회" on public.businesses for select using (visible or public.my_role() = 'admin' or id = public.my_business());
create policy "주무관 업체 수정" on public.businesses for update using (public.my_role() = 'admin');
create policy "업체 본인 정보 수정" on public.businesses for update using (id = public.my_business()) with check (id = public.my_business());
create policy "주무관만 사업자번호" on public.business_private for select using (public.my_role() = 'admin');
create policy "공정표 공개" on public.work_types for select using (true);
create policy "지원사업 공개" on public.programs for select using (active or public.my_role() = 'admin');
create policy "주무관 지원사업 수정" on public.programs for update using (public.my_role() = 'admin');
create policy "법적 안내 공개" on public.legal_notes for select using (true);
create policy "주무관 법적 안내 수정" on public.legal_notes for update using (public.my_role() = 'admin');
create policy "내 계정 조회" on public.profiles for select using (id = auth.uid());
create policy "상담 기록 저장" on public.consultations for insert with check (true);
create policy "주무관 상담 조회" on public.consultations for select using (public.my_role() = 'admin');
create policy "문의 보내기" on public.inquiries for insert with check (consent);
create policy "업체 내 문의 조회" on public.inquiries for select using (business_id = public.my_business() or public.my_role() = 'admin');
create policy "업체 문의 상태 변경" on public.inquiries for update using (business_id = public.my_business()) with check (business_id = public.my_business());

-- 업체 계정은 공정·소개·연락처만 수정 가능 (신뢰도·노출 순서 조작 방지)
create or replace function public.guard_owner_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() = 'contractor' then
    if (new.name, new.category, new.trust_level, new.visible, new.is_newcomer, new.licenses, new.public_works_total)
       is distinct from (old.name, old.category, old.trust_level, old.visible, old.is_newcomer, old.licenses, old.public_works_total) then
      raise exception '업체 계정은 공정·소개·연락처만 수정할 수 있습니다';
    end if;
    new.updated_by_owner_at := now();
  end if;
  return new;
end $$;
create trigger businesses_owner_guard before update on public.businesses for each row execute function public.guard_owner_update();
revoke execute on function public.guard_owner_update() from public, anon, authenticated;
