-- Run in Supabase SQL editor. Provisions public.users + secure RLS + spend helper.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  subscriptionTier text not null default 'none',
  basePlanExpiry timestamptz,
  coinBalance integer not null default 0,
  dailyAllowance integer not null default 0,
  hasAiPack boolean not null default false,
  aiPackExpiry timestamptz,
  dailyAiRequestsRemaining integer not null default 0,
  lastDailyResetAt timestamptz,
  dailyShowroomDownloadsCount integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile row when a new auth user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, lastDailyResetAt)
  values (new.id, new.email, now())
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic coin spend (optional — client falls back to guarded update).
create or replace function public.spend_feature(p_cost integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select coinBalance into bal from public.users where id = uid for update;
  if bal is null then
    raise exception 'user profile missing';
  end if;
  if bal < p_cost then
    raise exception 'insufficient coins';
  end if;
  update public.users
  set coinBalance = bal - p_cost, updated_at = now()
  where id = uid;
end;
$$;

grant execute on function public.spend_feature(integer) to authenticated;
