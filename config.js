const CFG = {
  url: "https://yvadcptvrpxfaxdcbfzf.supabase.co",
  key: "sb_publishable_zXTxsYOl6gBQPjm3H7Md7g_JqoRLhjG",
};
// shared: dark mode + scroll reveal
(function () {
  const r = document.documentElement,
    t = localStorage.theme || "light";
  r.dataset.theme = t;
  addEventListener("DOMContentLoaded", () => {
    const b = document.getElementById("theme");
    if (b) {
      b.textContent = t === "dark" ? "☀️" : "🌙";
      b.onclick = () => {
        const n = r.dataset.theme === "dark" ? "light" : "dark";
        r.dataset.theme = localStorage.theme = n;
        b.textContent = n === "dark" ? "☀️" : "🌙";
      };
    }
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => e.isIntersecting && e.target.classList.add("show")),
      { threshold: 0.15 },
    );
    new MutationObserver(() =>
      document.querySelectorAll(".reveal:not(.seen)").forEach((el) => {
        el.classList.add("seen");
        io.observe(el);
      }),
    ).observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("seen");
      io.observe(el);
    });
  });
})();
