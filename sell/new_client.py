#!/usr/bin/env python3
"""Make a copy of the site for a new client, with their name and Instagram.

Usage (run from the repo root):
  python3 sell/new_client.py "Glam Braids" GB glambraids_ng
Output: clients/glam-braids/  (upload that folder to its own Vercel project)
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = ["index.html", "login.html", "reset.html", "admin.html", "privacy.html",
         "styles.css", "app.js", "admin.js", "login.js", "reset.js", "ui.js",
         "studio.js", "manifest.json", "vercel.json", "_headers"]

def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    name, short, ig = sys.argv[1], sys.argv[2].upper(), sys.argv[3].lstrip("@")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    out = ROOT / "clients" / slug
    if out.exists():
        sys.exit(f"{out} already exists")
    (out / "img").mkdir(parents=True)
    swaps = [("thehairgallery_thg", ig), ("The Hair Gallery", name),
             ("T.H.G", ".".join(short)), ("thg-", slug + "-"), ("THG", short)]
    for f in FILES:
        text = (ROOT / f).read_text(encoding="utf-8")
        for old, new in swaps:
            text = text.replace(old, new)
        (out / f).write_text(text, encoding="utf-8")
    # Client gets their own database keys, never the owner's.
    cfg = (ROOT / "config.js").read_text(encoding="utf-8")
    cfg = re.sub(r'url: "[^"]*"', 'url: "PASTE_CLIENT_SUPABASE_URL"', cfg)
    cfg = re.sub(r'key: "[^"]*"', 'key: "PASTE_CLIENT_SUPABASE_PUBLISHABLE_KEY"', cfg)
    (out / "config.js").write_text(cfg, encoding="utf-8")
    for icon in ["icon-192.png", "icon-512.png"]:
        shutil.copy(ROOT / icon, out / icon)
    print(f"Done: {out}\nTo do: add img/logo.jpg + client photos, paste their Supabase keys "
          "into config.js, run the SQL files on their Supabase, then deploy.")

main()
