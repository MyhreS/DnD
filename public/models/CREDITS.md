# Fighter models

`knight.glb`, `barbarian.glb`, `mage.glb`, `rogue.glb`, `rogue_hooded.glb` are
from the **KayKit Character Pack: Adventurers** by Kay Lousberg — licensed
**CC0** (public domain, no attribution required; credited here anyway).

- https://kaylousberg.com/game-assets
- https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0

Each GLB is a rigged character carrying every weapon variant as a separate
mesh node; the app shows one loadout per fighter and hides the rest (see
`src/components/fighters/fighterConfig.ts`). They share a large animation set
(walking, plus a full combat library: chop / slice / stab / spin, ranged,
spellcasting and dual-wield).

Fighters are matched to the six hunter classes — several reuse a model with a
different weapon loadout:

| Class | Model | Loadout |
|---|---|---|
| Brute | knight | greatsword (2H) |
| Warden | knight | sword + shield (1H) |
| Bloodbound | barbarian | greataxe (2H) |
| Deepcaller | mage | staff (spells) |
| Scout | rogue | crossbow (ranged) |
| Stalker | rogue_hooded | dual daggers |
