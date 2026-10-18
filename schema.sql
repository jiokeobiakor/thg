create table slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null, slot_time text not null,
  booked boolean not null default false,
  unique (slot_date, slot_time)
);
create table bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid unique references slots(id) on delete cascade,
  name text not null, phone text not null, style text not null, notes text,
  created_at timestamptz default now()
);
create table styles (
  id uuid primary key default gen_random_uuid(),
  name text not null, price text, img text,
  created_at timestamptz default now()
);
create table settings (
  id int primary key default 1 check (id = 1),
  whatsapp text, pay_info text, instagram text
);
insert into settings (id, whatsapp, pay_info) values (1, '2347087344453', '');

alter table slots enable row level security;
alter table bookings enable row level security;
alter table styles enable row level security;
alter table settings enable row level security;

create policy "public sees open slots" on slots for select using (booked = false or auth.role() = 'authenticated');
create policy "admin manages slots" on slots for all to authenticated using (true) with check (true);
create policy "admin manages bookings" on bookings for all to authenticated using (true) with check (true);
create policy "public reads styles" on styles for select using (true);
create policy "admin manages styles" on styles for all to authenticated using (true) with check (true);
create policy "public reads settings" on settings for select using (true);
create policy "admin edits settings" on settings for update to authenticated using (true) with check (true);

-- photo storage
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
create policy "public reads photos" on storage.objects for select using (bucket_id = 'photos');
create policy "admin manages photos" on storage.objects for all to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');

-- clients book ONLY through this function (atomic, no double booking)
create or replace function book_slot(p_slot uuid, p_name text, p_phone text, p_style text, p_notes text)
returns boolean language plpgsql security definer as $$
begin
  update slots set booked = true where id = p_slot and booked = false;
  if not found then return false; end if;
  insert into bookings (slot_id, name, phone, style, notes) values (p_slot, p_name, p_phone, p_style, p_notes);
  return true;
end $$;
grant execute on function book_slot to anon;
