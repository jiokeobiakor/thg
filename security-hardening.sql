-- Run ONCE in Supabase SQL Editor (after migration-accounts.sql)

-- 1. Photo uploads: images only, max 5 MB
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'photos';

-- 2. Hard limits on text size (stops junk or huge data)
alter table bookings add constraint bookings_len check (char_length(name) between 1 and 80 and char_length(phone) <= 25 and char_length(style) <= 80 and coalesce(char_length(notes),0) <= 300) not valid;
alter table styles   add constraint styles_len   check (char_length(name) between 1 and 80 and coalesce(char_length(price),0) <= 40) not valid;
alter table settings add constraint settings_len check (coalesce(char_length(pay_info),0) <= 500 and coalesce(char_length(instagram),0) <= 40 and coalesce(char_length(whatsapp),0) <= 20) not valid;
alter table slots    add constraint slots_len    check (char_length(slot_time) <= 20) not valid;

-- 3. Safer booking function: validates input, real hairstyle only, no past dates, max 2 upcoming bookings per client
create or replace function book_slot(p_slot uuid, p_name text, p_phone text, p_style text, p_notes text)
returns boolean language plpgsql security definer set search_path = public as $$
declare s slots%rowtype; n int;
begin
  if auth.uid() is null then raise exception 'Please log in to book.'; end if;
  p_name := left(btrim(coalesce(p_name,'')), 80);
  p_phone := left(btrim(coalesce(p_phone,'')), 25);
  p_notes := left(btrim(coalesce(p_notes,'')), 300);
  if p_name = '' then raise exception 'Name is missing on your account.'; end if;
  if not exists (select 1 from styles where name = p_style) then raise exception 'That hairstyle does not exist.'; end if;
  select count(*) into n from bookings where user_id = auth.uid() and status = 'upcoming';
  if n >= 2 then raise exception 'You already have 2 upcoming bookings. Please wait until one is done.'; end if;
  update slots set booked = true where id = p_slot and booked = false and slot_date >= current_date returning * into s;
  if not found then return false; end if;
  insert into bookings (slot_id, user_id, name, phone, style, notes, slot_date, slot_time)
  values (p_slot, auth.uid(), p_name, p_phone, p_style, p_notes, s.slot_date, s.slot_time);
  return true;
end $$;
