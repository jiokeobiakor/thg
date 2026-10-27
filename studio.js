// Colour studio: tap swatches, see a live two-tone braid preview, get a text summary for the booking notes.
(function () {
  const HAIR = [["1", "Jet Black", "#0b0b0d"], ["1B", "Natural Black", "#1c1411"], ["2", "Dark Brown", "#2e1a12"], ["4", "Chocolate", "#4a2c1c"], ["30", "Auburn", "#8a4b2a"], ["350", "Ginger", "#b4501f"], ["27", "Honey Blonde", "#b5803a"], ["613", "Platinum Blonde", "#ecd9a4"], ["99J", "Burgundy", "#5a1228"], ["530", "Wine Red", "#7b1a2c"], ["Red", "Red", "#c0141f"], ["Orange", "Copper Orange", "#d4661f"], ["Pink", "Pink", "#e86aa6"], ["Purple", "Purple", "#6f3fb5"], ["Blue", "Blue", "#2f5fd0"], ["Teal", "Teal", "#1f8a8a"], ["Green", "Green", "#2f7a45"], ["Grey", "Silver Grey", "#a8a8b0"], ["White", "White", "#f4f4f4"]];
  const MODES = { solid: "Solid", mixed: "Mixed (twisted together)", ombre: "Ombré (fades)" };
  const $ = id => document.getElementById(id);
  if (!$("studio")) return;
  const ST = { c: [null, null], mode: "solid", slot: 0 };
  const nm = x => x.c === x.n ? x.n : (x.c + " " + x.n).trim();
  const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  $("sw").innerHTML = HAIR.map(([c, n, h], i) => `<button type="button" class="swb" data-i="${i}" style="background:${h}" aria-label="${c === n ? n : c + " " + n}" aria-pressed="false"></button>`).join("");
  function text() {
    if (!ST.c[0]) return "";
    const a = ST.c[0].label, b = ST.c[1] && ST.mode !== "solid" ? ST.c[1].label : "";
    return b ? `Colours: ${a} + ${b} (${MODES[ST.mode]})` : `Colour: ${a}`;
  }
  function draw() {
    const c1 = ST.c[0] ? ST.c[0].h : "#3a3342", c2 = ST.c[1] && ST.mode !== "solid" ? ST.c[1].h : c1; let s = "";
    for (let i = 0; i < 11; i++) {
      const y = 20 + i * 20, lean = i % 2 ? -1 : 1, cx = 55 + lean * 7, col = ST.mode === "mixed" ? (i % 2 ? c2 : c1) : ST.mode === "ombre" ? mix(c1, c2, i / 10) : c1;
      s += `<g transform="rotate(${lean * 26} ${cx} ${y})"><ellipse cx="${cx}" cy="${y}" rx="30" ry="14" fill="${col}" stroke="#00000045" stroke-width="1.5"/><ellipse cx="${cx - 6}" cy="${y - 5}" rx="16" ry="3.2" fill="#fff" opacity=".22"/></g>`;
    }
    $("prev").innerHTML = `<svg viewBox="0 0 110 250" role="img" aria-label="Hair colour preview">${s}<rect x="47" y="232" width="16" height="14" rx="3" fill="#d8b25c" stroke="#00000040"/></svg>`;
    $("d0").style.background = ST.c[0] ? ST.c[0].h : "#ddd"; $("d1").style.background = ST.c[1] ? ST.c[1].h : "#ddd";
    $("stname").textContent = text() || "Tap a colour to start";
    document.querySelectorAll("#slot button").forEach(b => b.classList.toggle("on", +b.dataset.s === ST.slot));
    document.querySelectorAll("#mode button").forEach(b => b.classList.toggle("on", b.dataset.m === ST.mode));
    document.querySelectorAll(".swb").forEach(b => { const h = HAIR[+b.dataset.i][2], on = ST.c[ST.slot] && ST.c[ST.slot].h === h; b.classList.toggle("on", !!on); b.setAttribute("aria-pressed", String(!!on)); });
  }
  function pick(o) {
    ST.c[ST.slot] = o;
    if (ST.slot === 0 && ST.mode !== "solid" && !ST.c[1]) ST.slot = 1;
    draw();
  }
  $("sw").onclick = e => { const b = e.target.closest(".swb"); if (!b) return; const [c, n, h] = HAIR[+b.dataset.i]; pick({ h, label: c === n ? n : c + " " + n }); };
  $("cust").oninput = e => pick({ h: e.target.value, label: "Custom " + e.target.value });
  $("mode").onclick = e => { const b = e.target.closest("button[data-m]"); if (!b) return; ST.mode = b.dataset.m; if (ST.mode !== "solid" && !ST.c[1]) ST.slot = 1; if (ST.mode === "solid") ST.slot = 0; draw(); };
  $("slot").onclick = e => { const b = e.target.closest("button[data-s]"); if (!b) return; ST.slot = +b.dataset.s; if (ST.slot === 1 && ST.mode === "solid") ST.mode = "mixed"; draw(); };
  $("strst").onclick = () => { ST.c = [null, null]; ST.mode = "solid"; ST.slot = 0; draw(); };
  window.Studio = { text, reset: () => $("strst").click() };
  draw();
})();
