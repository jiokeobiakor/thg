const db = supabase.createClient(CFG.url, CFG.key);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const $ = id => document.getElementById(id);
const show = on => { $("panel").hidden = !on; if (on) { refresh(); loadStyles(); loadSet(); } };
db.auth.getSession().then(async ({ data }) => { if (!data.session) return location.replace("login.html"); const { data: a } = await db.rpc("is_admin"); a ? show(true) : location.replace("index.html"); });
$("out").onclick = async () => { await db.auth.signOut(); location.href = "login.html"; };
$("add").onsubmit = async e => {
  e.preventDefault();
  const rows = $("t").value.split(",").map(x => x.trim()).filter(Boolean).map(t => ({ slot_date: $("d").value, slot_time: t }));
  const { error } = await db.from("slots").upsert(rows, { onConflict: "slot_date,slot_time", ignoreDuplicates: true });
  error ? alert(error.message) : (e.target.reset(), refresh());
};
async function refresh() {
  const today = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const { data } = await db.from("slots").select("*, bookings(name,phone,style,notes,status)").gte("slot_date", today).order("slot_date").order("slot_time");
  $("list").innerHTML = (data || []).map(s => {
    const b = Array.isArray(s.bookings) ? s.bookings[0] : s.bookings;
    return `<div class="row"><span><b>${s.slot_date} · ${s.slot_time}</b><br>${b ? `👑 ${esc(b.name)} · ${esc(b.phone)} · ${esc(b.style)}${b.notes ? " · " + esc(b.notes) : ""}` : "Open"}</span>
    <span>${b ? (b.status === "done" ? "✅ Done" : `<button onclick="doneB('${s.id}')">Done ✓</button> <button onclick="cancelB('${s.id}')">Cancel</button>`) : `<button onclick="removeS('${s.id}')">Remove</button>`}</span></div>`;
  }).join("") || "Nothing yet.";
}
async function removeS(id) { await db.from("slots").delete().eq("id", id); refresh(); }
async function cancelB(id) { if (!confirm("Cancel this booking and reopen the slot?")) return; await db.from("bookings").update({ status: "cancelled", slot_id: null }).eq("slot_id", id); await db.from("slots").update({ booked: false }).eq("id", id); refresh(); }

$("sf").onsubmit = async e => {
  e.preventDefault();
  const f = $("si").files[0], path = Date.now() + "-" + f.name.replace(/[^\w.]/g, "_");
  const up = await db.storage.from("photos").upload(path, f);
  if (up.error) return alert(up.error.message);
  const { data } = db.storage.from("photos").getPublicUrl(path);
  const { error } = await db.from("styles").insert({ name: $("sn").value, price: $("sp").value || null, img: data.publicUrl });
  error ? alert(error.message) : (e.target.reset(), loadStyles());
};
async function loadStyles() {
  const { data } = await db.from("styles").select("*").order("created_at");
  $("sl").innerHTML = (data || []).map(s => `<div class="row"><span><img src="${esc(s.img)}" width="40" style="border-radius:8px;vertical-align:middle"> ${esc(s.name)} · ${esc(s.price || "Negotiable")}</span><span><button onclick="editP('${s.id}')">Price</button> <button onclick="delS('${s.id}')">Delete</button></span></div>`).join("") || "No styles yet.";
}
async function editP(id) { const p = prompt("New price (blank = negotiable)"); if (p === null) return; await db.from("styles").update({ price: p || null }).eq("id", id); loadStyles(); }
async function delS(id) { if (confirm("Delete this style?")) { await db.from("styles").delete().eq("id", id); loadStyles(); } }
async function loadSet() { const { data } = await db.from("settings").select("*").eq("id", 1).single(); if (data) { $("wa").value = data.whatsapp || ""; $("ig").value = data.instagram || ""; $("pi").value = data.pay_info || ""; } }
$("set").onsubmit = async e => { e.preventDefault(); const { error } = await db.from("settings").update({ whatsapp: $("wa").value, instagram: $("ig").value.trim(), pay_info: $("pi").value }).eq("id", 1); alert(error ? error.message : "Saved ✅"); };
async function doneB(id) { await db.from("bookings").update({ status: "done" }).eq("slot_id", id); refresh(); }
