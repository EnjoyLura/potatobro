# 核芯突围：万械狂潮 CORE RUSH: Overdrive

A landscape mobile arena wave-survival shooter (in the same genre as Brotato), built with **Cocos Creator 3.8.8** and exported to **web-mobile**. All art is generated in code at runtime. Most sound effects are WebAudio synth sounds generated in code. Four use recorded samples in `build-templates/web-mobile/sfx/`: every gun shares one SMG shot (`shot_smg.mp3`), every melee weapon shares one heavy swing (`swing2.mp3`), kills use `kill.wav` (the ordinary-enemy kill sound from S4Game/KingdomWatch, `v24/pierce_heavy.wav`) and UI clicks use `click.wav`. The battle BGM is `build-templates/web-mobile/bgm/battle.mp3`. The build copies both folders next to `index.html`.

## Build (CLI)

```bat
build.bat
```

`build.bat` runs the Cocos Creator CLI build (`build-web.json`, exit code `36` means success) and then `tools/postbuild.py`, which patches the output:

- **Sharp rendering on phones.** Three engine patches, with the hook functions in the page template:
  - Cocos 3.8 caps devicePixelRatio at 2, so 3x phones render at 2/3 resolution. The engine now reads `window.__CR_DPR_CAP()`, which returns the real ratio up to 4; add `?dpr=2` (or `1`) to the URL to save battery.
  - Label text is drawn at font size × screen scale, and the engine ignores node scale. Our UI root is scaled up 1.15–1.3× on phones, so all text was stretched and soft. The text assemblers now also multiply by `window.__CR_LABEL_SCALE(label)`: the UI scale (`__CR_TEXT_SCALE`, set in `UI.updateSize`) or the node's world scale, whichever is larger.
  - The engine caps the drawn font size at 100px; it is raised to 320 so big titles stay sharp.
- **No Cocos splash.** `splashScreen.totalTime` is set to 0. The page shows its own "加载中" text while loading.
- **Cache-busting.** The entry script gets `?v=<time>`, so returning visitors load the new build.

Output goes to `build/web-mobile/` (about 6 MB). To try it locally:

```bat
python -m http.server 8765 --directory build/web-mobile
```

## Deploy (GitHub Pages)

```bat
build.bat
python tools/deploy_pages.py
```

`deploy_pages.py` force-pushes `build/web-mobile` as a single commit to the `gh-pages` branch, so old builds don't pile up in history. GitHub Pages serves that branch (Settings > Pages > Deploy from a branch > `gh-pages`, `/ (root)`) at https://enjoylura.github.io/potatobro/.

## Screen adaptation

- **Landscape layout.** Design height is fixed at 720 and the width follows the screen: 16:9 gives 1280, 19.5:9 gives 1560. Outside 4:3 to 2.4:1 (an iPad held upright, desktop windows, ultra-wide monitors) the game letterboxes, so layouts never get narrower than 960 or wider than 1728.
- **Phones held upright.** The engine rotates the game 90°, so players just turn the phone. Touch input follows the rotation.
- **Notches and home indicator.** `viewport-fit=cover` lets the game fill the screen. The UI reads `env(safe-area-inset-*)` (mapped to the rotated edges when rotated) and keeps the HUD and buttons inside the safe area.
- **Small screens.** The UI scales up 1.15–1.3× when the game area is under 640 / 480 CSS px tall. Screens are rebuilt after a resize or rotation.
- **Shop.** The inventory (weapons, set bonuses, item rows) is measured first and the cards get the remaining height. Card text shrinks to stay above the price buttons, and extra items collapse into a "+N" cell.
- **Fullscreen.** The main menu has a 全屏 button where the browser supports it (Android, desktop). It also tries to lock landscape.
- **Main menu.** Title and a stack of pill buttons (开始游戏 / 设置 / 全屏) in a left column, with the version below. The hero art fills the right side. 玩法 / 战绩 / 更新日志 pills run along the top right, and the records line sits at the bottom right.
- **Settings** (from the menu or the pause screen): 游戏音乐 / 游戏音效 volume sliders, plus 伤害数字 and 屏幕震动 switches, all saved in localStorage. Bump `VERSION` in `ui/UI.ts` and add a line to `changelogPopup` with each release.

## Sound lab

```bat
tools\sound-lab.bat
```

This opens http://127.0.0.1:8766/tools/sound-lab.html, a page for reviewing and mixing every sound and the BGM:

- Each sound plays with the game's processing. Sample sounds also show their waveform and can be played raw; synth sounds are marked ♪. Every card shows a loudness figure, so you can compare sounds.
- Mark each file pass or fail and add a note. "复制不及格清单" copies the failed files and their notes to the clipboard so they can be regenerated.
- Per-sound sliders: volume, pitch variation, max length, minimum gap, max simultaneous plays, and how much it ducks the combat buses.
- Per-bus volume, voice cap and busy threshold, with live meters.
- BGM preview in battle, boss and menu (muffled) modes.
- A battle simulator fires up to six chosen weapons with hits, kills and pickups using the game's mixing rules, so you can hear how loud a full loadout gets.

"保存配置" (or Ctrl+S) writes `build-templates/web-mobile/sfx/config.json`, plus `build/web-mobile/sfx/config.json` if a build exists. The game reads this file at startup. "复制不及格清单" copies the failed sounds and notes, ready to send back for replacement.

## Gameplay

- **Movement**: drag anywhere on screen (floating joystick); WASD or arrow keys on desktop. Esc/P pauses.
- **Weapons fire automatically**: up to 6 weapons orbit your bot and aim at the nearest enemy.
- **Stages** (`data/Stages.ts`): 荒原虫巢, 冰封裂谷, 熔火工坊 and 虚空星港. Each has its own arena size and floor theme, its own enemy roster, two elites, a boss and modifiers (enemy HP/damage/speed, starting crystals, player stats). 熔火工坊 has lava pools that hurt the player. A stage unlocks when the previous one is cleared; on each stage, difficulty N+1 unlocks after clearing N.
- **20 waves** (20s, rising to 60s; wave 20 is a 90s boss wave). Elites appear on waves 10 and 15 (two waves earlier on 虚空星港), plus more at higher difficulties. After winning you can keep going in endless mode.
- **Flow**: menu → stage + difficulty → character → starting weapon.
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
| Enemy types (11 base types + 22 stage variants) | 33 |
| Elites + bosses (2 elites and a multi-phase boss per stage) | 12 |
| Stages | 4 |
| Difficulty levels (per stage) | 6 |

Stage enemies are recolored copies of the base drawings (`EnemyDef.art`: target hue, saturation, lightness, plus an ice / lava / void overlay), drawn into the atlas at startup.

## Codex, saves and cloud save

- **Codex (图鉴)**: weapons, items and monsters with filters and details. Weapons and items count as discovered once seen in the shop, a crate or the weapon select; monsters once they spawn (kill counts are kept). Undiscovered entries show as silhouettes. Old saves get the first stage's monsters up to their best wave.
- **Save**: localStorage. Settings stay on the device; progress (best wave, wins, stage clears, runs, kills, play time, codex) is the part that syncs. `savedAt` changes only when progress changes.
- **TapTap cloud save** (`core/CloudSave.ts`): inside the TapTap app the global `tap` object is available (no SDK). One archive, `core_rush_save`, holds the progress JSON: it is written with `tap.getFileSystemManager().writeFile` and uploaded with `createArchive` / `updateArchive`. Uploads are limited to one per minute, so they are queued. At startup the archive is downloaded and compared with local progress. If they differ and this device has its own progress, a popup lets the player keep one; a device without progress takes the cloud copy silently. The 存档 screen in the menu shows both saves. In a normal browser it says cloud save is only available in TapTap.

## Feel and effects

- **Audio** (`core/Sfx.ts`): settings come from `sfx/config.json`. Sounds without files play a synth recipe (the `RECIPES` table, mirrored in `tools/sound-lab.js`). Samples are decoded with WebAudio, trimmed of leading silence, loudness-normalized and played with random pitch. Guns and melee weapons are told apart only by pitch and volume.
  - Buttons click. Short taps on empty space, dim backgrounds and cards also click, unless the tap already played a UI sound.
  - Every sound goes through a bus (weapon, impact, kill, boom, enemy, pickup, player, event, ui). A bus caps how many sounds overlap and turns itself down once more than `busyAt` sounds hit within about 0.35 s, so a full loadout stays readable.
  - Hurt, level-up, elite and wave-end sounds briefly duck the combat buses.
  - Crystal pickups rise in pitch while chained.
  - The BGM streams through an `<audio>` element instead of being decoded into memory. It is muffled with a low-pass filter in the menu, shop and pause screens.
  - If a sample fails to load, that sound stays silent.
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
                              Sfx (synth + samples + music), Save, CloudSave (TapTap), Nodes, Util
assets/scripts/data/          Stats, Weapons, Items, Characters, Enemies, Stages, Upgrades
assets/scripts/game/          Run (economy/inventory/shop), World (simulation)
assets/scripts/ui/            UIKit, Text, UI (menu, settings, character/weapon select, HUD, shop,
                              pause, results), StageUI, CodexUI, SaveUI
```
