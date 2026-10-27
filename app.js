if (location.hash.includes("type=recovery")) location.replace("reset.html" + location.hash);
const db = supabase.createClient(CFG.url, CFG.key);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
let slots = [], pick = null, cfg = { instagram: "thehairgallery_thg" };
const igUser = () => String(cfg.instagram || "").replace(/^.*instagram\.com\//, "").replace(/^@/, "").split(/[/?]/)[0] || "thehairgallery_thg";
const say = m => $("msg").innerHTML = m;

async function init() {
  const [{ data: st }, { data: se }, { data: tr }, { data: pr }, { data: sc }] = await Promise.all([
    db.from("styles").select("*").order("created_at"),
    db.from("settings").select("id,instagram").eq("id", 1).single(),
    db.rpc("trending_styles"),
    db.from("products").select("*").eq("active", true).order("created_at"),
    db.from("site_content").select("key,body")]);
  const TRD = new Set(tr || []);
  if (se && se.instagram) cfg = se;
  const list = st || [];
  $("grid").innerHTML = list.map(s => `<figure class="reveal" data-s="${esc(s.name)}">${TRD.has(s.name) ? '<span class="badge">Trending</span>' : ""}<img src="${esc(s.img)}" alt="${esc(s.name)}" loading="lazy" decoding="async"><figcaption>${esc(s.name)}<small>${s.price ? esc(s.price) : "Ask on Instagram"}</small></figcaption></figure>`).join("") || `<p class="sub">Gallery coming soon 💜</p>`;
  $("style").innerHTML = list.map(s => `<option>${esc(s.name)}</option>`).join("");
  const pl = pr || []; $("shop").hidden = !pl.length; $("shoplink").hidden = !pl.length;
  $("pgrid").innerHTML = pl.map(p => `<figure class="reveal">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : ""}<figcaption>${esc(p.name)}<small>${p.price ? esc(p.price) : "Ask on Instagram"}</small></figcaption>${p.description ? `<p class="pd">${esc(p.description)}</p>` : ""}<button class="btn sm" type="button" data-p="${p.id}" data-n="${esc(p.name)}"${p.stock === 0 ? " disabled" : ""}>${p.stock === 0 ? "Sold out" : "Order"}</button></figure>`).join("");
  renderContent(sc || []);
  document.body.insertAdjacentHTML("beforeend", `<a class="btn dm" target="_blank" rel="noopener noreferrer" href="https://ig.me/m/${esc(igUser())}">📸<span> Chat on Instagram</span></a>`);
}
$("grid").addEventListener("error", e => { if (e.target.tagName === "IMG") e.target.remove(); }, true);
$("grid").onclick = e => { const f = e.target.closest("figure"); if (f) { $("style").value = f.dataset.s; $("book").scrollIntoView(); } };

function lines(t) { return String(t || "").split("\n").map(l => l.trim()).filter(Boolean); }
function parseList(t) { const out = []; let c = null; lines(t).forEach(l => { if (l.startsWith("# ")) { c = { title: l.slice(2), items: [] }; out.push(c); } else { if (!c) { c = { title: "", items: [] }; out.push(c); } c.items.push(l); } }); return out; }
function parsePrices(t) {
  const out = []; let s = null, g = null; const sec = () => s || (s = { title: "", groups: [] }, out.push(s), s);
  lines(t).forEach(l => {
    if (l.startsWith("## ")) { g = { title: l.slice(3), rows: [] }; sec().groups.push(g); }
    else if (l.startsWith("# ")) { s = { title: l.slice(2), groups: [] }; out.push(s); g = null; }
    else { if (!g) { g = { title: "", rows: [] }; sec().groups.push(g); } const [a, ...b] = l.split("|"); g.rows.push([a.trim(), b.join("|").trim()]); }
  });
  return out;
}
function renderContent(rows) {
  const m = Object.fromEntries(rows.map(r => [r.key, r.body || ""]));
  const sv = parseList(m.services); $("services").hidden = !sv.length;
  $("svc").innerHTML = sv.map(x => `<div class="panel">${x.title ? `<h3>${esc(x.title)}</h3>` : ""}<ul>${x.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("");
  const pr = parsePrices(m.prices); $("prices").hidden = !pr.length;
  $("prl").innerHTML = pr.map(s => (s.title ? `<h3 class="stitle">${esc(s.title)}</h3>` : "") + s.groups.map(g => `<div class="pgroup">${g.title ? `<h3>${esc(g.title)}</h3>` : ""}${g.rows.map(([a, b]) => `<div class="pr"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("")}</div>`).join("")).join("");
  $("pnote").hidden = !m.price_note; $("pnote").textContent = m.price_note || "";
  const po = lines(m.policies); $("policies").hidden = !po.length && !m.policy_note;
  $("pol").innerHTML = po.map((l, i) => { const [a, ...b] = l.split("|"); return `<div><span class="n">${i + 1}</span><span><b>${esc(a.trim())}</b><p>${esc(b.join("|").trim())}</p></span></div>`; }).join("");
  $("polnote").hidden = !m.policy_note; $("polnote").textContent = m.policy_note || "";
}
async function load() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from("slots").select("*").eq("booked", false).gte("slot_date", today).order("slot_date").order("slot_time");
  slots = data || [];
  const days = [...new Set(slots.map(s => s.slot_date))];
  $("date").innerHTML = days.length ? days.map(d => `<option value="${d}">${new Date(d + "T00:00").toDateString()}</option>`).join("") : `<option value="">No dates open yet</option>`;
  times();
}
function times() {
  pick = null;
  $("times").innerHTML = slots.filter(s => s.slot_date === $("date").value).map(s => `<button type="button" class="t" data-id="${s.id}">${esc(s.slot_time)}</button>`).join("");
}
$("date").onchange = times;
$("times").onclick = e => { const b = e.target.closest(".t"); if (!b) return; pick = b.dataset.id; document.querySelectorAll(".t").forEach(x => x.classList.toggle("on", x === b)); };
$("form").onsubmit = async e => {
  e.preventDefault();
  if (!me) return (location.href = "login.html");
  if (!pick) return say("Pick a time first 💜");
  const s = slots.find(x => x.id === pick), style = $("style").value, name = who().name, pre = [$("bsize").value, $("blen").value].filter(Boolean).join(" / "), col = window.Studio ? Studio.text() : "";
  const { data, error } = await db.rpc("book_slot", { p_slot: pick, p_name: name, p_phone: who().phone, p_style: style, p_notes: (pre ? `[${pre}] ` : "") + (col ? col + ". " : "") + $("notes").value });
  if (error) return say(esc(error.message || "Something went wrong, try again."));
  if (!data) { say("Sorry, that slot was just taken. Pick another."); return load(); }
  const t = `Hi! I'm ${name}. I just booked ${style}${pre ? " (" + pre + ")" : ""}${col ? ", " + col : ""} on ${s.slot_date} at ${s.slot_time}. Can we confirm the price?`;
  e.target.reset(); if (window.Studio) Studio.reset();
  const { data: pay } = await db.rpc("get_pay_info");
  say(`Booked! ✅ Last step: message us on Instagram to confirm your price.<br>${pay ? `<br><b>Payment details:</b><br>${esc(pay).replace(/\n/g, "<br>")}<br><br>` : ""}<button class="btn" id="cp" type="button">Copy booking details</button> <a class="btn" target="_blank" rel="noopener noreferrer" href="https://ig.me/m/${esc(igUser())}">Open Instagram DM 📸</a>`);
  $("cp").onclick = async () => { try { await navigator.clipboard.writeText(t); $("cp").textContent = "Copied ✅ Paste it in the DM"; } catch { $("cp").textContent = "Copy failed. Type your details in the DM."; } };
  load(); hist();
};

let me = null;
let prof = {};
const who = () => ({ name: prof.full_name || me.email.split("@")[0], phone: prof.phone || "" });
async function account() {
  const { data } = await db.auth.getSession(); me = data.session?.user || null;
  if (!me) { $("bk").textContent = "Log in to book"; $("as").textContent = "Log in to book. It takes 10 seconds 💜"; return; }
  const { data: pr } = await db.from("profiles").select("full_name,phone").eq("user_id", me.id).maybeSingle(); prof = pr || {};
  $("delme").onclick = async e => { e.preventDefault(); if (!confirm("Delete your account and all your booking history? This cannot be undone.")) return; const { error } = await db.rpc("delete_my_account"); if (error) return alert(error.message); await db.auth.signOut({ scope: "local" }); location.href = "index.html"; };
  $("as").textContent = "Booking as " + who().name + " 👑"; $("agree").required = true; $("mylink").hidden = false; $("mine").hidden = false;
  $("acct").textContent = "Logout"; $("acct").href = "#";
  $("acct").onclick = async e => { e.preventDefault(); await db.auth.signOut(); location.reload(); };
  // Owner only: link back to the admin pages
  const { data: adm } = await db.rpc("is_admin"); $("dash").hidden = !adm;
  hist();
}
async function hist() {
  if (!me) return;
  const { data } = await db.from("bookings").select("*").eq("user_id", me.id).order("created_at", { ascending: false });
  const tag = { upcoming: "⏳ Upcoming", done: "✅ Done", cancelled: "✖ Cancelled" };
  $("hist").innerHTML = (data || []).map(b => `<div class="row"><span><b>${esc(b.style)}</b><br>${b.slot_date ? new Date(b.slot_date + "T00:00").toDateString() + " · " + esc(b.slot_time) : ""}${b.final_price != null ? " · " + esc(b.currency || "") + " " + Number(b.final_price).toLocaleString() : ""}</span><span>${tag[b.status] || ""}</span></div>`).join("") || "No bookings yet. Your history will appear here 👑";
  const { data: od } = await db.from("orders").select("*").eq("user_id", me.id).order("created_at", { ascending: false });
  const ot = { requested: "⏳ Requested", sold: "✅ Sold", cancelled: "✖ Cancelled" };
  $("ohist").innerHTML = (od || []).map(o => `<div class="row"><span><b>${esc(o.product_name)} × ${o.qty}</b><br>${esc(o.created_at.slice(0, 10))}${o.final_price != null ? " · " + esc(o.currency || "") + " " + Number(o.final_price).toLocaleString() : ""}</span><span>${ot[o.status] || ""}</span></div>`).join("") || "No orders yet.";
}
let ordId = null;
$("pgrid").addEventListener("error", e => { if (e.target.tagName === "IMG") e.target.remove(); }, true);
$("pgrid").onclick = e => { const b = e.target.closest("button[data-p]"); if (!b || b.disabled) return; if (!me) return (location.href = "login.html"); ordId = b.dataset.p; $("otitle").textContent = b.dataset.n; $("oq").value = 1; $("on").value = ""; $("om").textContent = ""; $("od").showModal(); };
$("of").onsubmit = async e => {
  e.preventDefault(); $("osend").disabled = true;
  const { error } = await db.rpc("place_order", { p_product: ordId, p_qty: parseInt($("oq").value, 10), p_note: $("on").value });
  $("osend").disabled = false; if (error) { $("om").textContent = error.message; return; }
  $("od").close(); $("shopmsg").innerHTML = `Request sent ✅ Message us on Instagram to arrange payment and pickup. <a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://ig.me/m/${esc(igUser())}">Open Instagram DM 📸</a>`; hist();
};
init(); load(); account();
