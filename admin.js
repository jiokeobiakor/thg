const db = supabase.createClient(CFG.url, CFG.key);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const today = () => new Date().toISOString().slice(0, 10);
const CURS = ["NGN", "HUF", "EUR", "USD", "GBP"]; let DEFCUR = "NGN";
const money = (n, c) => (c || DEFCUR) + " " + Number(n || 0).toLocaleString("en", { maximumFractionDigits: 2 });
const short = n => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(Math.round(n));
const opt = (arr, sel) => arr.map(x => `<option${x === sel ? " selected" : ""}>${esc(x)}</option>`).join("");
const safeQ = s => s.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 40);
const csvCell = v => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
const ym = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
const ago = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const tag = s => `<em class="tag ${esc(s)}">${esc(s)}</em>`;
async function shrink(file, max = 1200, q = .82) {
  if (!file || !file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bm = await createImageBitmap(file, { imageOrientation: "from-image" }), s = Math.min(1, max / Math.max(bm.width, bm.height)), c = document.createElement("canvas");
    c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s); c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}
let STYLES = [], PRODS = [], curTab = "dash", rrows = {}, rpage = 0, rkind = "";
const PS = 25;

// ---------- access guard ----------
db.auth.getSession().then(async ({ data }) => {
  if (!data.session) return location.replace("login.html");
  const { data: l } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (l && l.nextLevel === "aal2" && l.currentLevel !== "aal2") return location.replace("login.html");
  const { data: a } = await db.rpc("is_admin");
  a ? boot() : location.replace("index.html");
});
$("out").onclick = async () => { await db.auth.signOut(); location.href = "login.html"; };
async function boot() { $("panel").hidden = false; await loadSet(); fillCurs(); mfaStatus(); const h0 = location.hash.slice(1); go(TABS[h0] ? h0 : "dash"); }
function fillCurs() { $("dc").innerHTML = $("wc").innerHTML = $("mu").innerHTML = $("cu").innerHTML = opt(CURS, DEFCUR); }

// ---------- tabs ----------
$("tabs").onclick = e => { const b = e.target.closest("button[data-t]"); if (b) { location.hash = b.dataset.t; } };
addEventListener("hashchange", () => { const t = location.hash.slice(1); if (TABS[t] && !$("panel").hidden) go(t); });
const TABS = { dash: () => loadDash(), appt: () => loadAppt(), reg: () => initReg(), shop: () => loadShop(), dates: () => loadSlots(), styles: () => loadStyles(), content: () => loadContent(), set: () => {} };
function go(t) {
  curTab = t; scrollTo(0, 0);
  document.querySelectorAll(".tab").forEach(x => x.hidden = x.id !== "t-" + t);
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === t));
  TABS[t]();
}

// ---------- edit dialog (styles and products) ----------
function editDlg(kind, row) {
  return new Promise(res => {
    $("et").textContent = kind === "style" ? "Edit hairstyle" : "Edit product";
    $("en").value = row.name || ""; $("ep").value = row.price || ""; $("ed").value = row.description || ""; $("es").value = row.stock == null ? "" : row.stock;
    $("edw").hidden = $("esw").hidden = kind === "style"; $("eimg").src = row.img || ""; $("eimg").hidden = !row.img;
    $("efile").value = ""; document.querySelector("#ef .fileup span").textContent = "Keep current photo";
    const d = $("edlg"); d.returnValue = "";
    d.onclose = () => res(d.returnValue === "ok" ? { name: $("en").value.trim(), price: $("ep").value.trim() || null, description: $("ed").value.trim() || null, stock: $("es").value.trim() === "" ? null : Math.max(0, parseInt($("es").value, 10) || 0), file: $("efile").files[0] || null } : null);
    d.showModal();
  });
}
$("efile").addEventListener("change", () => { const f = $("efile").files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $("eimg").src = r.result; $("eimg").hidden = false; }; r.readAsDataURL(f); });
async function uploadPhoto(file) { const f = await shrink(file), path = "e-" + Date.now() + "-" + f.name.replace(/[^\w.]/g, "_"); const up = await db.storage.from("photos").upload(path, f); if (up.error) { alert(up.error.message); return null; } return db.storage.from("photos").getPublicUrl(path).data.publicUrl; }

// ---------- price dialog ----------
function ask({ title, price = "", cur = DEFCUR, note = "" }) {
  return new Promise(res => {
    $("dt").textContent = title; $("dp").value = price ?? ""; $("dc").value = cur || DEFCUR; $("dn").value = note || "";
    const d = $("dlg"); d.returnValue = "";
    d.onclose = () => res(d.returnValue === "ok" ? { price: parseFloat($("dp").value), cur: $("dc").value, note: $("dn").value.trim() } : null);
    d.showModal();
  });
}

// ---------- appointments ----------
const apptRow = b => `<div class="row"><span><b>${esc(b.slot_date)} · ${esc(b.slot_time)}</b><br>${esc(b.name)} · ${esc(b.phone)} · ${esc(b.style)}${b.notes ? "<br><i>" + esc(b.notes) + "</i>" : ""}</span><span><button data-a="done" data-id="${b.id}">Done ✓</button> <button data-a="cancel" data-id="${b.id}">Cancel</button></span></div>`;
async function ensureStyles() { const { data } = await db.from("styles").select("*").order("created_at"); STYLES = data || []; return STYLES; }
async function loadAppt() {
  const { data } = await db.from("bookings").select("*").eq("status", "upcoming").order("slot_date").order("slot_time").limit(300);
  const t = today(), r = data || [], od = r.filter(b => b.slot_date < t), up = r.filter(b => !(b.slot_date < t));
  $("od").innerHTML = od.map(apptRow).join("") || "All caught up ✅"; $("odc").textContent = od.length;
  $("up").innerHTML = up.map(apptRow).join("") || "No upcoming appointments."; $("upc").textContent = up.length;
  await ensureStyles(); $("ws").innerHTML = opt(STYLES.map(s => s.name)); if (!$("wd").value) $("wd").value = t;
}
$("wf").onsubmit = async e => {
  e.preventDefault(); const d = $("wd").value;
  const { error } = await db.from("bookings").insert({ name: $("wn").value.trim(), phone: "", style: $("ws").value, slot_date: d, slot_time: "walk-in", status: "done", final_price: parseFloat($("wp").value), currency: $("wc").value, done_at: d + "T12:00:00Z" });
  if (error) return alert(error.message);
  e.target.reset(); fillCurs(); alert("Saved ✅"); loadAppt();
};

// ---------- register ----------
function setStatusOpts() { const a = $("rk").value === "appt"; rkind = $("rk").value; $("rs").innerHTML = '<option value="">All statuses</option>' + (a ? ["done", "upcoming", "cancelled"] : ["sold", "requested", "cancelled"]).map(x => `<option>${x}</option>`).join(""); }
function initReg() { if (rkind !== $("rk").value) setStatusOpts(); loadReg(0); }
$("rk").onchange = () => { setStatusOpts(); loadReg(0); };
$("rgo").onclick = () => loadReg(0); $("rp").onclick = () => loadReg(rpage - 1); $("rn").onclick = () => loadReg(rpage + 1);
function regQ(cols, count) {
  const a = $("rk").value === "appt", f = $("rf").value, t = $("rt").value, st = $("rs").value, q = safeQ($("rq").value.trim()), dc = a ? "slot_date" : "created_at";
  let r = db.from(a ? "bookings" : "orders").select(cols, count ? { count: "exact" } : undefined);
  if (f) r = r.gte(dc, f); if (t) r = r.lte(dc, a ? t : t + "T23:59:59");
  if (st) r = r.eq("status", st);
  if (q) r = r.or(a ? `name.ilike.%${q}%,style.ilike.%${q}%` : `customer_name.ilike.%${q}%,product_name.ilike.%${q}%`);
  return r.order(dc, { ascending: false });
}
const regAppt = b => `<div class="row"><span><b>${esc(b.slot_date)} · ${esc(b.slot_time)}</b> ${tag(b.status)}<br>${esc(b.name)} · ${esc(b.style)}${b.final_price != null ? " · <b>" + esc(money(b.final_price, b.currency)) + "</b>" : (b.status === "done" ? " · <i>no price saved</i>" : "")}${b.admin_note ? "<br><i>" + esc(b.admin_note) + "</i>" : ""}</span><span>${b.status === "cancelled" ? "" : `<button data-a="redit" data-id="${b.id}">${b.status === "done" ? "Edit" : "Done ✓"}</button>`}</span></div>`;
const regOrd = o => `<div class="row"><span><b>${esc((o.sold_at || o.created_at).slice(0, 10))}</b> ${tag(o.status)}<br>${esc(o.product_name)} × ${o.qty} · ${esc(o.customer_name || "Walk-in")}${o.final_price != null ? " · <b>" + esc(money(o.final_price, o.currency)) + "</b>" : ""}${o.admin_note ? "<br><i>" + esc(o.admin_note) + "</i>" : ""}</span><span>${o.status === "sold" ? `<button data-a="oedit" data-id="${o.id}">Edit</button>` : ""}</span></div>`;
async function loadReg(p) {
  rpage = Math.max(0, p); const a = $("rk").value === "appt";
  const { data, count, error } = await regQ("*", true).range(rpage * PS, rpage * PS + PS - 1);
  if (error) { $("rl").textContent = error.message; return; }
  rrows = {}; (data || []).forEach(x => rrows[x.id] = x);
  $("rl").innerHTML = (data || []).map(a ? regAppt : regOrd).join("") || "No records match.";
  const pages = Math.max(1, Math.ceil((count || 0) / PS));
  $("rpg").textContent = `Page ${rpage + 1} of ${pages} · ${count || 0}`; $("rp").disabled = rpage === 0; $("rn").disabled = rpage + 1 >= pages;
  const { data: all } = await regQ("final_price,currency,status", false).limit(5000);
  const tot = {}; (all || []).forEach(x => { if (x.final_price != null && (x.status === "done" || x.status === "sold")) { const c = x.currency || DEFCUR; tot[c] = (tot[c] || 0) + +x.final_price; } });
  $("rsum").textContent = Object.keys(tot).length ? "Total in this view: " + Object.entries(tot).map(([c, v]) => money(v, c)).join(" · ") : "";
}
$("rcsv").onclick = async () => {
  const a = $("rk").value === "appt"; const { data } = await regQ("*", false).limit(5000);
  const cols = a ? ["slot_date", "slot_time", "status", "name", "phone", "style", "final_price", "currency", "notes", "admin_note"] : ["created_at", "sold_at", "status", "customer_name", "customer_phone", "product_name", "qty", "final_price", "currency", "note", "admin_note"];
  const csv = [cols.join(",")].concat((data || []).map(r => cols.map(k => csvCell(r[k])).join(","))).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); const el = document.createElement("a");
  el.href = url; el.download = `thg-${a ? "appointments" : "orders"}-${today()}.csv`; el.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// ---------- dashboard ----------
const bars = it => { const mx = Math.max(1, ...it.map(x => x[1])); return it.map(([l, v, t]) => `<div class="hb"><div class="hl"><span>${esc(l)}</span><span>${esc(t)}</span></div><div class="hr"><div style="width:${Math.max(4, v / mx * 100)}%"></div></div></div>`).join("") || '<p class="sub">No data yet.</p>'; };
function chart(months, S) {
  const mx = Math.max(1, ...months.map(m => S[m][0] + S[m][1])), W = 600, bw = 34, gap = (W - bw * 12) / 13;
  return `<svg viewBox="0 0 600 215" class="chart" role="img" aria-label="Revenue by month">` + months.map((m, i) => {
    const x = gap + i * (bw + gap), h1 = S[m][0] / mx * 150, h2 = S[m][1] / mx * 150, tot = S[m][0] + S[m][1];
    return `<rect x="${x}" y="${185 - h1}" width="${bw}" height="${h1}" rx="4" class="s"/><rect x="${x}" y="${185 - h1 - h2}" width="${bw}" height="${h2}" rx="4" class="g"/><text x="${x + bw / 2}" y="${177 - h1 - h2}" text-anchor="middle" class="v">${tot ? short(tot) : ""}</text><text x="${x + bw / 2}" y="203" text-anchor="middle">${m.slice(5)}/${m.slice(2, 4)}</text>`;
  }).join("") + "</svg>";
}
async function loadDash() {
  const [b, o] = await Promise.all([db.from("bookings").select("style,final_price,currency,status,slot_date").limit(5000), db.from("orders").select("product_name,qty,final_price,currency,sold_at").eq("status", "sold").limit(5000)]);
  const bk = b.data || [], od = o.data || []; await ensureStyles();
  const curs = [...new Set([...bk, ...od].filter(x => x.final_price != null).map(x => x.currency || DEFCUR))]; if (!curs.length) curs.push(DEFCUR);
  const keep = $("cur").value; $("cur").innerHTML = opt(curs, curs.includes(keep) ? keep : curs.includes(DEFCUR) ? DEFCUR : curs[0]);
  const cur = $("cur").value, per = $("per").value, now = new Date();
  const cut = per === "all" ? "0000-00-00" : per === "m" ? ym(now) + "-01" : ym(new Date(now.getFullYear(), now.getMonth() - (+per - 1), 1)) + "-01";
  const inP = d => d >= cut, same = x => x.final_price != null && (x.currency || DEFCUR) === cur, sum = a => a.reduce((s, x) => s + Number(x.final_price), 0);
  const svc = bk.filter(x => x.status === "done" && same(x) && inP(x.slot_date)), gds = od.filter(x => same(x) && inP((x.sold_at || "").slice(0, 10)));
  const nDone = bk.filter(x => x.status === "done" && inP(x.slot_date)).length, nCan = bk.filter(x => x.status === "cancelled" && inP(x.slot_date)).length;
  const months = []; for (let i = 11; i >= 0; i--) months.push(ym(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const S = Object.fromEntries(months.map(m => [m, [0, 0]]));
  bk.filter(x => x.status === "done" && same(x)).forEach(x => { const m = x.slot_date.slice(0, 7); if (S[m]) S[m][0] += +x.final_price; });
  od.filter(same).forEach(x => { const m = (x.sold_at || "").slice(0, 7); if (S[m]) S[m][1] += +x.final_price; });
  const tm = S[months[11]], lm = S[months[10]], tT = tm[0] + tm[1], lT = lm[0] + lm[1], ch = lT ? Math.round((tT - lT) / lT * 100) : null;
  const card = (v, l) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`;
  $("stats").innerHTML = card(money(sum(svc) + sum(gds), cur), "Revenue (period)") + card(money(sum(svc), cur), "Appointments") + card(money(sum(gds), cur), "Products") + card(String(nDone), "Appointments done") + card(svc.length ? money(sum(svc) / svc.length, cur) : "–", "Average per appointment") + card(nDone + nCan ? Math.round(nCan / (nDone + nCan) * 100) + "%" : "–", "Cancellation rate") + card(money(tT, cur), "This month" + (ch == null ? "" : ` (${ch >= 0 ? "+" : ""}${ch}% vs last)`));
  $("chart").innerHTML = chart(months, S);
  const live = bk.filter(x => x.status !== "cancelled"), cnt = {}, rev = {};
  live.filter(x => inP(x.slot_date)).forEach(x => { cnt[x.style] = (cnt[x.style] || 0) + 1; }); svc.forEach(x => { rev[x.style] = (rev[x.style] || 0) + +x.final_price; });
  $("topS").innerHTML = bars(Object.entries(cnt).sort((a, c) => c[1] - a[1]).slice(0, 8).map(([k, v]) => [k, v, `${v} booking${v > 1 ? "s" : ""}${rev[k] ? " · " + money(rev[k], cur) : ""}`]));
  const t = today(), d30 = ago(30), d60 = ago(60), c1 = {}, c0 = {};
  live.forEach(x => { if (x.slot_date >= d30 && x.slot_date <= t) c1[x.style] = (c1[x.style] || 0) + 1; else if (x.slot_date >= d60 && x.slot_date < d30) c0[x.style] = (c0[x.style] || 0) + 1; });
  $("trend").innerHTML = Object.entries(c1).sort((a, c) => c[1] - a[1]).slice(0, 5).map(([k, v]) => {
    const p = c0[k] || 0, g = p ? Math.round((v - p) / p * 100) : null, st = STYLES.find(s => s.name === k);
    return `<div class="row"><span><b>${esc(k)}</b> ${st && st.trending ? '<em class="tag trend">Pinned</em>' : ""}<br><span class="sub">${v} in 30 days · ${g == null ? "new" : (g >= 0 ? "▲ +" : "▼ ") + g + "%"}</span></span><span>${st ? `<button data-a="pin" data-id="${st.id}" data-v="${!st.trending}">${st.trending ? "Unpin" : "Pin"}</button>` : ""}</span></div>`;
  }).join("") || '<p class="sub">Not enough bookings in the last 30 days yet.</p>';
  const pc = {}; od.filter(x => same(x) && inP((x.sold_at || "").slice(0, 10))).forEach(x => { const r = pc[x.product_name] = pc[x.product_name] || [0, 0]; r[0] += x.qty; r[1] += +x.final_price; });
  $("topP").innerHTML = bars(Object.entries(pc).sort((a, c) => c[1][1] - a[1][1]).slice(0, 8).map(([k, v]) => [k, v[1], `${v[0]} sold · ${money(v[1], cur)}`]));
  const wd = [0, 0, 0, 0, 0, 0, 0]; live.filter(x => inP(x.slot_date)).forEach(x => { wd[new Date(x.slot_date + "T00:00").getDay()]++; });
  $("wk").innerHTML = bars(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((n, i) => [n, wd[i], String(wd[i])]));
}
$("cur").onchange = $("per").onchange = loadDash;

// ---------- shop ----------
const adjStock = async (pid, d) => { if (!pid) return; const { data: p } = await db.from("products").select("stock").eq("id", pid).single(); if (p && p.stock != null) await db.from("products").update({ stock: Math.max(0, p.stock + d) }).eq("id", pid); };
async function loadShop() {
  const [p, o] = await Promise.all([db.from("products").select("*").order("created_at"), db.from("orders").select("*").eq("status", "requested").order("created_at")]);
  PRODS = p.data || []; $("plist").innerHTML = PRODS.map(x => `<option value="${esc(x.name)}">`).join("");
  $("pl").innerHTML = PRODS.map(x => `<div class="row"><span>${x.img ? `<img src="${esc(x.img)}" width="40" height="40" style="border-radius:8px;vertical-align:middle;object-fit:cover"> ` : ""}<b>${esc(x.name)}</b> · ${esc(x.price || "Ask on Instagram")}<br><span class="sub">${x.stock == null ? "Stock not tracked" : x.stock + " in stock"} · ${x.active ? "Visible" : "Hidden"}</span></span><span><button data-a="pedit" data-id="${x.id}">Edit</button> <button data-a="pact" data-id="${x.id}">${x.active ? "Hide" : "Show"}</button> <button data-a="pdel" data-id="${x.id}">Delete</button></span></div>`).join("") || "No products yet.";
  const r = o.data || []; $("ordc").textContent = r.length;
  $("ord").innerHTML = r.map(x => `<div class="row"><span><b>${esc(x.product_name)} × ${x.qty}</b><br>${esc(x.customer_name)} · ${esc(x.customer_phone)}${x.note ? "<br><i>" + esc(x.note) + "</i>" : ""}<br><span class="sub">${esc(x.created_at.slice(0, 10))}</span></span><span><button data-a="sold" data-id="${x.id}">Sold ✓</button> <button data-a="ocancel" data-id="${x.id}">Cancel</button></span></div>`).join("") || "No open requests.";
}
$("pf").onsubmit = async e => {
  e.preventDefault(); let img = null; let f = $("pi2").files[0]; if (f) f = await shrink(f);
  if (f) { const path = "p-" + Date.now() + "-" + f.name.replace(/[^\w.]/g, "_"); const up = await db.storage.from("photos").upload(path, f); if (up.error) return alert(up.error.message); img = db.storage.from("photos").getPublicUrl(path).data.publicUrl; }
  const st = $("ps").value.trim();
  const { error } = await db.from("products").insert({ name: $("pn").value.trim(), price: $("pp").value.trim() || null, stock: st === "" ? null : parseInt(st, 10), description: $("pd").value.trim() || null, img });
  error ? alert(error.message) : (e.target.reset(), loadShop());
};
$("mf").onsubmit = async e => {
  e.preventDefault(); const name = $("mpn").value.trim(), q = parseInt($("mq").value, 10), p = PRODS.find(x => x.name === name), now = new Date().toISOString();
  const { error } = await db.from("orders").insert({ product_id: p ? p.id : null, product_name: name, qty: q, customer_name: $("mc").value.trim(), status: "sold", final_price: parseFloat($("mp").value), currency: $("mu").value, sold_at: now, created_at: now });
  if (error) return alert(error.message); if (p) await adjStock(p.id, -q);
  e.target.reset(); fillCurs(); $("mq").value = 1; alert("Saved ✅"); loadShop();
};

// ---------- setup ----------
async function loadSetup() { await Promise.all([loadSlots(), loadStyles(), loadContent()]); }
const CK = { services: "cs", prices: "cp", policies: "cpo", price_note: "cpn", policy_note: "cpl" };
async function loadContent() { const { data } = await db.from("site_content").select("key,body"); (data || []).forEach(r => { if (CK[r.key]) $(CK[r.key]).value = r.body; }); }
$("cf").onsubmit = async e => {
  e.preventDefault(); const now = new Date().toISOString();
  const rows = Object.entries(CK).map(([key, id]) => ({ key, body: $(id).value.trim(), updated_at: now }));
  const { error } = await db.from("site_content").upsert(rows, { onConflict: "key" }); alert(error ? error.message : "Website content saved ✅");
};
async function loadSlots() {
  const { data } = await db.from("slots").select("*").eq("booked", false).gte("slot_date", today()).order("slot_date").order("slot_time").limit(300);
  const g = {}; (data || []).forEach(s => (g[s.slot_date] = g[s.slot_date] || []).push(s));
  $("slots").innerHTML = Object.entries(g).map(([d, a]) => `<div class="row"><span><b>${esc(d)}</b><br>${a.map(s => `<span class="chip">${esc(s.slot_time)} <button data-a="rm" data-id="${s.id}" aria-label="Remove">×</button></span>`).join(" ")}</span></div>`).join("") || "No open dates. Add some above.";
}
async function loadStyles() {
  await ensureStyles();
  $("sl").innerHTML = STYLES.map(s => `<div class="row"><span><img src="${esc(s.img)}" width="40" style="border-radius:8px;vertical-align:middle"> ${esc(s.name)} · ${esc(s.price || "Ask on Instagram")}${s.trending ? ' <em class="tag trend">Trending</em>' : ""}</span><span><button data-a="pin" data-id="${s.id}" data-v="${!s.trending}">${s.trending ? "Unpin" : "Pin"}</button> <button data-a="sedit" data-id="${s.id}">Edit</button> <button data-a="sdel" data-id="${s.id}">Delete</button></span></div>`).join("") || "No styles yet.";
}
$("add").onsubmit = async e => {
  e.preventDefault();
  const rows = $("t").value.split(",").map(x => x.trim()).filter(Boolean).map(t => ({ slot_date: $("d").value, slot_time: t }));
  const { error } = await db.from("slots").upsert(rows, { onConflict: "slot_date,slot_time", ignoreDuplicates: true });
  error ? alert(error.message) : (e.target.reset(), loadSlots());
};
$("sf").onsubmit = async e => {
  e.preventDefault();
  const f = await shrink($("si").files[0]), path = Date.now() + "-" + f.name.replace(/[^\w.]/g, "_");
  const up = await db.storage.from("photos").upload(path, f); if (up.error) return alert(up.error.message);
  const { data } = db.storage.from("photos").getPublicUrl(path);
  const { error } = await db.from("styles").insert({ name: $("sn").value, price: $("sp").value || null, img: data.publicUrl });
  error ? alert(error.message) : (e.target.reset(), loadStyles());
};
async function loadSet() {
  const { data } = await db.from("settings").select("instagram,currency").eq("id", 1).single(); const { data: pi } = await db.rpc("get_pay_info"); const { data: ne } = await db.rpc("get_notify_email"); $("ne").value = ne || "";
  if (data) { $("ig").value = data.instagram || ""; if (data.currency) DEFCUR = data.currency; } $("pi").value = pi || "";
}
$("set").onsubmit = async e => {
  e.preventDefault(); const { error } = await db.from("settings").update({ instagram: $("ig").value.trim(), currency: $("cu").value, pay_info: $("pi").value, notify_email: $("ne").value.trim() || null }).eq("id", 1);
  if (!error) DEFCUR = $("cu").value; alert(error ? error.message : "Saved ✅");
};

$("mtest").onclick = async () => {
  $("mstat").textContent = "Sending… (save your email first)"; const { error } = await db.rpc("send_test_email"); if (error) { $("mstat").textContent = error.message; return; }
  setTimeout(async () => { const { data, error: e2 } = await db.rpc("email_status"); $("mstat").textContent = e2 ? e2.message : "Result: " + data + " (200 = sent. Check your inbox and spam)"; }, 4500);
};

// ---------- row actions ----------
const A = {
  done: async id => { const r = await ask({ title: "Agreed price for this appointment" }); if (!r) return; const { error } = await db.from("bookings").update({ status: "done", final_price: r.price, currency: r.cur, done_at: new Date().toISOString(), admin_note: r.note || null }).eq("id", id); if (error) alert(error.message); loadAppt(); },
  cancel: async id => { if (!confirm("Cancel this booking and reopen the slot?")) return; const { data: b } = await db.from("bookings").select("slot_id").eq("id", id).single(); await db.from("bookings").update({ status: "cancelled", slot_id: null }).eq("id", id); if (b && b.slot_id) await db.from("slots").update({ booked: false }).eq("id", b.slot_id); loadAppt(); },
  rm: async id => { await db.from("slots").delete().eq("id", id); loadSlots(); },
  pin: async (id, b) => { await db.from("styles").update({ trending: b.dataset.v === "true" }).eq("id", id); go(curTab); },
  sedit: async id => {
    const s = STYLES.find(x => x.id === id); if (!s) return; const r = await editDlg("style", s); if (!r) return;
    let img = s.img; if (r.file) { img = await uploadPhoto(r.file); if (!img) return; }
    const { error } = await db.from("styles").update({ name: r.name, price: r.price, img }).eq("id", id); if (error) return alert(error.message);
    if (r.name !== s.name) await db.from("bookings").update({ style: r.name }).eq("style", s.name);
    go(curTab);
  },
  sdel: async id => { if (confirm("Delete this style?")) { await db.from("styles").delete().eq("id", id); loadStyles(); } },
  redit: async id => { const b = rrows[id]; const r = await ask({ title: b.status === "done" ? "Edit price and note" : "Agreed price", price: b.final_price, cur: b.currency, note: b.admin_note }); if (!r) return; await db.from("bookings").update({ status: "done", final_price: r.price, currency: r.cur, admin_note: r.note || null, done_at: b.done_at || new Date().toISOString() }).eq("id", id); loadReg(rpage); },
  oedit: async id => { const o = rrows[id]; const r = await ask({ title: "Edit sale", price: o.final_price, cur: o.currency, note: o.admin_note }); if (!r) return; await db.from("orders").update({ final_price: r.price, currency: r.cur, admin_note: r.note || null }).eq("id", id); loadReg(rpage); },
  sold: async id => { const { data: o } = await db.from("orders").select("*").eq("id", id).single(); const r = await ask({ title: `Total agreed price (${o.qty} × ${o.product_name})` }); if (!r) return; await db.from("orders").update({ status: "sold", final_price: r.price, currency: r.cur, admin_note: r.note || null, sold_at: new Date().toISOString() }).eq("id", id); await adjStock(o.product_id, -o.qty); loadShop(); },
  ocancel: async id => { if (!confirm("Cancel this order request?")) return; await db.from("orders").update({ status: "cancelled" }).eq("id", id); loadShop(); },
  pedit: async id => {
    const p = PRODS.find(x => x.id === id); if (!p) return; const r = await editDlg("product", p); if (!r) return;
    let img = p.img; if (r.file) { img = await uploadPhoto(r.file); if (!img) return; }
    const { error } = await db.from("products").update({ name: r.name, price: r.price, description: r.description, stock: r.stock, img }).eq("id", id); if (error) return alert(error.message);
    if (r.name !== p.name) await db.from("orders").update({ product_name: r.name }).eq("product_id", id);
    loadShop();
  },
  pact: async id => { const p = PRODS.find(x => x.id === id); await db.from("products").update({ active: !p.active }).eq("id", id); loadShop(); },
  pdel: async id => { if (confirm("Delete this product? Past sales stay in the register.")) { await db.from("products").delete().eq("id", id); loadShop(); } }
};
document.addEventListener("click", e => { const b = e.target.closest("button[data-a]"); if (b && A[b.dataset.a]) A[b.dataset.a](b.dataset.id, b); });

// ---------- 2-step login + idle logout ----------
let fid = null;
async function mfaStatus() { const { data } = await db.auth.mfa.listFactors(); if (data && data.totp && data.totp.length) { $("mfastate").textContent = "✅ 2-step login is ON"; $("mfa").hidden = true; } }
$("mfa").onclick = async () => {
  const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: "Phone " + Date.now() });
  if (error) return alert(error.message);
  fid = data.id; $("qr").src = data.totp.qr_code; $("qr").hidden = false;
  $("secret").textContent = "Can't scan? Type this key into your app: " + data.totp.secret; $("mfaform").hidden = false;
};
$("mfaform").onsubmit = async e => {
  e.preventDefault();
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId: fid, code: $("mcode").value.trim() });
  if (error) return alert("Wrong code. Try again.");
  alert("2-step login is ON ✅"); location.reload();
};
let idle; const bump = () => { clearTimeout(idle); idle = setTimeout(async () => { await db.auth.signOut(); location.href = "login.html"; }, 30 * 60 * 1000); };
["click", "keydown", "touchstart", "mousemove"].forEach(v => addEventListener(v, bump, { passive: true })); bump();
