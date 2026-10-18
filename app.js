const db = supabase.createClient(CFG.url, CFG.key);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
let slots = [], pick = null, cfg = { whatsapp: "2347087344453", pay_info: "", instagram: "" };
const igUser = () => String(cfg.instagram || "").replace(/^.*instagram\.com\//, "").replace(/^@/, "").split(/[/?]/)[0];
const say = m => $("msg").innerHTML = m;
const wa = t => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(t)}`;

async function init() {
  const [{ data: st }, { data: se }] = await Promise.all([
    db.from("styles").select("*").order("created_at"),
    db.from("settings").select("*").eq("id", 1).single()]);
  if (se) cfg = se;
  const list = st || [];
  $("grid").innerHTML = list.map(s => `<figure class="reveal" data-s="${esc(s.name)}"><img src="${esc(s.img)}" alt="${esc(s.name)}" loading="lazy" onerror="this.remove()"><figcaption>${esc(s.name)}<small>${s.price ? esc(s.price) : "Negotiable"}</small></figcaption></figure>`).join("") || `<p class="sub">Gallery coming soon 💜</p>`;
  $("style").innerHTML = list.map(s => `<option>${esc(s.name)}</option>`).join("");
  const ig = igUser();
  if (ig) document.body.insertAdjacentHTML("beforeend", `<a class="btn wa ig" target="_blank" href="https://ig.me/m/${esc(ig)}">📸 Instagram DM</a>`);
  document.body.insertAdjacentHTML("beforeend", `<a class="btn wa" target="_blank" href="${wa("Hi! I'd like to ask about a hairstyle and the price.")}">💬 Chat / negotiate</a>`);
}
$("grid").onclick = e => { const f = e.target.closest("figure"); if (f) { $("style").value = f.dataset.s; $("book").scrollIntoView(); } };

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
  if (!pick) return say("Pick a time first 💜");
  const s = slots.find(x => x.id === pick), style = $("style").value, name = $("name").value;
  const { data, error } = await db.rpc("book_slot", { p_slot: pick, p_name: name, p_phone: $("phone").value, p_style: style, p_notes: $("notes").value });
  if (error) return say("Something went wrong, try again.");
  if (!data) { say("Sorry, that slot was just taken. Pick another."); return load(); }
  const t = `Hi! I'm ${name}. I just booked ${style} on ${s.slot_date} at ${s.slot_time}. Can we confirm the price?`;
  e.target.reset();
  say(`Booked! ✅ Tap below to confirm the price with her.<br>${cfg.pay_info ? `<br><b>Payment details:</b><br>${esc(cfg.pay_info).replace(/\n/g, "<br>")}<br><br>` : ""}<a class="btn" target="_blank" href="${wa(t)}">Confirm on WhatsApp 💬</a>${igUser() ? ` <a class="btn" target="_blank" href="https://ig.me/m/${esc(igUser())}">Message on Instagram 📸</a>` : ""}`);
  load();
};
init(); load();
