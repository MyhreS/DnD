#!/usr/bin/env python3
import json, csv, re, io, os

# repo-relative paths (this file lives at resources/extracted/gen.py)
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
BASE = os.path.join(REPO, "resources")
SRC = os.path.join(REPO, "src", "data")
content = json.load(open(BASE + "/extracted/content.json"))
classes = {c["id"]: c for c in content["classes"]}
rites = content["rites"]

CSV_DIR = BASE + "/csv/Classes Boards for send"
FEATURE_CSV = {
    "brute": "Classes-Hunter Brute Features.csv",
    "scout": "Classes-Hunter Scout Features.csv",
    "stalker": "Classes-Hunter Stalker Features.csv",
    "warden": "Classes-Hunter Warden Features.csv",
    "bloodbound": "Classes-Hunter Bloodbound Features.csv",
    "deepcaller": "Classes-Hunter Deepcaller Features.csv",
}

def clean(s):
    if s is None: return ""
    # join hyphenated wraps, collapse whitespace, fix stray ligature gaps
    s = s.replace("’", "’").strip()
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()

def read_progression(cid):
    rows = []
    extra_cols = []
    with open(CSV_DIR + "/" + FEATURE_CSV[cid], newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter=";")
        header = next(reader)
        # header[0]=Level, [1]=Proficiency Bonus, [2]=Class Features, rest=extras
        extra_cols = [h.strip() for h in header[3:] if h.strip()]
        for r in reader:
            if not r or not r[0].strip(): continue
            level = int(r[0].strip())
            prof = int(r[1].strip().replace("+", ""))
            feats = clean(r[2])
            extras = {}
            for i, col in enumerate(extra_cols):
                val = clean(r[3 + i]) if 3 + i < len(r) else ""
                extras[col] = val
            rows.append({"level": level, "profBonus": prof, "features": feats, "extras": extras})
    return extra_cols, rows

# ---- Per-class metadata (flavour + traits; corrected from handbook overview) ----
# blurbs are the DM's official class descriptions.
BLURB = {}
for block in open(BASE + "/class-descriptions.txt", encoding="utf-8").read().split("\n\n"):
    lines = [l for l in block.strip().split("\n") if l.strip()]
    if len(lines) >= 2 and lines[0].startswith("HUNTER "):
        key = lines[0].replace("HUNTER ", "").strip().lower()
        BLURB[key] = clean(" ".join(lines[1:]))

META = {
  "brute": dict(name="Brute", title="Hunter Brute", tagline="A wall of muscle and cold iron.",
    primary="STR or DEX", saves=["str","con"], hitDie=10, maxSanity=12, sanityDie=12, speed=30,
    armor=["Light armor","Medium armor","Heavy armor"], weapons="Simple and Martial weapons",
    tools="—", skills=2, skillOpts=["Acrobatics","Athletics","Grit","Perception","Survival","Intimidation"],
    equip=["Tool Belt","2 Blood vials","Greatsword","Shortsword","Rope"], base="Fighter",
    sig="Refuse the Bleeding — when you take damage, use your reaction to reduce it by 1d10 + your Hunter Brute level."),
  "scout": dict(name="Scout", title="Hunter Scout", tagline="Eyes of the hunt, finger on the trigger.",
    primary="DEX and WIS", saves=["str","dex"], hitDie=10, maxSanity=12, sanityDie=12, speed=35,
    armor=["Light armor","Medium armor"], weapons="Simple and Martial weapons",
    tools="—", skills=3, skillOpts=["Animal Handling","Athletics","Stealth","Survival","Investigation","Perception"],
    equip=["Tool Belt","1 Blood vial","18 bullets","Hunter Rifle","Hunter Cleaver","Pistol","Bandolier"], base="Ranger",
    sig="Hunter's Mark — Bonus Action, mark a creature within 90 ft: +1d6 on your hits against it and Advantage to track it."),
  "stalker": dict(name="Stalker", title="Hunter Stalker", tagline="A whisper, a glint, a slit throat.",
    primary="DEX", saves=["dex","int"], hitDie=8, maxSanity=10, sanityDie=10, speed=30,
    armor=["Light armor"], weapons="Simple weapons and Martial weapons with the Finesse or Light property",
    tools="Thieves' Tools", skills=2, skillOpts=["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Sleight of Hand","Stealth"],
    equip=["Tool Belt","1 Blood vial","4 bullets","Scimitar","4 Daggers","Pistol","Thieves' Tools"], base="Rogue",
    sig="Sneak Attack — once per turn, deal extra damage (1d6, scaling to 10d6) to a target you have Advantage against."),
  "deepcaller": dict(name="Deepcaller", title="Hunter Deepcaller", tagline="Knowledge man was not meant to hold.",
    primary="INT", saves=["int","wis"], hitDie=6, maxSanity=20, sanityDie=20, speed=30,
    armor=["Light armor"], weapons="Simple weapons",
    tools="—", skills=2, skillOpts=["Eldritch Knowledge","Old World History","Investigation","Insight","Blood Nature","Religion","Deception"],
    equip=["Tool Belt","1 Blood vial","Sickle","2 Daggers","Book of eldritch knowledge","Robe"], base="Warlock",
    sig="Rites & Whispers — perform forbidden Rites from your Book of the Deepcaller, fuelled by Strain and paid for in Madness.",
    caster=True),
  "bloodbound": dict(name="Bloodbound", title="Hunter Bloodbound", tagline="The hunt sings in their veins.",
    primary="CON", saves=["str","con"], hitDie=12, maxSanity=18, sanityDie=12, speed=30,
    armor=["Light armor","Medium armor"], weapons="Simple and Martial weapons",
    tools="Blood-drainer's Tools (unique item)", skills=2, skillOpts=["Grit","Blood Nature","Athletics","Intimidation","Medicine","Perception","Survival"],
    equip=["Tool Belt","3 Blood vials","Greataxe","2 Handaxes","Blood-drainer's Tools (unique item)"], base="Barbarian",
    sig="Blood Frenzy — enter a frenzy for bonus damage and resilience: frenzied, but sane."),
  "warden": dict(name="Warden", title="Hunter Warden", tagline="The lantern that others follow.",
    primary="WIS and CHA", saves=["wis","cha"], hitDie=10, maxSanity=15, sanityDie=12, speed=30,
    armor=["Light armor","Medium armor","Heavy armor"], weapons="Simple and Martial weapons",
    tools="—", skills=2, skillOpts=["Perception","Investigation","Animal Handling","Survival","Presence","Persuasion"],
    equip=["Tool Belt","1 Blood vial","Hunter Rifle","10 bullets","Longsword","Navigator's Tools","Bell","Bandolier","2 Hunting Traps"], base="Fighter",
    sig="Bands Directive — direct your band in battle with a Directive Die (d6→d12), turning fear into discipline."),
}

ORDER = ["brute","scout","stalker","deepcaller","bloodbound","warden"]

def js(s):  # JSON string -> JS string literal
    return json.dumps(s, ensure_ascii=False)

def strip_aster(s):
    return clean(s.strip().strip("*").strip())

def emit_features(feats, indent):
    out = []
    for f in feats:
        out.append(indent + "{ level: %d, name: %s, text: %s }," % (f["level"], js(clean(f["name"])), js(clean(f["text"]))))
    return "\n".join(out)

def emit_class(cid):
    m = META[cid]
    c = classes[cid]
    extra_cols, prog = read_progression(cid)
    L = []
    L.append("  {")
    L.append("    id: %s," % js(cid))
    L.append("    name: %s," % js(m["name"]))
    L.append("    title: %s," % js(m["title"]))
    L.append("    tagline: %s," % js(m["tagline"]))
    L.append("    blurb: %s," % js(BLURB[cid]))
    L.append("    primaryAbility: %s," % js(m["primary"]))
    L.append("    savingThrows: [%s]," % ", ".join(js(s) for s in m["saves"]))
    L.append("    hitDie: %d," % m["hitDie"])
    L.append("    maxSanity: %d," % m["maxSanity"])
    L.append("    sanityDie: %d," % m["sanityDie"])
    L.append("    speedFt: %d," % m["speed"])
    L.append("    armorTraining: [%s]," % ", ".join(js(a) for a in m["armor"]))
    L.append("    weaponProficiencies: %s," % js(m["weapons"]))
    L.append("    toolProficiencies: %s," % js(m["tools"]))
    L.append("    skillChoices: { count: %d, options: [%s] }," % (m["skills"], ", ".join(js(o) for o in m["skillOpts"])))
    L.append("    startingEquipment: [%s]," % ", ".join(js(e) for e in m["equip"]))
    if m.get("base"): L.append("    baseClass: %s," % js(m["base"]))
    L.append("    signature: %s," % js(m["sig"]))
    if m.get("caster"): L.append("    caster: true,")
    L.append("    progressionColumns: [%s]," % ", ".join(js(x) for x in extra_cols))
    # progression
    L.append("    progression: [")
    for r in prog:
        ex = "{ " + ", ".join("%s: %s" % (js(k), js(v)) for k, v in r["extras"].items()) + " }" if r["extras"] else "{}"
        L.append("      { level: %d, profBonus: %d, features: %s, extras: %s }," % (r["level"], r["profBonus"], js(r["features"]), ex))
    L.append("    ],")
    # features
    L.append("    features: [")
    L.append(emit_features(c["features"], "      "))
    L.append("    ],")
    # subclasses
    L.append("    subclasses: [")
    for s in c["subclasses"]:
        L.append("      {")
        L.append("        id: %s," % js(s["id"]))
        L.append("        name: %s," % js(clean(s["name"])))
        L.append("        tagline: %s," % js(strip_aster(s["tagline"])))
        L.append("        blurb: %s," % js(clean(s["blurb"])))
        L.append("        features: [")
        L.append(emit_features(s["features"], "          "))
        L.append("        ],")
        L.append("      },")
    L.append("    ],")
    L.append("  },")
    return "\n".join(L)

# ---- classes.ts ----
out = io.StringIO()
out.write('import type { HunterClass } from "@/types";\n\n')
out.write("// The six hunter classes of Catacombs & Starspawns.\n")
out.write("// GENERATED from the DM's source PDFs (resources/) — class traits & level\n")
out.write("// tables, full feature text, and subclasses. Flavour blurbs are the DM's\n")
out.write("// official class descriptions. To regenerate: resources/extracted/gen.py\n\n")
out.write("export const CLASSES: HunterClass[] = [\n")
out.write("\n".join(emit_class(cid) for cid in ORDER))
out.write("\n];\n\n")
out.write("export const CLASS_BY_ID: Record<string, HunterClass> = Object.fromEntries(\n")
out.write("  CLASSES.map((c) => [c.id, c]),\n);\n\n")
out.write("export function getClass(id: string | null | undefined): HunterClass | undefined {\n")
out.write("  if (!id) return undefined;\n  return CLASS_BY_ID[id];\n}\n\n")
out.write("export function getSubclass(classId: string, subId: string | null | undefined) {\n")
out.write("  if (!subId) return undefined;\n")
out.write("  return getClass(classId)?.subclasses.find((s) => s.id === subId);\n}\n")
open(os.path.join(SRC, "classes.ts"), "w", encoding="utf-8").write(out.getvalue())
print("wrote classes.ts (%d chars)" % len(out.getvalue()))

# ---- rites.ts ----
def emit_rite(r):
    L = ["  {"]
    L.append("    id: %s," % js(r["id"]))
    L.append("    name: %s," % js(clean(r["name"])))
    L.append("    level: %d," % int(r["level"]))
    L.append("    whisper: %s," % ("true" if r["whisper"] else "false"))
    L.append("    type: %s," % js(r["type"]))
    L.append("    performing: %s," % js(clean(r["performing"])))
    L.append("    range: %s," % js(clean(r["range"])))
    L.append("    duration: %s," % js(clean(r["duration"])))
    if clean(r.get("special","")): L.append("    special: %s," % js(clean(r["special"])))
    L.append("    text: %s," % js(clean(r["text"])))
    if clean(r.get("upgrade","")): L.append("    upgrade: %s," % js(clean(r["upgrade"])))
    L.append("  },")
    return "\n".join(L)

# sort: whispers first, then by level, then name
rites_sorted = sorted(rites, key=lambda r: (not r["whisper"], r["level"], r["name"]))
ro = io.StringIO()
ro.write('import type { Rite, RiteType } from "@/types";\n\n')
ro.write("// The Deepcaller's Rites & Whispers (Appendix B/C).\n")
ro.write("// GENERATED from the DM's rite PDFs (resources/). Regenerate: resources/extracted/gen.py\n\n")
ro.write("export const RITES: Rite[] = [\n")
ro.write("\n".join(emit_rite(r) for r in rites_sorted))
ro.write("\n];\n\n")
ro.write("export const RITE_TYPES: RiteType[] = [\n")
ro.write('  "Evocation", "Mind Influence", "Illusion", "Summoning",\n')
ro.write('  "Traversal", "Detection", "Protection",\n];\n\n')
ro.write("export const RITE_BY_ID: Record<string, Rite> = Object.fromEntries(\n")
ro.write("  RITES.map((r) => [r.id, r]),\n);\n")
open(os.path.join(SRC, "rites.ts"), "w", encoding="utf-8").write(ro.getvalue())
print("wrote rites.ts (%d chars, %d rites)" % (len(ro.getvalue()), len(rites_sorted)))
