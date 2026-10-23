const hash = new URLSearchParams(location.hash.slice(1));
const isRec = hash.get("type") === "recovery", errDesc = hash.get("error_description");
const db = supabase.createClient(CFG.url, CFG.key), $ = id => document.getElementById(id);
const BAD = "This reset link is invalid or has expired. Please request a new one from the login page.";
let shown = false;
const bad = m => { $("f").hidden = true; $("bad").hidden = false; $("bt").textContent = m; };
const show = () => { if (!shown) { shown = true; $("f").hidden = false; } };
if (errDesc || !isRec) bad(errDesc ? BAD : "Open the reset link from your email to set a new password.");
else {
  db.auth.onAuthStateChange((ev, s) => { if (s && (ev === "PASSWORD_RECOVERY" || ev === "SIGNED_IN")) show(); });
  setTimeout(async () => { if (!shown) { const { data } = await db.auth.getSession(); data.session ? show() : bad(BAD); } }, 2500);
}
$("sh").onchange = e => { $("p1").type = $("p2").type = e.target.checked ? "text" : "password"; };
$("f").onsubmit = async e => {
  e.preventDefault();
  const a = $("p1").value, b = $("p2").value, m = $("m");
  if (a.length < 10) return (m.textContent = "Use at least 10 characters.");
  if (a !== b) return (m.textContent = "The two passwords don't match.");
  if (/^(.)\1+$/.test(a) || /password|12345678|qwerty/i.test(a)) return (m.textContent = "That password is too easy to guess.");
  $("go").disabled = true; m.textContent = "";
  const { error } = await db.auth.updateUser({ password: a });
  if (error) { $("go").disabled = false; return (m.textContent = error.message); }
  m.style.color = "var(--tx)"; m.textContent = "Password updated ✅";
  await db.auth.signOut();
  setTimeout(() => (location.href = "login.html?reset=1"), 1200);
};
