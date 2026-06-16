# Fighter models

`knight.glb`, `barbarian.glb`, `mage.glb`, `rogue.glb` are from the
**KayKit Character Pack: Adventurers** by Kay Lousberg — licensed **CC0**
(public domain, no attribution required; credited here anyway).

- https://kaylousberg.com/game-assets
- https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0

Each GLB is a rigged character carrying every weapon variant as a separate
mesh node; the app shows one loadout per fighter and hides the rest (see
`src/components/fighters/fighterConfig.ts`). They share a large animation set
(idle, walking, and a full melee combat library: chop / slice / stab / spin,
plus spellcasting and dual-wield).
