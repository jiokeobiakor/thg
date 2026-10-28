# Sales kit: booking websites for braiders and salons

## The offer
"Your own booking website: clients pick a style, see your prices, book and order products. You get a dashboard with every booking, sales by month and an email for each new booking. No more lost DMs."

| Package | Price (Nigeria) | Price (Europe) | What they get |
|---|---|---|---|
| Starter | ₦120,000 one-off + ₦10,000/month | €150 + €12/month | Site with their name, logo, photos, prices, booking and dashboard |
| Pro | ₦220,000 one-off + ₦15,000/month | €280 + €18/month | Starter + shop for products + email alerts + 1 hour of training |

- Take **50% upfront**, 50% when the site goes live.
- The monthly fee covers hosting checks, small edits (prices, photos) and support.
- First 3 clients: give 30% off in return for a testimonial and permission to show their site as a demo.

## Where to find clients
- Instagram: search #lagosbraider #abujabraids #braidsbudapest #londonbraider #knotlessbraids plus your city.
- Pick accounts with 500–20k followers whose bio says "DM to book". They have the problem you solve.
- Facebook groups for salon owners, WhatsApp status, your campus, family and friends who know salon owners.
- Aim for **20 DMs a day**. Expect roughly 1 sale per 30–50 DMs at the start.

## DM scripts (send from YOUR own account)

**First message**
> Hi [name]! Your [style] work is clean 🔥 Quick question: do you still take bookings only through DMs? I built a booking site for a braider ([demo link]). Clients pick a style, see prices and book, and she gets an email each time. Want me to send a 1-min video of how it works?

**If they say yes**
> Here you go: [video/demo link]. I can set one up with your name, photos and prices in about 5 days. Starter is [price]. Want me to send a quick mock-up with your logo first? No charge.

**Follow-up (3 days later, only once)**
> Hey [name], just checking if you saw the demo. Happy to answer any questions 🙏

**If they say it's too expensive**
> I understand. I can do it in 2 payments, half now and half when it's live. And you only need 2–3 extra bookings a month to cover it.

Rules: be polite, never spam the same person more than twice, stop if they say no.

## LinkedIn post
> I built a full booking website for a hair business as a student project that turned real 💇🏾‍♀️
>
> ✅ Clients book online and pick sizes, lengths and colours
> ✅ The owner gets an email for every booking
> ✅ Dashboard with revenue by month, best-selling styles and a CSV export
> ✅ A shop for oils and hair products, with stock tracking
>
> Stack: HTML/JS, Supabase, Vercel.
>
> I'm now setting this up for other salons and braiders. If you or someone you know runs a beauty business that still takes bookings only through DMs, send me a message 👇
>
> #webdevelopment #smallbusiness #MIS #supabase #beautybusiness

## Per-client checklist
1. Get 50% deposit and a signed agreement (below).
2. Collect: business name, logo, 6–12 photos, Instagram handle, services and prices, policies, currency, owner email.
3. `python3 sell/new_client.py "Their Name" SHORT their_ig` → creates `clients/<name>/`.
4. Make a **new Supabase project** for them (never reuse The Hair Gallery's). Run the SQL files from your laptop in the order in `SETUP.md`. Paste their URL and publishable key into `config.js`.
5. Add their `img/logo.jpg` and photos. Deploy the folder as a new Vercel project. Connect their domain if they bought one.
6. Make their owner account, show them the dashboard, take the other 50%.
7. Update `privacy.html` with their details. The privacy page is a draft: they should check it for their country.

## Simple agreement (copy into a doc, both sign)
> **Website agreement**
> Between [Your name] ("Developer") and [Client business] ("Client"). Date: ____
> 1. Developer builds a booking website with the Client's name, photos and prices within [7] days of receiving all content.
> 2. Price: [amount]. 50% before work starts, 50% when the site is live. Monthly support: [amount], paid by the [5th] of each month. Either side can stop the monthly support with 30 days' notice.
> 3. Client owns their content and their customer data. Developer keeps the right to reuse the website code for other clients.
> 4. Client is responsible for their own prices, policies and following local data and consumer laws.
> 5. Hosting and database run on free plans. If the Client needs a paid plan or a domain, the Client pays that cost.
> Signed: ________ (Developer) ________ (Client)

## Invoice template
> **INVOICE #[001]**  Date: ____
> From: [Your name], [email/phone]
> To: [Client business]
> Booking website setup (Starter/Pro): [amount]
> Deposit received: [amount]
> **Balance due: [amount]** by [date]
> Pay to: [bank name, account name, account number]

## Legal and safety notes
- Register as a business or sole trader when income becomes regular (CAC Business Name in Nigeria; *egyéni vállalkozó* in Hungary). Declare the income for tax.
- Never ask clients for their Instagram or email passwords. They make their own Supabase, Resend and Vercel logins, or you make them with *their* email and hand over the passwords on day one.
- Only DM business accounts, and stop when someone says no.
- Use The Hair Gallery as a demo only with the owner's permission.
