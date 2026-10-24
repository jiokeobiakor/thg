const db = supabase.createClient(CFG.url, CFG.key);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const $ = id => document.getElementById(id);
const show = on => { $("panel").hidden = !on; if (on) { refresh(); loadStyles(); loadSet(); mfaStatus(); } };
db.auth.getSession().then(async ({ data }) => { if (!data.session) return location.replace("login.html"); const { data: l } = await db.auth.mfa.getAuthenticatorAssuranceLevel(); if (l && l.nextLevel === "aal2" && l.currentLevel !== "aal2") return location.replace("login.html"); const { data: a } = await db.rpc("is_admin"); a ? show(true) : location.replace("index.html"); });
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
    return `<div class="row"><span><b>${esc(s.slot_date)} · ${esc(s.slot_time)}</b><br>${b ? `👑 ${esc(b.name)} · ${esc(b.phone)} · ${esc(b.style)}${b.notes ? " · " + esc(b.notes) : ""}` : "Open"}</span>
    <span>${b ? (b.status === "done" ? "✅ Done" : `<button data-a="done" data-id="${s.id}">Done ✓</button> <button data-a="cancel" data-id="${s.id}">Cancel</button>`) : `<button data-a="rm" data-id="${s.id}">Remove</button>`}</span></div>`;
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
  $("sl").innerHTML = (data || []).map(s => `<div class="row"><span><img src="${esc(s.img)}" width="40" style="border-radius:8px;vertical-align:middle"> ${esc(s.name)} · ${esc(s.price || "Negotiable")}</span><span><button data-a="edit" data-id="${s.id}">Price</button> <button data-a="del" data-id="${s.id}">Delete</button></span></div>`).join("") || "No styles yet.";
}
async function editP(id) { const p = prompt("New price (blank = negotiable)"); if (p === null) return; await db.from("styles").update({ price: p || null }).eq("id", id); loadStyles(); }
async function delS(id) { if (confirm("Delete this style?")) { await db.from("styles").delete().eq("id", id); loadStyles(); } }
async function loadSet() { const { data } = await db.from("settings").select("instagram").eq("id", 1).single(); const { data: pi } = await db.rpc("get_pay_info"); if (data) { $("ig").value = data.instagram || ""; } $("pi").value = pi || ""; }
$("set").onsubmit = async e => { e.preventDefault(); const { error } = await db.from("settings").update({ instagram: $("ig").value.trim(), pay_info: $("pi").value }).eq("id", 1); alert(error ? error.message : "Saved ✅"); };
async function doneB(id) { await db.from("bookings").update({ status: "done" }).eq("slot_id", id); refresh(); }
$("list").onclick = e => { const b = e.target.closest("button[data-a]"); if (b) ({ done: doneB, cancel: cancelB, rm: removeS })[b.dataset.a](b.dataset.id); };
$("sl").onclick = e => { const b = e.target.closest("button[data-a]"); if (b) ({ edit: editP, del: delS })[b.dataset.a](b.dataset.id); };

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
