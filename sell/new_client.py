#!/usr/bin/env python3
"""Make a copy of the site for a new business, with its own name, type and colours.

Usage (run from the repo root):
  python3 sell/new_client.py "Crown Braids Demo" CBD crownbraids --type hair
  python3 sell/new_client.py "Mama's Kitchen" MK mamaskitchen --type food --theme gold
  python3 sell/new_client.py --list        (shows business types and colour themes)
Output: clients/<name>/  (upload that folder as its own Vercel project)
The live Hair Gallery files are only read, never changed.
"""
import argparse, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRESETS = json.loads((Path(__file__).parent / "presets.json").read_text(encoding="utf-8"))
FILES = ["index.html", "login.html", "reset.html", "admin.html", "privacy.html",
         "styles.css", "app.js", "admin.js", "login.js", "reset.js", "ui.js",
         "studio.js", "manifest.json", "vercel.json", "_headers"]


def wording(p):
    """(file, old text, new text) swaps that turn hair wording into this business type."""
    it, its, Ic, Is, em = p["item"], p["items"], p["item"].capitalize(), p["items"].capitalize(), p["emoji"]
    return [
        ("index.html", "<p>Braids, twists, locs &amp; natural hair. Styles for every crown 👑</p>", f"<p>{p['tagline']}</p>"),
        ("index.html", ">Book your crown<", f">{p['book_btn']}<"),
        ("index.html", "Tap a style to book it", f"Tap a {it} to book it"),
        ("index.html", "Hair oils and care products", p["shop_sub"]),
        ("index.html", "<label>Hairstyle<select", f"<label>{Ic}<select"),
        ("index.html", " (cancellation, lateness and bringing extensions beforehand)", " (cancellation and lateness)"),
        ("app.js", "👑", em),
        ("privacy.html", "a hair booking business", "a small business"),
        ("privacy.html", "the hairstyle you book", f"the {it} you book"),
        ("admin.html", ">Styles<", f">{Is}<"),
        ("admin.html", ">Top styles<", f">Top {its}<"),
        ("admin.html", "Pin a style", f"Pin a {it}"),
        ("admin.html", "Top styles are", f"Top {its} are"),
        ("admin.html", ">Add a hairstyle<", f">Add a {it}<"),
        ("admin.html", 'placeholder="Style name"', f'placeholder="{Ic} name"'),
        ("admin.html", ">My styles<", f">My {its}<"),
        ("admin.js", '"Edit hairstyle"', f'"Edit {it}"'),
        ("admin.js", '"No styles yet."', f'"No {its} yet."'),
        ("admin.js", '"Delete this style?"', f'"Delete this {it}?"'),
    ]


def no_hair_extras():
    """Hide size/length pickers and the hair colour studio."""
    return [
        ("index.html", '<div class="bar2"><label>Size', '<div class="bar2" hidden><label>Size'),
        ("index.html", '<div class="studio" id="studio">', '<div class="studio" id="studio" hidden>'),
        ("index.html", '<script src="studio.js"></script>', ""),
    ]


def goods_only(p):
    """Hide the booking parts for businesses that only sell goods."""
    return [
        ("index.html", '<a href="#gallery">Gallery</a>', ""),
        ("index.html", '<a href="#book">Book</a>', ""),
        ("index.html", '<section id="gallery">', '<section id="gallery" hidden>'),
        ("index.html", '<section id="book">', '<section id="book" hidden>'),
        ("index.html", f'href="#book">{p["book_btn"]}<', f'href="#shop">{p["book_btn"]}<'),
        ("index.html", ">My bookings<", ">My orders<"),
        ("index.html", "My Bookings</h2>", "My Account</h2>"),
        ("index.html", '<div id="hist" class="card">', '<div id="hist" class="card" hidden>'),
    ]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("name", nargs="?"); ap.add_argument("short", nargs="?"); ap.add_argument("instagram", nargs="?")
    ap.add_argument("--type", default="hair", choices=PRESETS["types"])
    ap.add_argument("--theme", choices=PRESETS["themes"], help="colour theme (default: the type's own)")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.list:
        print("Business types:"); [print(f"  {k:9} {v['about']}") for k, v in PRESETS["types"].items()]
        print("Themes:", ", ".join(PRESETS["themes"])); return
    if not (a.name and a.short and a.instagram):
        ap.error("give NAME SHORT INSTAGRAM (or --list)")

    p = PRESETS["types"][a.type]
    theme = PRESETS["themes"][a.theme or p["theme"]]
    name, short, ig = a.name, a.short.upper(), a.instagram.lstrip("@")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    out = ROOT / "clients" / slug
    if out.exists():
        sys.exit(f"{out} already exists")

    swaps = (wording(p) if p.get("wording", True) else []) \
        + ([] if p["hair_extras"] else no_hair_extras()) \
        + ([] if p["booking"] else goods_only(p))
    texts = {f: (ROOT / f).read_text(encoding="utf-8") for f in FILES}
    missing = []
    for f, old, new in swaps:
        if old not in texts[f]:
            missing.append(f"{f}: {old[:50]}")
        texts[f] = texts[f].replace(old, new)

    purple = PRESETS["themes"]["purple"]
    brand = [("thehairgallery_thg", ig), ("The Hair Gallery", name), ("T.H.G", ".".join(short)),
             ("thg-", slug + "-"), ("THG", short), ("her@email.com", "owner@email.com"),
             (purple["light"], theme["light"]), (purple["dark"], theme["dark"]),
             ("#7c4dcc", re.search(r"--acc:(#\w+)", theme["light"]).group(1)),
             ("#b79df0", re.search(r"--pri:(#\w+)", theme["light"]).group(1))]
    (out / "img").mkdir(parents=True)
    for f, text in texts.items():
        for old, new in brand:
            text = text.replace(old, new)
        (out / f).write_text(text, encoding="utf-8")

    # The new business gets its own database keys, never the Hair Gallery's.
    cfg = (ROOT / "config.js").read_text(encoding="utf-8")
    cfg = re.sub(r'url: "[^"]*"', 'url: "PASTE_CLIENT_SUPABASE_URL"', cfg)
    cfg = re.sub(r'key: "[^"]*"', 'key: "PASTE_CLIENT_SUPABASE_PUBLISHABLE_KEY"', cfg)
    (out / "config.js").write_text(cfg, encoding="utf-8")
    for icon in ["icon-192.png", "icon-512.png"]:
        shutil.copy(ROOT / icon, out / icon)

    print(f"Done: {out}  (type: {a.type}, theme: {a.theme or p['theme']})")
    if missing:
        print("WARNING: these texts were not found, so they kept the old wording:\n  " + "\n  ".join(missing))
    print("Next: add img/logo.jpg and photos, paste their Supabase keys into config.js, "
          "run the SQL files on their Supabase, then deploy.")


main()
