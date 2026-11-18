# 核芯突围 CORE RUSH

A landscape mobile arena wave-survival shooter (in the same genre as Brotato), built with **Cocos Creator 3.8.8** and exported to **web-mobile**. All art and the background music are generated in code at runtime. Sound effects are 46 AI-generated samples (TapTap Maker / Seed Audio) in `build-templates/web-mobile/sfx/`, which the build copies to `sfx/` next to `index.html`.

## Build (CLI)

```bat
build.bat
```

This is the same as:

```bat
"C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe" --project D:/AI/potato --build "configPath=D:/AI/potato/build-web.json"
```

Output goes to `build/web-mobile/` (about 2 MB). Exit code `36` means success. To try it locally:

```bat
python -m http.server 8765 --directory build/web-mobile
```

## Gameplay

- **Movement**: drag anywhere on screen (floating joystick); WASD or arrow keys on desktop. Esc/P pauses.
- **Weapons fire automatically**: up to 6 weapons orbit your bot and aim at the nearest enemy.
- **20 waves** (20s, rising to 60s; wave 20 is a 90s boss wave). Elites appear on waves 10 and 15, plus more at higher danger levels. After winning you can keep going in endless mode.
- **Crystals**: dropped by enemies, used for both money and XP. Crystals left on the ground at wave end go into a bag, and each later pickup draws one extra from it.
- **Between waves**: level-up choices (with reroll), then crate items (take or recycle), then the shop.
- **Shop**: 4 slots, lock, reroll (price rises per reroll), and buy weapons/items. Two copies of a weapon at the same tier combine into the next tier (I–IV). Weapons can be sold.
- **Weapon class set bonuses**: blunt, blade, gun, precise, elemental, explosive, tool, support, primitive, heavy.
- **29 stats**: 16 primary (HP, regen, lifesteal, damage %, melee/ranged/elemental, attack speed, crit, engineering, range, armor, dodge, speed, luck, harvest) plus secondary ones.

| Content | Count |
|---|---|
| Characters (each with its own stats, traits and starting weapons) | 10 |
| Weapons (4 tiers each: melee thrust/sweep, guns, beam, chain lightning, explosives, flames, turret builder) | 19 |
| Items (4 rarities, including turrets, mines, drones, gardens, shields, revive, auto-collect) | 55 |
| Enemy types (chasers, runners, spitters, chargers, splitters, hatchers, bombers, looters, crystal trees) | 11 |
| Elites + final boss (multi-phase) | 3 |
| Danger levels | 6 |

Progress (best wave, wins per character and danger, settings) is saved in localStorage.

## Feel and effects

- **Audio** (`core/Sfx.ts`): samples are fetched and decoded with WebAudio at startup. Each is trimmed of leading silence and loudness-normalized, then played with random pitch, per-sound voice limits and a compressor on the effects bus. Crystal pickups rise in pitch while chained. Kills, explosions and heavy hits get a short sine "thump" underneath for low end. If a file fails to load, that sound falls back to the old synth.
- **Hits**: enemies flash white, squash, and get an impact star plus directional sparks. Crits add a gold ring, a small shake and a bigger number pop.
- **Kills**: white silhouette pop, glow ring, outlined gibs that arc, bounce and leave droplet stains, plus a ground splat.
- **Explosions**: flash, fireballs, shock ring, smoke, embers and a scorch mark.
- **Guns**: directional muzzle flash, tracers, ejected shell casings, and camera recoil kick on heavy weapons. Melee has thrust streaks and a double slash arc.
- **Time**: hit-stop when the player is hurt, and hit-stop plus slow-mo on elite and boss kills and on death. A red screen flash plays on taking damage.
- Glows use a shared additive-blend sprite material (`core/Nodes.ts: additiveMaterial`) on their own layer, so they batch together.

## Code layout

```
assets/scenes/main.scene      Canvas + Main component
assets/scripts/Main.ts        entry point, game state machine
assets/scripts/core/          Atlas (runtime texture packing), Art (procedural sprites),
                              Sfx (WebAudio synth + music), Save, Nodes, Util
assets/scripts/data/          Stats, Weapons, Items, Characters, Enemies, Upgrades
assets/scripts/game/          Run (economy/inventory/shop), World (simulation)
assets/scripts/ui/            UIKit, Text, UI (all screens)
```
