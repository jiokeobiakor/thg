# The Hair Gallery: full install guide (final bundle)

Do the parts in order. Each part says what to check before moving on.

## What this bundle adds
- Mobile-first redesign: menu button, 2 photos per row on phones, 48px tap targets, no sideways scrolling, installable like an app.
- Services, Price List and Policies sections (editable by the owner in the dashboard), policy tick-box when booking, size and length choices.
- Colour studio: tap real hair-colour swatches, see a live braid preview (solid, mixed or ombre).
- Wording: "final prices can be discussed via Instagram DM". Instagram DM is the only contact route.
- Dashboard: tabs, price pop-up when she taps Done, permanent Register with search, filters and CSV export, revenue by month, trending styles, best sellers.
- Shop for oils and other goods, with order requests, stock and a "record a sale" form.
- Edit button for My styles and My products (name, price, photo, stock). Renaming a style also updates old records.
- Email alert to the owner for every new booking and every product order request.

## Part 1: Copy the files (VS Code, folder `thg`)
Replace or add these files. Do NOT touch `config.js` (it holds your real Supabase keys) or your existing `img/` photos.

Website files (these get pushed to GitHub):
`index.html login.html reset.html admin.html privacy.html styles.css app.js admin.js login.js reset.js ui.js studio.js manifest.json vercel.json _headers .gitignore`
and in `img/`: `icon-192.png icon-512.png`

Keep on your laptop only (never push; `.gitignore` already blocks them):
`shop-and-analytics.sql content-and-policies.sql notifications.sql security-test.html`

Check: the folder has `studio.js`, `ui.js` and `manifest.json` next to `index.html`.

## Part 2: Database (Supabase, SQL Editor, run each file once, in this order)
Already done earlier: schema, migration-accounts, security-hardening 1, 2, 3, remove-whatsapp.
Now run:
1. `shop-and-analytics.sql` (prices on appointments, shop, orders, trending, safer account deletion)
2. `content-and-policies.sql` (services, price list, policies, sets currency to HUF)
3. `notifications.sql` (email alerts; also needs Part 3)

For each: open the file in VS Code, Ctrl+A, Ctrl+C, SQL Editor, New query, paste, Run.
Check: Table Editor now shows `products`, `orders`, `site_content`.
If a file says something "already exists", that file was run before. Skip it.

## Part 3: Email alerts (free Resend account)
1. Go to resend.com and sign up with the OWNER'S email address (the inbox that should receive alerts).
2. API Keys, Create API key, permission "Sending access". Copy the key (starts with `re_`).
3. Supabase, Database, Extensions: make sure `pg_net` is switched on.
4. Supabase, SQL Editor, run (put your real key in): `select vault.create_secret('re_YOUR_KEY_HERE', 'resend_key');`
   (Or Supabase, Integrations, Vault, Add secret, name `resend_key`.)
5. Later, in Part 5, enter the same owner email in the dashboard and press Send test email.
Rules: with the free sender address, Resend only delivers to the email you signed up with. To send to a different address you must verify a domain in Resend.
Free plan: 100 emails per day, which is plenty.

## Part 4: Publish
```
git add .
git commit -m "final bundle"
git push
```
Wait until Vercel (or Netlify) says Ready. Open the site, hard refresh (Ctrl+Shift+R). On a phone, use the browser menu, Add to Home Screen, to install it like an app.

## Part 5: First-time dashboard set-up (owner)
Log in at /login.html. Then:
1. Setup, Settings: Instagram username, Main currency (HUF), Email for booking alerts, payment details, Save. Press Send test email. "200" means it worked. Check inbox and spam.
2. Setup, Website content: read the prices and policies, fix anything, add the missing price categories, Save.
3. Setup, Add a hairstyle: upload photos (they are shrunk automatically so the site loads fast). Use Edit to change names, prices or photos later.
4. Setup, Add availability: dates and times.
5. Shop: add products (oil, edge control and so on) with photos and stock.

## Part 6: Test everything (10 minutes)
1. Phone: menu opens, gallery shows 2 per row, nothing slides sideways.
2. Make a client account, pick colours in the Colour studio, book. Check "My bookings".
3. Owner phone: email arrives, Appointments tab shows the booking with colours in the notes.
4. Tap Done, enter the agreed price. Open Register: the record and price appear. Dashboard: revenue updates.
5. Order a product as a client, then in Shop tap Sold and enter the price.
6. Run `security-test.html` (Live Server) with a test client: every line should say PASS.

## Daily use
- Appointments tab: "Needs closing" (past, not finished) and "Upcoming". Done asks for the final price.
- Register: every appointment and order forever. Search, filter by date or status, Export CSV for accounts.
- Dashboard: revenue by month, top styles, trending (pin one to show a Trending badge), best-selling products.

## Good to know
- Policies are shown and accepted when booking, but fees (500 FT lateness) and the 48-hour rule are applied by the owner by hand.
- The price list only has the categories that were in the screenshots (large, medium, small braids or twists, Fulani). Add the rest in Website content.
- Colour codes (1B, 27, 613, 99J and so on) are approximate. Brands differ slightly, so the braider confirms the exact shade.
- Emails are plain text only, on purpose, so client-typed text cannot be used for tricks.

## Troubleshooting
- Nothing changes after a push: hard refresh, then check the newest Vercel deployment says Ready.
- Test email says an error or no result: check the key name is exactly `resend_key`, the dashboard email matches the Resend account email, and `pg_net` is on.
- Shop or price sections missing: Part 2 files 1 and 2 have not been run.
- Admin page bounces to the main site: the account is not in the admins table (see the earlier migration step).
