(function () {
  const b = document.getElementById("burger"), l = document.getElementById("links");
  if (b && l) {
    const set = o => { l.classList.toggle("open", o); b.setAttribute("aria-expanded", String(o)); b.textContent = o ? "✕" : "☰"; };
    b.onclick = e => { e.stopPropagation(); set(!l.classList.contains("open")); };
    l.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
    document.addEventListener("click", e => { if (!l.contains(e.target)) set(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
  }
  document.addEventListener("change", e => { const i = e.target; if (i.matches && i.matches(".fileup input")) i.parentElement.querySelector("span").textContent = i.files[0] ? i.files[0].name : "No file chosen"; });
  document.addEventListener("reset", e => setTimeout(() => e.target.querySelectorAll(".fileup span").forEach(s => s.textContent = "No file chosen")));
})();
