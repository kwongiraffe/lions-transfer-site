create extension if not exists pgcrypto;

create table if not exists public.transfer_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('ticket', 'goods')),
  trade_type text not null check (trade_type in ('sell', 'buy')),
  opponent text,
  game_date date,
  seat text,
  quantity integer check (quantity is null or quantity > 0),
  item_name text,
  price integer not null check (price >= 0),
  kakao_url text,
  description text not null default '-',
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfer_posts_ticket_fields check (
    category <> 'ticket'
    or opponent is not null
  ),
  constraint transfer_posts_goods_fields check (
    category <> 'goods'
    or item_name is not null
  )
);

create index if not exists transfer_posts_created_at_idx
  on public.transfer_posts (created_at desc);

create index if not exists transfer_posts_category_trade_idx
  on public.transfer_posts (category, trade_type, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transfer_posts_set_updated_at on public.transfer_posts;
create trigger transfer_posts_set_updated_at
before update on public.transfer_posts
for each row
execute function public.set_updated_at();

alter table public.transfer_posts enable row level security;

revoke all on public.transfer_posts from anon;
grant usage on schema public to anon;
grant select, insert on public.transfer_posts to anon;
grant update (is_done) on public.transfer_posts to anon;

drop policy if exists "Anyone can read transfer posts" on public.transfer_posts;
create policy "Anyone can read transfer posts"
on public.transfer_posts
for select
to anon
using (true);

drop policy if exists "Anyone can create transfer posts" on public.transfer_posts;
create policy "Anyone can create transfer posts"
on public.transfer_posts
for insert
to anon
with check (true);

drop policy if exists "Anyone can update done status" on public.transfer_posts;
create policy "Anyone can update done status"
on public.transfer_posts
for update
to anon
using (true)
with check (true);

alter table public.transfer_posts replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transfer_posts'
  ) then
    alter publication supabase_realtime add table public.transfer_posts;
  end if;
end;
$$;
