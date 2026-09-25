-- My Binder 2.0: independent curated binders. Existing card_favorites is unchanged.
create table if not exists public.user_binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 500),
  kind text not null default 'custom' check (kind in ('custom','dream')),
  is_public boolean not null default false,
  cover_card_id text,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index if not exists one_dream_binder_per_user
  on public.user_binders(user_id) where kind = 'dream';
create table if not exists public.user_binder_cards (
  binder_id uuid not null,
  user_id uuid not null,
  card_id text not null,
  position integer not null check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (binder_id, card_id),
  unique (binder_id, position),
  foreign key (binder_id, user_id) references public.user_binders(id, user_id) on delete cascade
);
create index if not exists user_binders_owner_idx on public.user_binders(user_id);
create index if not exists user_binder_cards_owner_idx on public.user_binder_cards(user_id);
alter table public.user_binders enable row level security;
alter table public.user_binder_cards enable row level security;
create policy "Owners manage binders" on public.user_binders
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Public binders readable" on public.user_binders
  for select to anon, authenticated using (is_public);
create policy "Owners manage binder cards" on public.user_binder_cards
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Public binder cards readable" on public.user_binder_cards
  for select to anon, authenticated using (
    exists (select 1 from public.user_binders b
      where b.id = binder_id and b.is_public)
  );
