// Gameplay simulation: player, weapons, enemies, projectiles, pickups, structures and effects.
import { Node, Sprite, UITransform } from 'cc';
import { Atlas } from '../core/Atlas';
import { drawArena } from '../core/Art';
import { mkNode, mkSprite, SpritePool, setFrame, setTint, setAlpha, hexColor, additiveMaterial } from '../core/Nodes';
import { Sfx } from '../core/Sfx';
import { TAU, clamp, rand, randInt, chance, dist2, angleDiff, SpatialGrid, pick, lerp } from '../core/Util';
import { Run } from './Run';
import { WEAPON_MAP, WeaponDef } from '../data/Weapons';
import { ENEMIES, EnemyDef, SPAWN_RULES, elitesForWave, waveDuration } from '../data/Enemies';

export const AW = 1800, AH = 1150, BORDER = 160;
const HALF_W = AW / 2, HALF_H = AH / 2;
const PLAYER_R = 18;
const MAX_ENEMIES = 170;

export interface WorldHost {
    onWaveEnd(): void;
    onPlayerDead(): void;
    shakeEnabled(): boolean;
    viewSize(): { w: number; h: number };
    onElite(text: string): void;
    onPlayerHurt(): void;
    onLevelUp(): void;
    numbersEnabled(): boolean;
}

const MAX_PARTICLES = 420;

function parseHex(h: string) {
    const c = hexColor(h);
    return [c.r, c.g, c.b];
}

// ---------------------------------------------------------------- entity types
class Enemy {
    def: EnemyDef; x = 0; y = 0; vx = 0; vy = 0; kbx = 0; kby = 0;
    hp = 1; maxHp = 1; dmg = 1; speed = 100; r = 20;
    spr: Sprite; frame = ''; flashT = 0; t = 0; phase = 0;
    state = 0; stateT = 0; timer = 0; timer2 = 0; dirX = 0; dirY = 0;
    burnT = 0; burnDps = 0; burnTick = 0;
    alive = true; hitCd = 0; id = 0; life = 0; flip = 1; scale = 1;
    punch = 0;      // squash amount after a hit (decays)
    spawnT = 0;     // grows 0..1 while popping in
}

class Bullet {
    x = 0; y = 0; vx = 0; vy = 0; r = 8; dmg = 1; crit = false; pierce = 0; bounce = 0;
    dist = 0; maxDist = 400; enemy = false; spr: Sprite; hits: number[] = [];
    explode = 0; burn = 0; heal = 0; kb = 0; weapon: WeaponDef = null; tier = 1; alive = true;
    trail = 0; spin = 0; lifesteal = 0; color: number[] = null; grenade = false; gz = 0;
}

class Pickup {
    kind: 'mat' | 'fruit' | 'crate' = 'mat'; x = 0; y = 0; vx = 0; vy = 0; spr: Sprite; magnet = false; alive = true; t = 0; tier = 1;
}

class Particle {
    spr: Sprite; x = 0; y = 0; vx = 0; vy = 0; life = 0; max = 1; s0 = 1; s1 = 1; a0 = 255; a1 = 0; vr = 0; drag = 0; sx = 1; sy = 1; pool: SpritePool;
    // optional height simulation for gibs / casings: z above ground, falls with gravity, bounces once
    z = 0; vz = 0; grav = 0; bounces = 0; landCol: number[] = null; ease = 0;
}

class DmgNum { node: Node; digits: Sprite[] = []; x = 0; y = 0; t = 0; life = 0.7; active = false; big = false }

class Marker { x = 0; y = 0; t = 0; type = ''; spr: Sprite; alive = true; elite = false }

class WeaponInst {
    def: WeaponDef; tier = 1; uid = 0; spr: Sprite; cd = 0; angle = 0;
    bx = 0; by = 0;           // rest position
    x = 0; y = 0;             // current base position
    animT = -1; animDur = 0; reach = 0; hitIds: number[] = []; sweepFrom = 0; sweepTo = 0; recoil = 0;
}

class Structure {
    kind: 'turret' | 'mine' = 'turret'; x = 0; y = 0; spr: Sprite; gun: Sprite = null; cd = 0; tier = 1; alive = true; t = 0; angle = 0;
}

class Drone { spr: Sprite; a = 0; x = 0; y = 0 }

// ---------------------------------------------------------------- World
export class World {
    host: WorldHost;
    root: Node;
    run: Run = null;
    // layers
    lGround: Node; lDecal: Node; lPickup: Node; lStruct: Node; lEnemy: Node; lPlayer: Node; lWeapon: Node; lBullet: Node; lFx: Node; lGlow: Node; lNum: Node;
    // feel: hit-stop freezes the simulation for a few frames, slow-mo eases back to full speed
    hitStop = 0; slowT = 0; slowDur = 0; kickX = 0; kickY = 0;
    pools: { [k: string]: SpritePool } = {};
    // player
    px = 0; py = 0; pvx = 0; pvy = 0; playerSpr: Sprite; playerFrame = ''; facing = 1; iframe = 0; flashT = 0; walkT = 0;
    regenAcc = 0; lifestealWindow = 0; lifestealCount = 0; shieldLeft = 0; reviveLeft = 0; dead = false; deadT = 0;
    // input
    moveX = 0; moveY = 0;
    // collections
    enemies: Enemy[] = []; bullets: Bullet[] = []; pickups: Pickup[] = []; particles: Particle[] = [];
    nums: DmgNum[] = []; markers: Marker[] = []; weapons: WeaponInst[] = []; structures: Structure[] = []; drones: Drone[] = [];
    decals: Particle[] = [];
    grid = new SpatialGrid<Enemy>(80);
    q: Enemy[] = [];
    // wave
    running = false; waveTime = 0; waveDur = 20; spawnTimers: number[] = []; eliteSpawned = false; enemyId = 1;
    mineTimer = 0; gardenTimer = 0; treeTimer = 0; looterTime = -1;
    boss: Enemy = null;
    // camera
    camX = 0; camY = 0; shake = 0; shakeX = 0; shakeY = 0;
    time = 0;
    endingT = -1;
    floor: Sprite;

    constructor(parent: Node, host: WorldHost) {
        this.host = host;
        this.root = mkNode('World', parent);
        this.lGround = mkNode('ground', this.root);
        this.lDecal = mkNode('decal', this.root);
        this.lPickup = mkNode('pickup', this.root);
        this.lStruct = mkNode('struct', this.root);
        this.lEnemy = mkNode('enemy', this.root);
        this.lPlayer = mkNode('player', this.root);
        this.lWeapon = mkNode('weapon', this.root);
        this.lBullet = mkNode('bullet', this.root);
        this.lFx = mkNode('fx', this.root);
        this.lGlow = mkNode('glow', this.root);
        this.lNum = mkNode('num', this.root);
        for (const k of ['decal', 'pickup', 'struct', 'enemy', 'bullet', 'fx', 'fxTop', 'marker']) {
            const parentNode = k === 'decal' ? this.lDecal : k === 'pickup' ? this.lPickup : k === 'struct' ? this.lStruct :
                k === 'enemy' ? this.lEnemy : k === 'bullet' ? this.lBullet : k === 'marker' ? this.lDecal : this.lFx;
            this.pools[k] = new SpritePool(parentNode);
        }
        // additive glow layer (flashes, sparks, muzzle, tracers); falls back to normal blending
        this.pools.glow = new SpritePool(this.lGlow, additiveMaterial());
        // floor
        const canvas = drawArena(AW, AH, BORDER);
        const fn = mkNode('floor', this.lGround);
        const fs = fn.addComponent(Sprite);
        fs.sizeMode = Sprite.SizeMode.CUSTOM;
        fs.spriteFrame = Atlas.frameFromCanvas(canvas);
        fn.getComponent(UITransform).setContentSize(AW + BORDER * 2, AH + BORDER * 2);
        this.floor = fs;
        // player
        this.playerSpr = mkSprite(this.lPlayer, 'c_unit');
        this.root.active = false;
    }

    // ================================================================ wave lifecycle
    beginRun(run: Run) {
        this.run = run;
        this.reviveLeft = run.special.revive || 0;
        this.clearAll(true);
        this.root.active = true;
        this.playerFrame = 'c_' + run.char.id;
        setFrame(this.playerSpr, this.playerFrame);
    }

    clearAll(decals = false) {
        for (const e of this.enemies) this.pools.enemy.put(e.spr);
        this.enemies.length = 0;
        for (const b of this.bullets) this.pools.bullet.put(b.spr);
        this.bullets.length = 0;
        for (const p of this.pickups) this.pools.pickup.put(p.spr);
        this.pickups.length = 0;
        for (const p of this.particles) p.pool.put(p.spr);
        this.particles.length = 0;
        for (const m of this.markers) this.pools.marker.put(m.spr);
        this.markers.length = 0;
        for (const s of this.structures) { this.pools.struct.put(s.spr); if (s.gun) this.pools.struct.put(s.gun); }
        this.structures.length = 0;
        for (const d of this.drones) this.pools.fxTop.put(d.spr);
        this.drones.length = 0;
        for (const n of this.nums) { n.active = false; n.node.active = false; }
        if (decals) { for (const d of this.decals) d.pool.put(d.spr); this.decals.length = 0; }
        this.boss = null;
    }

    startWave() {
        const run = this.run;
        this.clearAll(false);
        this.dead = false;
        this.px = 0; this.py = 0;
        this.camX = 0; this.camY = 0;
        this.iframe = 1.0;
        this.hitStop = 0; this.slowT = 0; this.kickX = 0; this.kickY = 0;
        this.waveDur = run.endless ? 60 : waveDuration(run.wave);
        this.waveTime = this.waveDur;
        this.spawnTimers = SPAWN_RULES.map((r, i) => 0.6 + i * 0.4);
        this.eliteSpawned = false;
        this.shieldLeft = run.special.shield || 0;
        this.mineTimer = 3; this.gardenTimer = 5; this.treeTimer = rand(4, 10);
        this.looterTime = run.wave >= 2 && chance(0.45) ? rand(5, this.waveDur - 8) : -1;
        this.endingT = -1;
        this.buildWeapons();
        // turrets: from items and wrenches
        const nTur = run.special.turret || 0;
        const turrets: number[] = [];
        for (let i = 0; i < nTur; i++) turrets.push(1);
        for (const w of run.weapons) if (WEAPON_MAP[w.id].turret) turrets.push(w.tier);
        turrets.forEach((tier, i) => {
            const a = (i / Math.max(1, turrets.length)) * TAU + 0.4;
            this.addStructure('turret', Math.cos(a) * 140, Math.sin(a) * 110, tier);
        });
        // drones
        const nd = run.special.orbit || 0;
        for (let i = 0; i < nd; i++) {
            const d = new Drone();
            d.spr = this.pools.fxTop.get('drone');
            d.a = i / nd * TAU;
            this.drones.push(d);
        }
        // starting trees
        const trees = randInt(0, 1) + (run.stats.luck > 50 ? 1 : 0);
        for (let i = 0; i < trees; i++) this.spawnEnemyNow('tree', rand(-HALF_W + 100, HALF_W - 100), rand(-HALF_H + 100, HALF_H - 100));
        this.running = true;
        Sfx.intensity = run.wave >= 20 ? 2 : 1;
        Sfx.waveStart();
    }

    buildWeapons() {
        for (const w of this.weapons) w.spr.node.destroy();
        this.weapons.length = 0;
        const n = this.run.weapons.length;
        this.run.weapons.forEach((ow, i) => {
            const wi = new WeaponInst();
            wi.def = WEAPON_MAP[ow.id]; wi.tier = ow.tier; wi.uid = ow.uid;
            wi.spr = mkSprite(this.lWeapon, wi.def.sprite, undefined, undefined, 0.22, 0.5);
            const a = n === 1 ? -0.3 : (i / n) * TAU + Math.PI / 2;
            wi.bx = Math.cos(a) * 44; wi.by = Math.sin(a) * 32 - 4;
            wi.angle = 0;
            wi.cd = rand(0.1, 0.5);
            // tier tint (subtle glow on higher tiers)
            this.weapons.push(wi);
        });
    }

    endWave() {
        this.running = false;
        // pop every remaining enemy (no drops)
        this.enemies.forEach((e, i) => { if (i < 50) this.deathFx(e, false); else this.puff(e.x, e.y, e.def, e.r); });
        if (this.enemies.length) { Sfx.kill(true); this.addShake(6); }
        for (const e of this.enemies) this.pools.enemy.put(e.spr);
        this.enemies.length = 0;
        for (const m of this.markers) this.pools.marker.put(m.spr);
        this.markers.length = 0;
        for (const b of this.bullets) this.pools.bullet.put(b.spr);
        this.bullets.length = 0;
        // leftover materials go to the bag, crates are collected
        for (const p of this.pickups) {
            if (p.kind === 'mat') this.run.bag++;
            else if (p.kind === 'crate') this.run.crates.push(p.tier);
            this.pools.pickup.put(p.spr);
        }
        this.pickups.length = 0;
        this.boss = null;
        Sfx.waveEnd();
        Sfx.intensity = 0;
        this.host.onWaveEnd();
    }

    // ================================================================ main update
    /** Freeze the action for a moment (impact weight). */
    freeze(t: number) { this.hitStop = Math.max(this.hitStop, t); }
    /** Slow motion that eases back to normal over `t` seconds. */
    slowMo(t: number) { if (t > this.slowT) { this.slowT = t; this.slowDur = t; } }
    /** Camera kick (screen units) in a direction, e.g. recoil of a heavy shot. */
    kick(dx: number, dy: number, amount: number) {
        if (!this.host.shakeEnabled()) return;
        const l = Math.hypot(dx, dy) || 1;
        this.kickX += dx / l * amount; this.kickY += dy / l * amount;
    }

    update(realDt: number) {
        // time scale: hit-stop nearly freezes, slow-mo eases out
        let dt = realDt;
        if (this.hitStop > 0) { this.hitStop -= realDt; dt = realDt * 0.04; }
        else if (this.slowT > 0) {
            this.slowT = Math.max(0, this.slowT - realDt);
            const k = 1 - this.slowT / this.slowDur;
            dt = realDt * (0.25 + 0.75 * k * k);
        }
        this.time += dt;
        if (this.running) {
            this.updatePlayer(dt);
            this.updateSpawning(dt);
            this.rebuildGrid();
            this.updateEnemies(dt);
            this.updateWeapons(dt);
            this.updateStructures(dt);
            this.updateBullets(dt);
            this.updatePickups(dt);
            this.waveTime -= dt;
            if (this.waveTime <= 0 && !this.dead) {
                this.waveTime = 0;
                this.endWave();
            }
        } else if (this.dead) {
            this.deadT += dt;
            if (this.deadT > 1.4 && this.deadT - dt <= 1.4) this.host.onPlayerDead();
        }
        this.updateParticles(dt);
        this.updateNums(dt);
        this.updateCamera(realDt);
        this.renderPlayer(dt);
    }

    // ================================================================ player
    playerSpeed() { return 340 * Math.max(0.35, 1 + this.run.stats.speed / 100); }

    updatePlayer(dt: number) {
        const run = this.run;
        let mx = this.moveX, my = this.moveY;
        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }
        const sp = this.playerSpeed();
        this.pvx = lerp(this.pvx, mx * sp, Math.min(1, dt * 18));
        this.pvy = lerp(this.pvy, my * sp, Math.min(1, dt * 18));
        this.px = clamp(this.px + this.pvx * dt, -HALF_W + 24, HALF_W - 24);
        this.py = clamp(this.py + this.pvy * dt, -HALF_H + 24, HALF_H - 24);
        if (Math.abs(this.pvx) > 20) this.facing = this.pvx > 0 ? 1 : -1;
        if (len > 0.1) this.walkT += dt * 14; else this.walkT = 0;
        if (this.iframe > 0) this.iframe -= dt;
        if (this.flashT > 0) this.flashT -= dt;
        // regen
        const regen = run.stats.regen;
        if (regen > 0 && run.hp < run.maxHp) {
            this.regenAcc += regen * 0.2 * dt;
            if (this.regenAcc >= 1) {
                const v = Math.floor(this.regenAcc);
                this.regenAcc -= v;
                this.healPlayer(v);
            }
        }
        this.lifestealWindow -= dt;
        if (this.lifestealWindow <= 0) { this.lifestealWindow = 1; this.lifestealCount = 0; }
        // garden / mines
        if (run.special.garden) {
            this.gardenTimer -= dt;
            if (this.gardenTimer <= 0) {
                this.gardenTimer = 10 / run.special.garden;
                const a = rand(0, TAU), d = rand(80, 220);
                this.spawnPickup('fruit', clamp(this.px + Math.cos(a) * d, -HALF_W + 30, HALF_W - 30), clamp(this.py + Math.sin(a) * d, -HALF_H + 30, HALF_H - 30));
            }
        }
        if (run.special.mine) {
            this.mineTimer -= dt;
            if (this.mineTimer <= 0) {
                this.mineTimer = 9 / run.special.mine;
                const a = rand(0, TAU), d = rand(120, 380);
                this.addStructure('mine', clamp(this.px + Math.cos(a) * d, -HALF_W + 40, HALF_W - 40), clamp(this.py + Math.sin(a) * d, -HALF_H + 40, HALF_H - 40), 1);
            }
        }
        // drones
        const engi = run.stats.engineering;
        for (let i = 0; i < this.drones.length; i++) {
            const d = this.drones[i];
            d.a += dt * 3.2;
            d.x = this.px + Math.cos(d.a) * 95;
            d.y = this.py + Math.sin(d.a) * 80;
            d.spr.node.setPosition(d.x, d.y);
            d.spr.node.angle = d.a * 180 / Math.PI * 2;
        }
        if (this.drones.length) {
            for (const d of this.drones) {
                this.grid.query(d.x, d.y, 30 + 80, this.q);
                for (const e of this.q) {
                    if (!e.alive || e.def.neutral && e.def.ai === 'tree' && false) continue;
                    if (e.hitCd > 0) continue;
                    if (dist2(d.x, d.y, e.x, e.y) < (e.r + 14) * (e.r + 14)) {
                        e.hitCd = 0.35;
                        const dmg = Math.max(1, Math.round((3 + engi * 0.9) * this.dmgMult()));
                        this.damageEnemy(e, dmg, false, e.x - this.px, e.y - this.py, 6, null);
                    }
                }
            }
        }
    }

    renderPlayer(dt: number) {
        const n = this.playerSpr.node;
        if (this.dead) return;
        const bob = this.walkT > 0 ? Math.sin(this.walkT) * 0.07 : Math.sin(this.time * 3) * 0.025;
        n.setPosition(this.px, this.py + 14 + (this.walkT > 0 ? Math.abs(Math.sin(this.walkT)) * 3 : 0));
        n.setScale(this.facing * (1 - bob * 0.6), 1 + bob, 1);
        const frame = this.flashT > 0 ? this.playerFrame + '_w' : this.playerFrame;
        if (frame !== this.playerSprCur) { this.playerSprCur = frame; this.playerSpr.spriteFrame = Atlas.get(frame); }
        // blink while invulnerable
        const blink = this.iframe > 0 && this.running && Math.floor(this.time * 20) % 2 === 0;
        setAlpha(this.playerSpr, blink ? 120 : 255);
    }
    private playerSprCur = '';

    healPlayer(v: number) {
        const run = this.run;
        if (run.hp >= run.maxHp || v <= 0) return;
        const real = Math.min(v, run.maxHp - run.hp);
        run.hp += real;
        this.showNum(this.px, this.py + 40, real, 80, 255, 120, false, true);
    }

    hurtPlayer(dmg: number, src: Enemy = null) {
        if (this.iframe > 0 || this.dead || !this.running) return;
        const run = this.run;
        const st = run.stats;
        if (chance(Math.min(60, st.dodge) / 100)) {
            this.iframe = 0.2;
            Sfx.dodge();
            this.spawnFx('smoke', this.px, this.py + 10, 0, 40, 0.35, 0.7, 1.5, 170, 0, [255, 255, 255]);
            this.glow('glow', this.px, this.py + 14, 0, 0, 0.2, 1.2, 1.8, 120, [160, 220, 255]);
            return;
        }
        if (this.shieldLeft > 0) {
            this.shieldLeft--;
            this.iframe = 0.5;
            this.glow('shock', this.px, this.py + 12, 0, 0, 0.3, 0.4, 1.0, 255, [110, 220, 255]);
            this.glow('glow', this.px, this.py + 12, 0, 0, 0.25, 1.5, 2.5, 200, [110, 220, 255]);
            this.sparks(this.px, this.py + 12, 0, 0, Math.PI, 10, 420, [150, 230, 255]);
            Sfx.shield();
            return;
        }
        const arm = st.armor;
        const mult = arm >= 0 ? 1 - arm / (arm + 15) : 1 + (-arm) / 15;
        const final = Math.max(1, Math.round(dmg * mult));
        run.hp -= final;
        this.iframe = 0.4;
        this.flashT = 0.15;
        this.addShake(9);
        this.freeze(0.06);
        this.host.onPlayerHurt();
        Sfx.hurt();
        this.showNum(this.px, this.py + 40, final, 255, 70, 70, false, false);
        this.glow('hitstar', this.px, this.py + 16, 0, 0, 0.14, 0.8, 1.6, 255, [255, 90, 90]);
        this.sparks(this.px, this.py + 14, 0, 0, Math.PI, 8, 380, [255, 120, 110]);
        if (src && run.special.thorns && src.alive) {
            this.damageEnemy(src, Math.round(run.special.thorns * (1 + arm * 0.1)), false, src.x - this.px, src.y - this.py, 10, null);
        }
        if (run.hp <= 0) {
            if (this.reviveLeft > 0) {
                this.reviveLeft--;
                run.hp = Math.ceil(run.maxHp * 0.5);
                this.iframe = 2;
                this.explode(this.px, this.py, 220, 40 + run.wave * 5, true);
                this.glow('shock', this.px, this.py + 12, 0, 0, 0.5, 0.3, 3.2, 255, [255, 240, 160]);
                this.slowMo(0.6);
                Sfx.revive();
                return;
            }
            run.hp = 0;
            this.killPlayer();
        }
    }

    killPlayer() {
        this.dead = true;
        this.deadT = 0;
        this.running = false;
        this.spawnBurst(this.px, this.py, [255, 255, 255], 26, 380);
        this.gibs(this.px, this.py, [200, 210, 230], 12, 1.2);
        this.glow('glow', this.px, this.py + 14, 0, 0, 0.35, 2, 5, 255, [255, 255, 255]);
        this.glow('shock', this.px, this.py + 14, 0, 0, 0.45, 0.3, 2.6, 255, [255, 200, 200]);
        this.spawnDecal(this.px, this.py, [180, 30, 40], 1.6);
        this.playerSpr.node.setScale(0, 0, 1);
        for (const w of this.weapons) w.spr.node.active = false;
        this.addShake(16);
        this.freeze(0.1);
        this.slowMo(1.0);
        Sfx.gameOver();
    }

    // ================================================================ spawning
    updateSpawning(dt: number) {
        const run = this.run;
        const w = run.endless ? 20 + (run.wave - 20) : run.wave;
        const dangerMul = run.dangerDef.spawnMul;
        const elapsed = this.waveDur - this.waveTime;
        // stop spawning regular enemies in the last 1.5 seconds
        if (this.waveTime > 1.5) {
            for (let i = 0; i < SPAWN_RULES.length; i++) {
                const r = SPAWN_RULES[i];
                if (w < r.from) continue;
                this.spawnTimers[i] -= dt;
                if (this.spawnTimers[i] <= 0) {
                    // spawn faster as the wave goes on
                    const ramp = 1 + elapsed / this.waveDur * 0.6;
                    this.spawnTimers[i] = r.interval / ramp * rand(0.8, 1.2) * (w >= 20 ? 1.3 : 1);
                    let n = Math.round((r.group + r.groupW * (w - r.from)) * dangerMul * rand(0.8, 1.25));
                    n = Math.max(1, n);
                    this.spawnGroup(r.type, n);
                }
            }
        }
        // elites at the start of the wave
        if (!this.eliteSpawned && elapsed > 2) {
            this.eliteSpawned = true;
            const elites = run.endless ? (run.wave % 5 === 0 ? ['boss'] : ['juggernaut', 'queen'].slice(0, 1 + (run.wave % 2))) : elitesForWave(run.wave, run.danger);
            for (const id of elites) this.spawnGroup(id, 1, true);
            if (elites.length) {
                if (elites.indexOf('boss') >= 0) Sfx.bossRoar(); else Sfx.eliteAlarm();
                this.addShake(8);
                this.host.onElite(elites.indexOf('boss') >= 0 ? '首领来袭！' : '精英来袭！');
            }
        }
        // trees
        this.treeTimer -= dt;
        if (this.treeTimer <= 0) {
            this.treeTimer = rand(12, 20) / (1 + run.stats.luck / 150);
            const trees = this.enemies.filter(e => e.def.ai === 'tree').length;
            if (trees < 4) this.spawnGroup('tree', 1);
        }
        if (this.looterTime > 0 && elapsed >= this.looterTime) {
            this.looterTime = -1;
            this.spawnGroup('looter', 1);
        }
    }

    spawnGroup(type: string, n: number, elite = false) {
        let cx = 0, cy = 0;
        for (let tries = 0; tries < 20; tries++) {
            cx = rand(-HALF_W + 70, HALF_W - 70); cy = rand(-HALF_H + 70, HALF_H - 70);
            if (dist2(cx, cy, this.px, this.py) > 320 * 320) break;
        }
        for (let i = 0; i < n; i++) {
            if (!elite && this.enemies.length + this.markers.length >= MAX_ENEMIES) return;
            const m = new Marker();
            m.x = clamp(cx + (n > 1 ? rand(-60, 60) : 0), -HALF_W + 40, HALF_W - 40);
            m.y = clamp(cy + (n > 1 ? rand(-60, 60) : 0), -HALF_H + 40, HALF_H - 40);
            m.type = type; m.t = 0; m.elite = elite;
            m.spr = this.pools.marker.get('marker');
            if (elite) m.spr.node.setScale(2, 2, 1);
            m.spr.node.setPosition(m.x, m.y);
            this.markers.push(m);
        }
    }

    spawnEnemyNow(type: string, x: number, y: number): Enemy {
        const def = ENEMIES[type];
        const run = this.run;
        const e = new Enemy();
        e.def = def; e.id = this.enemyId++;
        e.x = x; e.y = y;
        const w = run.wave;
        const dd = run.dangerDef;
        let hp = def.hp + def.hpW * (w - 1);
        let dmg = def.dmg + def.dmgW * (w - 1);
        if (def.boss) { hp = def.hp; dmg = def.dmg; }
        if (run.endless && w > 20) { const k = 1 + (w - 20) * 0.25; hp *= k * k; dmg *= k; }
        e.maxHp = e.hp = Math.max(1, Math.round(hp * dd.hpMul));
        e.dmg = Math.max(def.neutral ? 0 : 1, Math.round(dmg * dd.dmgMul));
        e.speed = def.speed * rand(0.9, 1.1);
        e.r = def.r;
        e.phase = rand(0, TAU);
        e.timer = rand(1, 3);
        e.timer2 = rand(3, 6);
        e.frame = def.sprite;
        e.spr = this.pools.enemy.get(def.sprite);
        e.spr.node.setPosition(x, y);
        this.enemies.push(e);
        if (def.boss || def.elite) { if (!this.boss || def.boss) this.boss = e; }
        // spawn pop: scale in with overshoot (see render) plus a puff
        e.spawnT = 0;
        e.spr.node.setScale(0.01, 0.01, 1);
        this.spawnFx('smoke', x, y + 6, 0, 0, 0.35, 0.5, 1.2 * Math.max(1, e.r / 22), 150, 0, [200, 185, 225]);
        if (def.elite) {
            this.glow('shock', x, y + 10, 0, 0, 0.5, 0.3, 2.4, 255, [255, 90, 90]);
            this.spawnFx('smoke', x, y, 0, 30, 0.7, 1.5, 3.5, 180, 0, [120, 90, 140]);
        }
        return e;
    }

    // ================================================================ enemies
    rebuildGrid() {
        this.grid.clear();
        for (const e of this.enemies) if (e.alive) this.grid.insert(e);
    }

    updateEnemies(dt: number) {
        const run = this.run;
        // markers
        for (let i = this.markers.length - 1; i >= 0; i--) {
            const m = this.markers[i];
            m.t += dt;
            const blink = Math.floor(m.t * 8) % 2 === 0;
            setAlpha(m.spr, blink ? 255 : 120);
            if (m.t >= (m.elite ? 1.6 : 0.9)) {
                this.pools.marker.put(m.spr);
                this.markers.splice(i, 1);
                // spawning on the player hurts nothing, but nudge them out of the player
                this.spawnEnemyNow(m.type, m.x, m.y);
            }
        }
        const slowAura = run.special.slowAura ? (1 - Math.min(70, run.special.slowAura) / 100) : 1;
        const espeed = Math.max(0.3, 1 + run.stats.enemySpeed / 100);
        const px = this.px, py = this.py;
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.alive) continue;
            e.t += dt; e.life += dt;
            if (e.hitCd > 0) e.hitCd -= dt;
            if (e.flashT > 0) e.flashT -= dt;
            const dx = px - e.x, dy = py - e.y;
            const d = Math.hypot(dx, dy) || 1;
            const nx = dx / d, ny = dy / d;
            let spd = e.speed * espeed;
            if (slowAura < 1 && d < 230) spd *= slowAura;
            let mvx = 0, mvy = 0;
            switch (e.def.ai) {
                case 'chase': case 'mini':
                    mvx = nx * spd; mvy = ny * spd; break;
                case 'runner': {
                    const side = Math.sin(e.t * 4 + e.phase) * 0.6;
                    mvx = (nx - ny * side) * spd; mvy = (ny + nx * side) * spd; break;
                }
                case 'splitter':
                    mvx = nx * spd; mvy = ny * spd; break;
                case 'spitter': {
                    const want = 330;
                    const k = d > want + 40 ? 1 : d < want - 60 ? -1 : 0;
                    mvx = nx * spd * k + (-ny) * spd * 0.3 * Math.sin(e.phase + e.t); mvy = ny * spd * k + nx * spd * 0.3 * Math.sin(e.phase + e.t);
                    e.timer -= dt;
                    if (e.timer <= 0 && d < 600) {
                        e.timer = rand(2.4, 3.2);
                        this.enemyShoot(e.x, e.y, Math.atan2(dy, dx), 290, e.dmg, [140, 255, 120]);
                    }
                    break;
                }
                case 'charger': {
                    if (e.state === 0) {
                        mvx = nx * spd; mvy = ny * spd;
                        e.timer -= dt;
                        if (e.timer <= 0 && d < 450) { e.state = 1; e.stateT = 0.65; e.dirX = nx; e.dirY = ny; }
                    } else if (e.state === 1) {
                        e.stateT -= dt;
                        e.flashT = Math.floor(e.stateT * 12) % 2 === 0 ? 0.05 : 0;
                        if (e.stateT <= 0) { e.state = 2; e.stateT = 0.55; }
                    } else {
                        mvx = e.dirX * 720; mvy = e.dirY * 720;
                        e.stateT -= dt;
                        if (e.stateT <= 0) { e.state = 0; e.timer = rand(2.5, 4); }
                    }
                    break;
                }
                case 'hatcher': {
                    mvx = nx * spd; mvy = ny * spd;
                    e.timer -= dt;
                    if (e.timer <= 0) {
                        e.timer = rand(3.5, 5);
                        if (this.enemies.length < MAX_ENEMIES) {
                            const c = this.spawnEnemyNow('grub', e.x + rand(-20, 20), e.y + rand(-20, 20));
                            c.kbx = rand(-200, 200); c.kby = rand(-200, 200);
                        }
                    }
                    break;
                }
                case 'bomber': {
                    if (e.state === 0) {
                        mvx = nx * spd; mvy = ny * spd;
                        if (d < 80) { e.state = 1; e.stateT = 0.6; }
                    } else {
                        e.stateT -= dt;
                        e.flashT = Math.floor(e.stateT * 16) % 2 === 0 ? 0.05 : 0;
                        if (e.stateT <= 0) {
                            this.enemyExplode(e.x, e.y, 100, e.dmg);
                            this.killEnemy(e, true);
                            continue;
                        }
                    }
                    break;
                }
                case 'looter': {
                    mvx = -nx * spd; mvy = -ny * spd;
                    // steer away from walls
                    if (Math.abs(e.x) > HALF_W - 120) mvx -= Math.sign(e.x) * spd;
                    if (Math.abs(e.y) > HALF_H - 120) mvy -= Math.sign(e.y) * spd;
                    if (e.life > 12) {
                        this.puff(e.x, e.y, e.def, e.r);
                        this.removeEnemy(e);
                        continue;
                    }
                    break;
                }
                case 'tree': break;
                case 'juggernaut': this.aiJuggernaut(e, dt, nx, ny, d, spd); mvx = e.vx; mvy = e.vy; break;
                case 'queen': this.aiQueen(e, dt, nx, ny, d, spd); mvx = e.vx; mvy = e.vy; break;
                case 'boss': this.aiBoss(e, dt, nx, ny, d, spd); mvx = e.vx; mvy = e.vy; break;
            }
            // separation
            if (e.def.ai !== 'tree') {
                this.grid.query(e.x, e.y, e.r + 40, this.q);
                for (let j = 0; j < this.q.length; j++) {
                    const o = this.q[j];
                    if (o === e || !o.alive) continue;
                    const sx = e.x - o.x, sy = e.y - o.y;
                    const rr = (e.r + o.r) * 0.85;
                    const d2 = sx * sx + sy * sy;
                    if (d2 < rr * rr && d2 > 0.01) {
                        const dd = Math.sqrt(d2);
                        const push = (rr - dd) / rr * 260 * (o.def.elite ? 2 : 1) * (e.def.elite ? 0.1 : 1);
                        mvx += sx / dd * push; mvy += sy / dd * push;
                    }
                }
            }
            // knockback
            e.kbx *= Math.pow(0.0015, dt); e.kby *= Math.pow(0.0015, dt);
            e.x += (mvx + e.kbx) * dt;
            e.y += (mvy + e.kby) * dt;
            e.x = clamp(e.x, -HALF_W + e.r * 0.6, HALF_W - e.r * 0.6);
            e.y = clamp(e.y, -HALF_H + e.r * 0.6, HALF_H - e.r * 0.6);
            if (Math.abs(mvx) > 5) e.flip = mvx > 0 ? -1 : 1;
            // contact damage
            if (!e.def.neutral && d < e.r + PLAYER_R - 4) this.hurtPlayer(e.dmg, e);
            // burn
            if (e.burnT > 0) {
                e.burnT -= dt; e.burnTick -= dt;
                if (e.burnTick <= 0) {
                    e.burnTick = 0.5;
                    const bd = Math.max(1, Math.round(e.burnDps * 0.5));
                    this.damageEnemy(e, bd, false, 0, 0, 0, null, true);
                    if (!e.alive) continue;
                    this.spawnFx('b_fire', e.x + rand(-10, 10), e.y + rand(0, 15), rand(-20, 20), 60, 0.4, 0.8, 0.3, 230, 0, [255, 255, 255]);
                }
            }
            // render
            const sq = Math.sin(e.t * 10 + e.phase) * 0.06;
            const frame = e.flashT > 0 ? e.def.sprite + '_w' : e.def.sprite;
            if (frame !== e.frame) { e.frame = frame; e.spr.spriteFrame = Atlas.get(frame); }
            // pop-in with overshoot
            let sp = 1;
            if (e.spawnT < 1) {
                e.spawnT = Math.min(1, e.spawnT + dt / 0.22);
                const t = e.spawnT, c1 = 2.2;
                sp = 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            }
            // hit squash: wider and flatter for a moment
            if (e.punch > 0) e.punch = Math.max(0, e.punch - dt * 7);
            const pw = 1 + e.punch * 0.28, ph = 1 - e.punch * 0.22;
            e.spr.node.setPosition(e.x, e.y + e.r * 0.3);
            e.spr.node.setScale(e.flip * (1 - sq) * e.scale * sp * pw, (1 + sq) * e.scale * sp * ph, 1);
        }
        // clean
        for (let i = this.enemies.length - 1; i >= 0; i--) if (!this.enemies[i].alive) this.enemies.splice(i, 1);
    }

    aiJuggernaut(e: Enemy, dt: number, nx: number, ny: number, d: number, spd: number) {
        e.vx = nx * spd; e.vy = ny * spd;
        if (e.state === 0) {
            e.timer -= dt; e.timer2 -= dt;
            if (e.timer <= 0) { e.state = 1; e.stateT = 0.8; e.dirX = nx; e.dirY = ny; }
            if (e.timer2 <= 0) {
                e.timer2 = rand(5, 7);
                const n = 14 + (e.hp < e.maxHp / 2 ? 6 : 0);
                const off = rand(0, TAU);
                for (let i = 0; i < n; i++) this.enemyShoot(e.x, e.y, off + i / n * TAU, 230, Math.round(e.dmg * 0.6), [255, 120, 90]);
            }
        } else if (e.state === 1) {
            e.vx = 0; e.vy = 0; e.stateT -= dt;
            e.flashT = Math.floor(e.stateT * 10) % 2 === 0 ? 0.05 : 0;
            if (e.stateT <= 0) { e.state = 2; e.stateT = 0.9; }
        } else {
            e.vx = e.dirX * 650; e.vy = e.dirY * 650;
            e.stateT -= dt;
            if (e.stateT <= 0) { e.state = 0; e.timer = rand(3, 4.5); }
        }
    }

    aiQueen(e: Enemy, dt: number, nx: number, ny: number, d: number, spd: number) {
        const k = d > 380 ? 1 : d < 260 ? -1 : 0;
        e.vx = nx * spd * k - ny * spd * 0.6; e.vy = ny * spd * k + nx * spd * 0.6;
        e.timer -= dt; e.timer2 -= dt;
        if (e.timer <= 0) {
            e.timer = e.hp < e.maxHp / 2 ? 1.6 : 2.3;
            const base = Math.atan2(ny, nx);
            for (let i = -2; i <= 2; i++) this.enemyShoot(e.x, e.y, base + i * 0.2, 300, Math.round(e.dmg * 0.7), [150, 255, 120]);
        }
        if (e.timer2 <= 0) {
            e.timer2 = rand(6, 8);
            for (let i = 0; i < 4; i++) {
                if (this.enemies.length >= MAX_ENEMIES + 10) break;
                const a = i / 4 * TAU;
                this.spawnEnemyNow(i % 2 ? 'runner' : 'spitter', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
            }
        }
    }

    aiBoss(e: Enemy, dt: number, nx: number, ny: number, d: number, spd: number) {
        const enraged = e.hp < e.maxHp * 0.5;
        const s = enraged ? spd * 1.35 : spd;
        e.timer -= dt; e.timer2 -= dt; e.stateT -= dt;
        if (e.state === 0) {
            e.vx = nx * s; e.vy = ny * s;
            if (e.timer <= 0) {
                e.timer = enraged ? 2.2 : 3;
                const n = enraged ? 22 : 16;
                const off = rand(0, TAU);
                for (let i = 0; i < n; i++) this.enemyShoot(e.x, e.y, off + i / n * TAU, 240, Math.round(e.dmg * 0.6), [255, 90, 200]);
            }
            if (e.timer2 <= 0) {
                e.timer2 = enraged ? 5 : 7;
                if (enraged || chance(0.5)) { e.state = 1; e.stateT = 0.9; e.dirX = nx; e.dirY = ny; }
                else { e.state = 3; e.stateT = 2.4; e.dirX = 0; }
            }
        } else if (e.state === 1) { // telegraph charge
            e.vx = 0; e.vy = 0;
            e.flashT = Math.floor(e.stateT * 10) % 2 === 0 ? 0.05 : 0;
            if (e.stateT <= 0) { e.state = 2; e.stateT = 1.0; }
        } else if (e.state === 2) { // charge
            e.vx = e.dirX * 700; e.vy = e.dirY * 700;
            if (e.stateT <= 0) {
                e.state = 0;
                for (let i = 0; i < 4; i++) if (this.enemies.length < MAX_ENEMIES + 10) this.spawnEnemyNow(enraged ? 'charger' : 'grub', e.x + rand(-80, 80), e.y + rand(-80, 80));
            }
        } else if (e.state === 3) { // spiral
            e.vx = nx * s * 0.3; e.vy = ny * s * 0.3;
            e.dirX += dt;
            if (Math.floor(e.dirX * 12) !== Math.floor((e.dirX - dt) * 12)) {
                for (let k = 0; k < 3; k++) this.enemyShoot(e.x, e.y, e.dirX * 3 + k * TAU / 3, 260, Math.round(e.dmg * 0.5), [200, 120, 255]);
            }
            if (e.stateT <= 0) e.state = 0;
        }
    }

    enemyShoot(x: number, y: number, ang: number, speed: number, dmg: number, color: number[]) {
        const b = new Bullet();
        b.enemy = true; b.x = x; b.y = y; b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed;
        b.dmg = Math.max(1, dmg); b.r = 10; b.maxDist = 1400;
        b.spr = this.pools.bullet.get('b_enemy');
        setTint(b.spr, color[0], color[1], color[2]);
        b.spr.node.setPosition(x, y);
        this.bullets.push(b);
        Sfx.spit();
    }

    enemyExplode(x: number, y: number, radius: number, dmg: number) {
        this.boomFx(x, y, radius, true, [255, 110, 60]);
        Sfx.explode(true);
        this.addShake(8);
        if (dist2(x, y, this.px, this.py) < (radius + PLAYER_R) * (radius + PLAYER_R)) this.hurtPlayer(dmg);
    }

    // ================================================================ damage
    dmgMult() {
        const run = this.run, st = run.stats;
        let pct = st.damage;
        if (run.special.lowHpDmg && run.hp < run.maxHp * 0.5) pct += run.special.lowHpDmg;
        if (run.special.speedDmg) pct += Math.max(0, st.speed) * run.special.speedDmg / 100;
        return Math.max(0.1, 1 + pct / 100);
    }

    weaponDamage(def: WeaponDef, tier: number): number {
        const st = this.run.stats as any;
        let base = def.dmg[tier - 1];
        for (const k in def.scaling) base += def.scaling[k] * (st[k] || 0);
        return Math.max(1, base * this.dmgMult());
    }

    weaponCooldown(def: WeaponDef, tier: number) {
        const run = this.run;
        let as = run.stats.atkSpd;
        if (def.melee && run.special.meleeAtkSpd) as += run.special.meleeAtkSpd;
        if (def.classes.indexOf('elemental') >= 0 && run.special.elemAtkSpd) as += run.special.elemAtkSpd;
        const base = def.cd[tier - 1];
        return as >= 0 ? base / (1 + as / 100) : base * (1 - as / 100);
    }

    weaponRange(def: WeaponDef) {
        const r = this.run.stats.range;
        return Math.max(def.melee ? 80 : 120, def.range + (def.melee ? r * 0.5 : r));
    }

    rollCrit(def: WeaponDef, dmg: number): [number, boolean] {
        const st = this.run.stats;
        if (chance(def.crit + st.crit / 100)) return [Math.round(dmg * def.critMult * (1 + st.critDmg / 100)), true];
        return [Math.round(dmg), false];
    }

    damageEnemy(e: Enemy, dmg: number, crit: boolean, dirx: number, diry: number, kb: number, wi: WeaponInst | Bullet | null, isBurn = false) {
        if (!e.alive) return;
        const run = this.run;
        // execute
        if (!isBurn && run.special.execute && !e.def.elite && chance(run.special.execute / 100)) dmg = Math.max(dmg, e.hp);
        e.hp -= dmg;
        run.damageDone += dmg;
        if (!isBurn) e.flashT = 0.08;
        if (kb > 0 && !e.def.elite) {
            const l = Math.hypot(dirx, diry) || 1;
            const k = (kb + run.stats.knockback) * 14 * (1 - (e.def.kbRes || 0));
            e.kbx += dirx / l * k; e.kby += diry / l * k;
        }
        if (isBurn) this.showNum(e.x, e.y + e.r, dmg, 255, 150, 50, false, false);
        else if (crit) this.showNum(e.x, e.y + e.r, dmg, 255, 220, 60, true, false);
        else this.showNum(e.x, e.y + e.r, dmg, 255, 255, 255, false, false);
        if (!isBurn) {
            const heavy = kb >= 8 || dmg >= 40;
            Sfx.hit(crit, heavy);
            e.punch = Math.min(1, e.punch + (crit || heavy ? 1 : 0.7));
            // impact flash on the side the hit came from, sparks spraying through the enemy
            const l = Math.hypot(dirx, diry);
            const ux = l > 0 ? dirx / l : 0, uy = l > 0 ? diry / l : 0;
            const ix = e.x - ux * e.r * 0.5, iy = e.y + 10 - uy * e.r * 0.5;
            const big = crit || heavy;
            if (this.particles.length < MAX_PARTICLES - 40 || big) {
                this.glow('hitstar', ix, iy, 0, 0, big ? 0.13 : 0.09, big ? 0.7 : 0.45, big ? 1.5 : 0.9, 255,
                    crit ? [255, 225, 90] : [255, 255, 235], Math.random() * 90);
                this.sparks(ix, iy, ux, uy, l > 0 ? 0.9 : Math.PI, big ? 6 : 3, big ? 520 : 380, crit ? [255, 210, 80] : [255, 245, 200]);
            }
            if (crit) {
                this.glow('shock', e.x, e.y + 10, 0, 0, 0.18, 0.15, 0.55 * Math.max(1, e.r / 22), 255, [255, 220, 90]);
                this.addShake(2.5);
            }
            // lifesteal
            let ls = run.stats.lifesteal / 100;
            if (wi && (wi as any).def && (wi as WeaponInst).def.lifesteal) ls += (wi as WeaponInst).def.lifesteal;
            if (wi && (wi as Bullet).lifesteal) ls += (wi as Bullet).lifesteal;
            if (ls > 0 && this.lifestealCount < 10 && chance(ls)) { this.lifestealCount++; this.healPlayer(1); }
            if (crit && run.special.critHeal && chance(run.special.critHeal / 100)) this.healPlayer(1);
        }
        if (e.hp <= 0) this.killEnemy(e, false);
    }

    applyBurn(e: Enemy, dps: number) {
        if (!e.alive || dps <= 0) return;
        e.burnDps = Math.max(e.burnDps * (e.burnT > 0 ? 1 : 0), dps);
        e.burnT = 3;
        if (e.burnTick <= 0) e.burnTick = 0.5;
    }

    burnDps(def: WeaponDef, tier: number) {
        if (!def.burn) return 0;
        const st = this.run.stats;
        return (def.burn[tier - 1] + st.elemental * 0.6) * (1 + st.burnDmg / 100) * this.dmgMult();
    }

    removeEnemy(e: Enemy) {
        e.alive = false;
        this.pools.enemy.put(e.spr);
        if (this.boss === e) this.boss = this.enemies.find(o => o.alive && o !== e && o.def.elite) || null;
    }

    killEnemy(e: Enemy, silent: boolean) {
        if (!e.alive) return;
        const run = this.run;
        this.removeEnemy(e);
        this.deathFx(e, true);
        if (e.def.elite) {
            // big moment: freeze, slow-mo, explosion
            this.boomFx(e.x, e.y, e.def.boss ? 260 : 170, true, this.enemyColor(e.def));
            this.addShake(e.def.boss ? 16 : 12);
            this.freeze(e.def.boss ? 0.14 : 0.09);
            this.slowMo(e.def.boss ? 1.4 : 0.8);
            Sfx.explode(true);
        }
        Sfx.kill(e.def.elite || e.r >= 30);
        if (silent) return;
        if (e.def.ai !== 'tree' && e.def.ai !== 'looter') run.kills++;
        // drops
        let mats = e.def.mats;
        if (run.special.goldKill && chance(run.special.goldKill / 100)) mats++;
        for (let i = 0; i < mats; i++) this.spawnPickup('mat', e.x, e.y);
        const luck = 1 + run.stats.luck / 100;
        if (e.def.ai === 'tree') {
            for (let i = 0; i < 2; i++) this.spawnPickup('fruit', e.x, e.y);
            if (chance(0.3 * luck)) this.spawnPickup('crate', e.x, e.y, 1);
        } else if (e.def.ai === 'looter') {
            this.spawnPickup('crate', e.x, e.y, 1);
        } else if (e.def.elite) {
            this.spawnPickup('crate', e.x, e.y, 2);
            if (e.def.boss) this.spawnPickup('crate', e.x + 30, e.y, 2);
        } else {
            if (chance(0.012 * luck)) this.spawnPickup('fruit', e.x, e.y);
            else if (chance(0.007 * luck)) this.spawnPickup('crate', e.x, e.y, 1);
        }
        // splitter children
        if (e.def.ai === 'splitter') {
            const n = run.wave >= 12 ? 3 : 2;
            for (let i = 0; i < n; i++) {
                const c = this.spawnEnemyNow('mini', e.x + rand(-10, 10), e.y + rand(-10, 10));
                const a = i / n * TAU;
                c.kbx = Math.cos(a) * 300; c.kby = Math.sin(a) * 300;
            }
        }
        // explode on kill
        if (run.special.explodeOnKill && chance(run.special.explodeOnKill / 100)) {
            this.explode(e.x, e.y, 70, Math.round(8 * this.dmgMult()), false);
        }
    }

    explode(x: number, y: number, radius: number, dmg: number, big: boolean) {
        const rad = radius * (1 + this.run.stats.explSize / 100);
        this.boomFx(x, y, rad, big, [255, 170, 60]);
        Sfx.explode(big);
        this.addShake(big ? 8 : 5);
        this.grid.query(x, y, rad + 80, this.q);
        const list = this.q.slice();
        for (const e of list) {
            if (!e.alive) continue;
            if (dist2(x, y, e.x, e.y) < (rad + e.r) * (rad + e.r)) this.damageEnemy(e, dmg, false, e.x - x, e.y - y, 12, null);
        }
    }

    enemyColor(def: EnemyDef): number[] {
        switch (def.id) {
            case 'grub': return [126, 87, 194];
            case 'runner': return [224, 82, 151];
            case 'spitter': return [102, 187, 106];
            case 'charger': return [239, 108, 58];
            case 'splitter': case 'mini': return [66, 165, 245];
            case 'brute': return [94, 75, 139];
            case 'hatcher': return [173, 78, 122];
            case 'bomber': return [229, 57, 53];
            case 'looter': return [255, 202, 40];
            case 'tree': return [38, 198, 218];
            case 'juggernaut': return [163, 59, 59];
            case 'queen': return [76, 175, 80];
            default: return [91, 42, 134];
        }
    }

    // ================================================================ weapons
    findTarget(x: number, y: number, range: number): Enemy {
        let best: Enemy = null, bd = range * range;
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.alive) continue;
            const d = dist2(x, y, e.x, e.y) - e.r * e.r;
            if (d < bd) { bd = d; best = e; }
        }
        return best;
    }

    updateWeapons(dt: number) {
        if (this.dead) return;
        for (const wi of this.weapons) {
            const def = wi.def;
            const restX = this.px + wi.bx, restY = this.py + wi.by;
            const range = this.weaponRange(def);
            if (wi.animT >= 0) {
                this.animateMelee(wi, dt, restX, restY);
                continue;
            }
            wi.x = restX; wi.y = restY;
            wi.cd -= dt;
            if (wi.recoil > 0) wi.recoil = Math.max(0, wi.recoil - dt * 60);
            const target = this.findTarget(restX, restY, range);
            if (target) {
                const ta = Math.atan2(target.y - restY, target.x - restX);
                wi.angle += angleDiff(wi.angle, ta) * Math.min(1, dt * 20);
                if (wi.cd <= 0 && Math.abs(angleDiff(wi.angle, ta)) < 0.5) {
                    wi.cd = this.weaponCooldown(def, wi.tier);
                    this.fire(wi, target, ta, range);
                }
            } else {
                const ta = this.facing > 0 ? 0 : Math.PI;
                wi.angle += angleDiff(wi.angle, ta) * Math.min(1, dt * 6);
            }
            this.placeWeapon(wi, wi.x - Math.cos(wi.angle) * wi.recoil, wi.y - Math.sin(wi.angle) * wi.recoil, wi.angle);
        }
    }

    placeWeapon(wi: WeaponInst, x: number, y: number, ang: number) {
        const n = wi.spr.node;
        n.setPosition(x, y + 10);
        n.angle = ang * 180 / Math.PI;
        const left = Math.cos(ang) < 0;
        n.setScale(1, left ? -1 : 1, 1);
    }

    fire(wi: WeaponInst, target: Enemy, ang: number, range: number) {
        const def = wi.def, tier = wi.tier;
        if (def.attack === 'thrust') {
            const d = Math.min(range, Math.hypot(target.x - wi.x, target.y - wi.y) + 20);
            wi.animT = 0; wi.animDur = Math.min(0.32, Math.max(0.16, this.weaponCooldown(def, tier) * 0.7));
            wi.reach = d; wi.hitIds.length = 0; wi.angle = ang;
            Sfx.swing(def.id === 'fist' || def.id === 'wrench' ? 1 : 2);
        } else if (def.attack === 'sweep') {
            wi.animT = 0; wi.animDur = 0.24;
            wi.sweepFrom = ang - (def.arc || 1.6) / 2; wi.sweepTo = ang + (def.arc || 1.6) / 2;
            wi.reach = range;
            wi.hitIds.length = 0;
            this.sweepHit(wi, ang, range);
            Sfx.swing(def.id === 'hammer' ? 1 : 0);
        } else if (def.attack === 'shoot') {
            this.shoot(wi, ang, range);
            wi.recoil = 8;
        } else if (def.attack === 'beam') {
            this.beam(wi, ang, range);
            wi.recoil = 10;
        } else if (def.attack === 'chain') {
            this.chain(wi, target);
            wi.recoil = 5;
        }
    }

    animateMelee(wi: WeaponInst, dt: number, restX: number, restY: number) {
        const def = wi.def;
        wi.animT += dt;
        const t = Math.min(1, wi.animT / wi.animDur);
        if (def.attack === 'thrust') {
            const ext = t < 0.5 ? t * 2 : (1 - t) * 2;
            const reach = (wi.reach - 30) * Math.sin(ext * Math.PI / 2);
            const x = restX + Math.cos(wi.angle) * reach;
            const y = restY + Math.sin(wi.angle) * reach;
            wi.x = restX; wi.y = restY;
            this.placeWeapon(wi, x, y, wi.angle);
            // hit test at the tip
            const sz = Atlas.sizes[def.sprite];
            const tipX = x + Math.cos(wi.angle) * sz.w * 0.6, tipY = y + Math.sin(wi.angle) * sz.w * 0.6;
            // motion streak while extending
            if (t < 0.5 && this.particles.length < MAX_PARTICLES - 60) {
                const st = this.glow('streak', tipX - Math.cos(wi.angle) * 20, tipY + 10 - Math.sin(wi.angle) * 20, 0, 0, 0.1, 1, 1, 150,
                    def.id === 'chainsaw' ? [255, 200, 120] : [220, 240, 255], wi.angle * 180 / Math.PI);
                st.sx = 1.1; st.sy = 1.2;
            }
            this.grid.query(tipX, tipY, 26 + 80, this.q);
            for (const e of this.q) {
                if (!e.alive || wi.hitIds.indexOf(e.id) >= 0) continue;
                const rr = e.r + 22;
                // test tip and middle of weapon
                if (dist2(tipX, tipY, e.x, e.y) < rr * rr || dist2((x + tipX) / 2, (y + tipY) / 2, e.x, e.y) < rr * rr * 0.6) {
                    wi.hitIds.push(e.id);
                    this.meleeHit(wi, e);
                }
            }
        } else {
            // sweep visual: rotate around the player
            const k = t < 0.7 ? t / 0.7 : 1;
            const a = lerp(wi.sweepFrom, wi.sweepTo, 1 - Math.pow(1 - k, 2));
            const dist = Math.min(wi.reach * 0.55, 110);
            const x = this.px + Math.cos(a) * dist, y = this.py + Math.sin(a) * dist;
            this.placeWeapon(wi, x - Math.cos(a) * 20, y - Math.sin(a) * 20, a);
            if (t >= 1) wi.angle = (wi.sweepFrom + wi.sweepTo) / 2;
        }
        if (t >= 1) wi.animT = -1;
    }

    sweepHit(wi: WeaponInst, ang: number, range: number) {
        const def = wi.def;
        const arc = def.arc || 1.6;
        const col = def.id === 'flamesword' ? [255, 150, 60] : def.id === 'hammer' ? [255, 235, 200] : [170, 235, 255];
        const sx = this.px + Math.cos(ang) * 8, sy = this.py + Math.sin(ang) * 8 + 10;
        // two arcs: a wide soft one and a bright thin leading edge
        const fx = this.glow('slash', sx, sy, 0, 0, 0.2, range / 62, range / 50, 230, col, ang * 180 / Math.PI);
        fx.sy = arc / 1.6;
        const fx2 = this.glow('slash', sx, sy, 0, 0, 0.12, range / 58, range / 54, 255, [255, 255, 255], ang * 180 / Math.PI + 8);
        fx2.sy = arc / 1.6 * 0.6;
        this.grid.query(this.px, this.py, range + 80, this.q);
        const list = this.q.slice();
        for (const e of list) {
            if (!e.alive) continue;
            const dx = e.x - this.px, dy = e.y - this.py;
            const d = Math.hypot(dx, dy);
            if (d > range + e.r) continue;
            const a = Math.atan2(dy, dx);
            if (Math.abs(angleDiff(ang, a)) > arc / 2 + Math.atan2(e.r, Math.max(1, d))) continue;
            this.meleeHit(wi, e);
        }
    }

    meleeHit(wi: WeaponInst, e: Enemy) {
        const def = wi.def;
        const [dmg, crit] = this.rollCrit(def, this.weaponDamage(def, wi.tier));
        this.damageEnemy(e, dmg, crit, e.x - this.px, e.y - this.py, def.kb, wi);
        if (def.burn) this.applyBurn(e, this.burnDps(def, wi.tier));
        if (def.heal && chance(def.heal[wi.tier - 1])) this.healPlayer(1);
    }

    shoot(wi: WeaponInst, ang: number, range: number) {
        const def = wi.def, tier = wi.tier, st = this.run.stats;
        const count = (def.count ? def.count[tier - 1] : 1) + Math.max(0, Math.round(st.projectiles));
        const sz = Atlas.sizes[def.sprite];
        const mx = wi.x + Math.cos(ang) * sz.w * 0.75, my = wi.y + Math.sin(ang) * sz.w * 0.75 + 10;
        const spread = (def.spread || 0) + (count > 1 && !def.spread ? 0.25 : 0);
        const spec = def.bullet;
        for (let i = 0; i < count; i++) {
            let a = ang;
            if (count > 1) a += (i / (count - 1) - 0.5) * spread * (def.count ? 1 : 1);
            else if (spread) a += rand(-spread / 2, spread / 2);
            if (def.count && count > 1) a += rand(-0.05, 0.05);
            const b = new Bullet();
            b.x = mx; b.y = my;
            const sp = spec.speed * (def.id === 'flamethrower' ? rand(0.85, 1.15) : 1);
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
            b.maxDist = range * 1.15;
            const [dmg, crit] = this.rollCrit(def, this.weaponDamage(def, tier));
            b.dmg = dmg; b.crit = crit;
            b.pierce = (def.pierce ? def.pierce[tier - 1] : 0) + Math.max(0, Math.round(st.pierce));
            b.bounce = (def.bounce ? def.bounce[tier - 1] : 0) + Math.max(0, Math.round(st.bounce));
            b.explode = spec.explode || 0;
            b.burn = def.burn ? this.burnDps(def, tier) : 0;
            b.heal = def.heal ? def.heal[tier - 1] : 0;
            b.kb = def.kb;
            b.weapon = def; b.tier = tier;
            b.r = spec.explode ? 14 : 10 * (spec.size || 1);
            b.trail = spec.trail ? 1 : 0;
            b.grenade = def.id === 'grenade';
            b.spr = this.pools.bullet.get(spec.sprite);
            const s = (spec.size || 1) * (def.id === 'flamethrower' ? rand(0.8, 1.2) : 1);
            b.spr.node.setScale(s, s, 1);
            if (spec.tint) { const c = parseHex(spec.tint); setTint(b.spr, c[0], c[1], c[2]); b.color = c; }
            b.spr.node.angle = a * 180 / Math.PI;
            b.spr.node.setPosition(b.x, b.y);
            this.bullets.push(b);
        }
        // muzzle flash, shell casings and recoil kick
        const deg = ang * 180 / Math.PI;
        const heavy = def.id === 'shotgun' || def.id === 'sniper' || def.id === 'rocket';
        const gun = def.classes.indexOf('gun') >= 0;
        if (def.id !== 'flamethrower' && def.id !== 'grenade' && def.id !== 'slingshot') {
            const mcol = def.id === 'medigun' ? [140, 255, 170] : [255, 225, 140];
            const m = this.glow('muzzle', mx, my, 0, 0, heavy ? 0.09 : 0.06, heavy ? 1.5 : 1.0, heavy ? 1.1 : 0.7, 255, mcol, deg);
            m.ease = 1;
            this.glow('glow', mx, my, 0, 0, 0.08, heavy ? 1.3 : 0.7, heavy ? 1.6 : 0.9, 200, mcol);
        }
        if (gun && def.id !== 'rocket' && this.particles.length < MAX_PARTICLES - 60) {
            const side = Math.cos(ang) >= 0 ? -1 : 1;
            const c = this.spawnFx('casing', wi.x, wi.y + 10, side * rand(60, 140) - Math.cos(ang) * 40, 0, rand(0.5, 0.7), 1, 1, 255, 255, [255, 255, 255]);
            c.z = 6; c.vz = rand(180, 260); c.grav = 900; c.vr = rand(-900, 900); c.drag = 2;
        }
        if (heavy) {
            this.kick(-Math.cos(ang), -Math.sin(ang), def.id === 'sniper' ? 7 : 9);
            this.addShake(2);
        }
        Sfx.shot(def.id);
    }

    beam(wi: WeaponInst, ang: number, range: number) {
        const def = wi.def, tier = wi.tier;
        const sz = Atlas.sizes[def.sprite];
        const sx = wi.x + Math.cos(ang) * sz.w * 0.75, sy = wi.y + Math.sin(ang) * sz.w * 0.75 + 10;
        const ex = sx + Math.cos(ang) * range, ey = sy + Math.sin(ang) * range;
        const deg = ang * 180 / Math.PI;
        const fx = this.glow('beam', (sx + ex) / 2, (sy + ey) / 2, 0, 0, 0.24, 1, 0.15, 255, [230, 100, 255], deg);
        fx.sx = range / 16; fx.sy = 2.4;
        const core = this.glow('beam', (sx + ex) / 2, (sy + ey) / 2, 0, 0, 0.16, 1, 0.3, 255, [255, 240, 255], deg);
        core.sx = range / 16; core.sy = 0.8;
        this.glow('glow', sx, sy, 0, 0, 0.14, 1.2, 1.8, 255, [230, 120, 255]);
        this.glow('hitstar', ex, ey, 0, 0, 0.14, 0.6, 1.2, 255, [240, 160, 255], rand(0, 90));
        this.kick(-Math.cos(ang), -Math.sin(ang), 4);
        Sfx.laser();
        // hit everything on the segment
        const dx = ex - sx, dy = ey - sy, L2 = dx * dx + dy * dy;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            let t = ((e.x - sx) * dx + (e.y - 10 - sy) * dy) / L2;
            t = clamp(t, 0, 1);
            const cx = sx + dx * t, cy = sy + dy * t;
            if (dist2(cx, cy, e.x, e.y + 10) < (e.r + 10) * (e.r + 10)) {
                const [dmg, crit] = this.rollCrit(def, this.weaponDamage(def, tier));
                this.damageEnemy(e, dmg, crit, dx, dy, def.kb, null);
            }
        }
    }

    chain(wi: WeaponInst, target: Enemy) {
        const def = wi.def, tier = wi.tier;
        let jumps = def.chain[tier - 1] + Math.max(0, Math.round(this.run.stats.bounce));
        let fromX = wi.x + Math.cos(wi.angle) * 50, fromY = wi.y + Math.sin(wi.angle) * 50 + 10;
        let cur = target;
        const hit: number[] = [];
        Sfx.zap();
        while (cur && jumps >= 0) {
            this.lightning(fromX, fromY, cur.x, cur.y + 10);
            const [dmg, crit] = this.rollCrit(def, this.weaponDamage(def, tier));
            hit.push(cur.id);
            fromX = cur.x; fromY = cur.y + 10;
            const cx = cur.x, cy = cur.y;
            this.damageEnemy(cur, dmg, crit, 0, 0, 0, null);
            jumps--;
            // next nearest not yet hit
            let best: Enemy = null, bd = 260 * 260;
            for (const e of this.enemies) {
                if (!e.alive || hit.indexOf(e.id) >= 0) continue;
                const d = dist2(cx, cy, e.x, e.y);
                if (d < bd) { bd = d; best = e; }
            }
            cur = best;
        }
    }

    lightning(x1: number, y1: number, x2: number, y2: number) {
        // jagged 3-segment bolt
        const pts = [[x1, y1]];
        const segs = 3;
        for (let i = 1; i < segs; i++) {
            const t = i / segs;
            pts.push([lerp(x1, x2, t) + rand(-18, 18), lerp(y1, y2, t) + rand(-18, 18)]);
        }
        pts.push([x2, y2]);
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const deg = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
            const fx = this.glow('beam', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, 0, 0.18, 1, 0.4, 255, [120, 210, 255], deg);
            fx.sx = len / 16; fx.sy = 1.8;
            const core = this.glow('beam', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, 0, 0.1, 1, 0.5, 255, [235, 250, 255], deg);
            core.sx = len / 16; core.sy = 0.6;
        }
        this.glow('glow', x2, y2, 0, 0, 0.16, 0.8, 1.4, 255, [140, 220, 255]);
    }

    // ================================================================ structures
    addStructure(kind: 'turret' | 'mine', x: number, y: number, tier: number) {
        if (kind === 'mine' && this.structures.filter(s => s.kind === 'mine').length >= 12) return;
        const s = new Structure();
        s.kind = kind; s.x = x; s.y = y; s.tier = tier;
        s.spr = this.pools.struct.get(kind);
        s.spr.node.setPosition(x, y + 12);
        if (kind === 'turret') {
            s.gun = this.pools.struct.get('turret_gun', undefined, undefined, 0.2, 0.5);
            s.gun.node.setPosition(x, y + 20);
            s.cd = rand(0.2, 1);
        }
        this.structures.push(s);
        this.spawnFx('smoke', x, y + 6, 0, 0, 0.35, 0.6, 1.4, 190, 0, [220, 255, 200]);
        if (kind === 'mine' && this.running) Sfx.mine();
    }

    updateStructures(dt: number) {
        const engi = this.run.stats.engineering;
        for (let i = this.structures.length - 1; i >= 0; i--) {
            const s = this.structures[i];
            s.t += dt;
            if (s.kind === 'turret') {
                s.cd -= dt;
                const target = this.findTarget(s.x, s.y + 8, 520);
                if (target) {
                    const a = Math.atan2(target.y - (s.y + 8), target.x - s.x);
                    s.angle += angleDiff(s.angle, a) * Math.min(1, dt * 15);
                    s.gun.node.angle = s.angle * 180 / Math.PI;
                    s.gun.node.setScale(1, Math.cos(s.angle) < 0 ? -1 : 1, 1);
                    if (s.cd <= 0) {
                        s.cd = 1.0 / (1 + this.run.stats.structAtkSpd / 100) / (1 + (s.tier - 1) * 0.15);
                        const b = new Bullet();
                        b.x = s.x + Math.cos(a) * 26; b.y = s.y + 8 + Math.sin(a) * 26;
                        b.vx = Math.cos(a) * 1200; b.vy = Math.sin(a) * 1200;
                        b.maxDist = 600;
                        b.dmg = Math.max(1, Math.round(([3, 5, 7, 11][s.tier - 1] + engi * 1.0)));
                        b.r = 9; b.kb = 4;
                        b.spr = this.pools.bullet.get('b_round');
                        setTint(b.spr, 160, 255, 120);
                        b.spr.node.setPosition(b.x, b.y);
                        this.bullets.push(b);
                        this.glow('muzzle', b.x, b.y, 0, 0, 0.06, 0.8, 0.6, 255, [190, 255, 150], a * 180 / Math.PI);
                        Sfx.shot('turret');
                    }
                }
            } else {
                // mine
                if (s.t < 0.6) { setAlpha(s.spr, 140); continue; }
                setAlpha(s.spr, 255);
                const blink = Math.floor(s.t * 3) % 2 === 0;
                s.spr.spriteFrame = Atlas.get(blink ? 'mine' : 'mine_w');
                this.grid.query(s.x, s.y, 30 + 80, this.q);
                let trig = false;
                for (const e of this.q) if (e.alive && !e.def.neutral && dist2(s.x, s.y, e.x, e.y) < (e.r + 16) * (e.r + 16)) { trig = true; break; }
                if (trig) {
                    this.explode(s.x, s.y, 90, Math.round((10 + engi * 1.5) * (1 + this.run.stats.damage / 200)), false);
                    this.pools.struct.put(s.spr);
                    this.structures.splice(i, 1);
                }
            }
        }
    }

    // ================================================================ bullets
    updateBullets(dt: number) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            const stepX = b.vx * dt, stepY = b.vy * dt;
            b.x += stepX; b.y += stepY;
            b.dist += Math.hypot(stepX, stepY);
            let dead = b.dist > b.maxDist || b.x < -HALF_W - 40 || b.x > HALF_W + 40 || b.y < -HALF_H - 40 || b.y > HALF_H + 40;
            if (b.enemy) {
                if (!this.dead && dist2(b.x, b.y, this.px, this.py) < (b.r + PLAYER_R - 2) * (b.r + PLAYER_R - 2)) {
                    this.hurtPlayer(b.dmg);
                    dead = true;
                }
                b.spr.node.angle += dt * 360;
            } else {
                if (b.trail && Math.random() < 0.7) {
                    if (b.explode) {
                        this.spawnFx('smoke', b.x - b.vx * 0.02, b.y - b.vy * 0.02, rand(-20, 20), rand(-20, 20), 0.45, 0.3, 0.9, 150, 0, [210, 205, 200]);
                        this.glow('glow', b.x - b.vx * 0.015, b.y - b.vy * 0.015, 0, 0, 0.08, 0.5, 0.2, 220, [255, 170, 70]);
                    } else this.glow('glow', b.x, b.y, 0, 0, 0.15, 0.4, 0.1, 200, [160, 240, 255]);
                }
                // tracer streak behind fast bullets
                const bsp2 = b.vx * b.vx + b.vy * b.vy;
                if (bsp2 > 700 * 700 && !b.explode && (this.time * 60 | 0) % 2 === (i & 1) && this.particles.length < MAX_PARTICLES - 80) {
                    const st = this.glow('streak', b.x - b.vx * 0.022, b.y - b.vy * 0.022, 0, 0, 0.06, 1, 1, 140,
                        b.color || [255, 240, 190], Math.atan2(b.vy, b.vx) * 180 / Math.PI);
                    st.sx = Math.min(2.2, Math.sqrt(bsp2) / 900); st.sy = 0.9;
                }
                if (b.grenade) b.spr.node.angle += dt * 500;
                if (b.weapon && b.weapon.id === 'flamethrower') {
                    const k = b.dist / b.maxDist;
                    b.spr.node.setScale(0.6 + k * 1.4, 0.6 + k * 1.4, 1);
                    setAlpha(b.spr, 255 * (1 - k * 0.8));
                }
                if (!dead) {
                    this.grid.query(b.x, b.y, b.r + 80, this.q);
                    for (let j = 0; j < this.q.length; j++) {
                        const e = this.q[j];
                        if (!e.alive || b.hits.indexOf(e.id) >= 0) continue;
                        const rr = b.r + e.r;
                        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
                            b.hits.push(e.id);
                            if (b.explode) {
                                this.explode(b.x, b.y, b.explode, b.dmg, true);
                                dead = true; break;
                            }
                            this.damageEnemy(e, b.dmg, b.crit, b.vx, b.vy, b.kb, b);
                            if (b.burn) this.applyBurn(e, b.burn);
                            if (b.heal && chance(b.heal)) this.healPlayer(1);
                            if (b.pierce > 0) {
                                b.pierce--;
                                b.dmg = Math.max(1, Math.round(b.dmg * 0.75));
                            } else if (b.bounce > 0) {
                                b.bounce--;
                                const nt = this.nearestExcluding(b.x, b.y, 400, b.hits);
                                if (nt) {
                                    const sp = Math.hypot(b.vx, b.vy);
                                    const a = Math.atan2(nt.y - b.y, nt.x - b.x);
                                    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
                                    b.spr.node.angle = a * 180 / Math.PI;
                                    b.dist = 0; b.maxDist = 420;
                                } else { dead = true; }
                                break;
                            } else { dead = true; }
                            if (dead) break;
                        }
                    }
                }
                if (dead && b.explode && b.dist > b.maxDist) this.explode(b.x, b.y, b.explode, b.dmg, true);
            }
            if (dead) {
                // enemy bullets pop when they land
                if (b.enemy && this.particles.length < MAX_PARTICLES - 40) this.glow('glow', b.x, b.y, 0, 0, 0.12, 0.5, 0.9, 200, [255, 200, 180]);
                this.pools.bullet.put(b.spr);
                this.bullets.splice(i, 1);
            } else {
                b.spr.node.setPosition(b.x, b.y);
            }
        }
    }

    nearestExcluding(x: number, y: number, range: number, ex: number[]): Enemy {
        let best: Enemy = null, bd = range * range;
        for (const e of this.enemies) {
            if (!e.alive || ex.indexOf(e.id) >= 0) continue;
            const d = dist2(x, y, e.x, e.y);
            if (d < bd) { bd = d; best = e; }
        }
        return best;
    }

    // ================================================================ pickups
    spawnPickup(kind: 'mat' | 'fruit' | 'crate', x: number, y: number, tier = 1) {
        const p = new Pickup();
        p.kind = kind; p.x = x; p.y = y; p.tier = tier;
        const a = rand(0, TAU), s = rand(60, 220);
        p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
        p.spr = this.pools.pickup.get(kind === 'crate' ? (tier >= 2 ? 'crate_l' : 'crate') : kind);
        if (kind === 'mat') p.spr.node.angle = rand(-30, 30);
        p.spr.node.setPosition(x, y);
        this.pickups.push(p);
    }

    updatePickups(dt: number) {
        const run = this.run;
        const range = 95 * (1 + run.stats.pickup / 100);
        const r2 = range * range;
        const auto = !!run.special.autoCollect;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.t += dt;
            const dx = this.px - p.x, dy = this.py - p.y;
            const d2 = dx * dx + dy * dy;
            if (!p.magnet && p.t > 0.25 && !this.dead) {
                if (d2 < r2 || (auto && p.kind === 'mat') || p.kind === 'crate' && d2 < 60 * 60) p.magnet = true;
                if (p.kind === 'fruit' && d2 > 70 * 70) p.magnet = false;
            }
            if (p.magnet) {
                const d = Math.sqrt(d2) || 1;
                const sp = 500 + p.t * 300;
                p.vx = lerp(p.vx, dx / d * sp, Math.min(1, dt * 10));
                p.vy = lerp(p.vy, dy / d * sp, Math.min(1, dt * 10));
                if (d < 22) {
                    this.collect(p);
                    this.pools.pickup.put(p.spr);
                    this.pickups.splice(i, 1);
                    continue;
                }
            } else {
                p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt);
            }
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.x = clamp(p.x, -HALF_W + 15, HALF_W - 15); p.y = clamp(p.y, -HALF_H + 15, HALF_H - 15);
            const bob = p.kind !== 'mat' ? Math.sin(this.time * 4 + i) * 3 : 0;
            p.spr.node.setPosition(p.x, p.y + bob);
        }
    }

    collect(p: Pickup) {
        const run = this.run;
        if (p.kind === 'mat') {
            let v = 1;
            if (run.bag > 0) { run.bag--; v++; }
            run.mats += v;
            run.matsCollected += v;
            const lv = run.addXp(v);
            if (run.special.healOnPickup && chance(run.special.healOnPickup / 100)) this.healPlayer(1);
            Sfx.pickup();
            if (this.particles.length < MAX_PARTICLES - 60) this.glow('glow', p.x, p.y + 6, 0, 0, 0.12, 0.5, 0.15, 220, [120, 255, 180]);
            if (lv > 0) {
                // level up mid-wave: golden shockwave around the player
                this.glow('shock', this.px, this.py + 12, 0, 0, 0.5, 0.2, 2.2, 255, [255, 220, 90]);
                this.glow('glow', this.px, this.py + 12, 0, 0, 0.4, 1.5, 3, 200, [255, 220, 120]);
                this.sparks(this.px, this.py + 12, 0, 1, Math.PI, 12, 380, [255, 225, 120]);
                Sfx.levelUp();
                this.host.onLevelUp();
            }
        } else if (p.kind === 'fruit') {
            this.healPlayer(3 + Math.round(run.stats.fruitHeal));
            this.glow('glow', this.px, this.py + 14, 0, 0, 0.3, 1, 2.2, 200, [120, 255, 140]);
            for (let k = 0; k < 6; k++) {
                const a = rand(0, TAU);
                this.glow('dot', this.px + Math.cos(a) * 20, this.py + 10 + Math.sin(a) * 14, Math.cos(a) * 30, rand(60, 120), 0.5, 0.9, 0.2, 255, [140, 255, 150]);
            }
            Sfx.heal();
        } else {
            run.crates.push(p.tier);
            this.glow('shock', p.x, p.y + 8, 0, 0, 0.35, 0.2, 1.3, 255, p.tier >= 2 ? [200, 150, 255] : [255, 210, 120]);
            this.sparks(p.x, p.y + 8, 0, 1, Math.PI, 8, 300, [255, 225, 140]);
            Sfx.crate();
        }
    }

    // ================================================================ fx
    spawnFx(frame: string, x: number, y: number, vx: number, vy: number, life: number, s0: number, s1: number, a0: number, a1: number, col: number[], top = false): Particle {
        const pool = top ? this.pools.fxTop : this.pools.fx;
        return this.addParticle(pool, frame, x, y, vx, vy, life, s0, s1, a0, a1, col);
    }

    private addParticle(pool: SpritePool, frame: string, x: number, y: number, vx: number, vy: number, life: number, s0: number, s1: number, a0: number, a1: number, col: number[]): Particle {
        const p = new Particle();
        p.pool = pool;
        if (this.particles.length > MAX_PARTICLES) {
            const old = this.particles.shift();
            old.pool.put(old.spr);
        }
        p.spr = pool.get(frame);
        setTint(p.spr, col[0], col[1], col[2], a0);
        p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = life; p.s0 = s0; p.s1 = s1; p.a0 = a0; p.a1 = a1;
        if (frame === 'spark') { p.spr.node.angle = Math.atan2(vy, vx) * 180 / Math.PI; p.drag = 6; }
        p.spr.node.setPosition(x, y);
        p.spr.node.setScale(s0, s0, 1);
        this.particles.push(p);
        return p;
    }

    /** Additive-blend particle (glows, flashes, streaks). Alpha fades to 0. */
    glow(frame: string, x: number, y: number, vx: number, vy: number, life: number, s0: number, s1: number, a0: number, col: number[], angle = 0): Particle {
        const p = this.addParticle(this.pools.glow, frame, x, y, vx, vy, life, s0, s1, a0, 0, col);
        if (angle) p.spr.node.angle = angle;
        return p;
    }

    /** Spray of streak sparks in direction (ux,uy) with half-angle `cone` (PI = all around). */
    sparks(x: number, y: number, ux: number, uy: number, cone: number, n: number, speed: number, col: number[]) {
        const base = Math.atan2(uy, ux);
        for (let i = 0; i < n; i++) {
            const a = base + rand(-cone, cone), s = rand(speed * 0.4, speed);
            const p = this.addParticle(this.pools.glow, 'spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.14, 0.26), rand(0.7, 1.2), 0.2, 255, 0, col);
            p.drag = 7;
        }
    }

    /** Chunks that fly up, fall, bounce and leave a small splat where they land. */
    gibs(x: number, y: number, col: number[], n: number, size = 1) {
        for (let i = 0; i < n; i++) {
            if (this.particles.length > MAX_PARTICLES - 30) break;
            const a = rand(0, TAU), s = rand(70, 260) * Math.sqrt(size);
            const useGib = i % 2 === 0;
            const sc = (useGib ? rand(0.7, 1.2) : rand(0.6, 1.1)) * size;
            const p = this.spawnFx(useGib ? 'gib' : 'dot', x, y + 8, Math.cos(a) * s, Math.sin(a) * s * 0.7, rand(0.6, 0.9), sc, sc * 0.8, 255, 255, col);
            p.z = rand(8, 20); p.vz = rand(160, 360); p.grav = 1100; p.drag = 1.5;
            p.vr = useGib ? rand(-720, 720) : 0;
            p.landCol = col;
        }
    }

    /** Death splat: flash silhouette, ring, gibs, sparks and a ground stain. */
    deathFx(e: Enemy, withDecal: boolean) {
        const col = this.enemyColor(e.def);
        const light = [Math.min(255, col[0] + 90), Math.min(255, col[1] + 90), Math.min(255, col[2] + 90)];
        const k = Math.max(0.8, e.r / 22);
        // white silhouette that swells and fades
        const pop = this.spawnFx(e.def.sprite + '_w', e.x, e.y + e.r * 0.3, 0, 0, 0.12, e.scale, e.scale * 1.35, 230, 0, light);
        pop.sx = e.flip;
        this.glow('glow', e.x, e.y + 10, 0, 0, 0.16, 0.8 * k, 1.9 * k, 220, light);
        this.glow('shock', e.x, e.y + 10, 0, 0, 0.2, 0.12 * k, 0.6 * k, 220, light);
        this.gibs(e.x, e.y, col, e.def.elite ? 16 : 5 + Math.min(3, Math.floor(e.r / 14)), e.def.elite ? 1.5 : Math.min(1.3, k));
        this.spawnBurst(e.x, e.y, col, e.def.elite ? 24 : 6, e.def.elite ? 420 : 240);
        if (withDecal) this.spawnDecal(e.x, e.y, col, e.r / 22);
    }

    /** Layered explosion: flash, fireballs, shockwave, smoke, embers and scorch. */
    boomFx(x: number, y: number, rad: number, big: boolean, col: number[]) {
        const k = rad / 60;
        this.glow('glow', x, y + 10, 0, 0, 0.12, k * 1.4, k * 2.6, 255, [255, 250, 230]);
        this.glow('shock', x, y + 10, 0, 0, 0.28, k * 0.3, k * 1.05, 255, [255, 220, 150]);
        const nf = big ? 6 : 4;
        for (let i = 0; i < nf; i++) {
            const a = rand(0, TAU), d = rand(0, rad * 0.35);
            this.glow('b_fire', x + Math.cos(a) * d, y + 10 + Math.sin(a) * d, Math.cos(a) * 60, Math.sin(a) * 60 + 40, rand(0.25, 0.4), k * rand(0.9, 1.4), k * rand(1.8, 2.6), 255, [255, 255, 255]);
        }
        for (let i = 0; i < (big ? 6 : 3); i++) {
            const a = rand(0, TAU), d = rand(rad * 0.1, rad * 0.5);
            const p = this.spawnFx('smoke', x + Math.cos(a) * d, y + 10 + Math.sin(a) * d, Math.cos(a) * 50, Math.sin(a) * 30 + rand(40, 80), rand(0.6, 0.9), k * 0.8, k * 1.8, 150, 0, [90, 80, 85]);
            p.drag = 2;
        }
        this.sparks(x, y + 10, 0, 1, Math.PI, big ? 14 : 8, 300 + rad * 2.5, [255, 190, 90]);
        this.spawnBurst(x, y, col, big ? 10 : 5, 300);
        // scorch mark
        if (this.decals.length > 110) { const d = this.decals.shift(); d.pool.put(d.spr); }
        const sc = new Particle();
        sc.pool = this.pools.decal;
        sc.spr = this.pools.decal.get('splat');
        setTint(sc.spr, 25, 20, 28, 120);
        sc.spr.node.setPosition(x, y);
        sc.spr.node.angle = rand(0, 360);
        sc.spr.node.setScale(k * 1.3, k * 1.0, 1);
        sc.life = 0; sc.max = 10; sc.a0 = 120;
        this.decals.push(sc);
    }

    spawnBurst(x: number, y: number, col: number[], n: number, speed: number) {
        for (let i = 0; i < n; i++) {
            const a = rand(0, TAU), s = rand(speed * 0.3, speed);
            const p = this.spawnFx('dot', x, y + 10, Math.cos(a) * s, Math.sin(a) * s, rand(0.25, 0.5), rand(0.6, 1.3), 0.1, 255, 255, col);
            p.drag = 5;
        }
    }

    puff(x: number, y: number, def: EnemyDef, r: number) {
        this.spawnFx('puff', x, y + 10, 0, 20, 0.4, r / 25, r / 14, 220, 0, [235, 230, 240]);
    }

    /** Small droplet stain where a gib lands. */
    spawnDrop(x: number, y: number, col: number[], scale: number) {
        if (this.decals.length > 85) return;
        const p = new Particle();
        p.pool = this.pools.decal;
        p.spr = this.pools.decal.get('splat');
        setTint(p.spr, Math.round(col[0] * 0.55), Math.round(col[1] * 0.45), Math.round(col[2] * 0.5), 200);
        p.spr.node.setPosition(x, y);
        p.spr.node.angle = rand(0, 360);
        const s = Math.max(0.12, scale) * rand(0.8, 1.2);
        p.spr.node.setScale(s, s * 0.75, 1);
        p.life = 0; p.max = 9; p.a0 = 200;
        this.decals.push(p);
    }

    spawnDecal(x: number, y: number, col: number[], scale: number) {
        if (this.decals.length > 110) { const d = this.decals.shift(); d.pool.put(d.spr); }
        const p = new Particle();
        p.pool = this.pools.decal;
        p.spr = this.pools.decal.get('splat');
        const c = [Math.round(col[0] * 0.55), Math.round(col[1] * 0.45), Math.round(col[2] * 0.5)];
        setTint(p.spr, c[0], c[1], c[2], 200);
        p.spr.node.setPosition(x + rand(-4, 4), y + rand(-4, 4));
        p.spr.node.angle = rand(0, 360);
        const s = scale * rand(0.8, 1.2);
        p.spr.node.setScale(s, s * 0.75, 1);
        p.life = 0; p.max = 14; p.a0 = 200;
        this.decals.push(p);
    }

    updateParticles(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            const t = p.life / p.max;
            if (t >= 1) { p.pool.put(p.spr); this.particles.splice(i, 1); continue; }
            if (p.drag) { const k = Math.pow(1 / (1 + p.drag), dt * 4); p.vx *= k; p.vy *= k; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.grav) {
                p.vz -= p.grav * dt;
                p.z += p.vz * dt;
                if (p.z <= 0) {
                    p.z = 0;
                    if (p.bounces < 1 && p.vz < -120) {
                        p.bounces++; p.vz = -p.vz * 0.35; p.vx *= 0.5; p.vy *= 0.5; p.vr *= 0.5;
                        if (p.landCol) this.spawnDrop(p.x, p.y, p.landCol, 0.22 * p.s0);
                    } else { p.vz = 0; p.vx *= 0.8; p.vy *= 0.8; p.vr = 0; }
                }
            }
            if (p.vr) p.spr.node.angle += p.vr * dt;
            // ease: fast start, slow finish (muzzle flashes, rings)
            const te = p.ease ? 1 - (1 - t) * (1 - t) : t;
            const s = lerp(p.s0, p.s1, te);
            p.spr.node.setPosition(p.x, p.y + p.z);
            p.spr.node.setScale(s * p.sx, s * p.sy, 1);
            setAlpha(p.spr, p.grav ? (t > 0.75 ? p.a0 * (1 - (t - 0.75) / 0.25) : p.a0) : lerp(p.a0, p.a1, t));
        }
        for (let i = this.decals.length - 1; i >= 0; i--) {
            const d = this.decals[i];
            d.life += dt;
            if (d.life > d.max - 2) setAlpha(d.spr, d.a0 * Math.max(0, (d.max - d.life) / 2));
            if (d.life >= d.max) { d.pool.put(d.spr); this.decals.splice(i, 1); }
        }
    }

    // ---------------------------------------------------------------- damage numbers (sprite digits)
    showNum(x: number, y: number, v: number, r: number, g: number, b: number, crit: boolean, plus: boolean) {
        if (!this.host.numbersEnabled()) return;
        let n: DmgNum = null;
        for (const o of this.nums) if (!o.active) { n = o; break; }
        if (!n) {
            if (this.nums.length < 70) {
                n = new DmgNum();
                n.node = mkNode('num', this.lNum);
                for (let i = 0; i < 6; i++) n.digits.push(mkSprite(n.node, 'd_0'));
                this.nums.push(n);
            } else {
                // recycle the oldest
                n = this.nums[0];
                for (const o of this.nums) if (o.t > n.t) n = o;
            }
        }
        const str = (plus ? '+' : '') + Math.round(v) + (crit ? '!' : '');
        n.active = true; n.node.active = true; n.t = 0; n.x = x + rand(-10, 10); n.y = y; n.big = crit;
        n.life = crit ? 0.9 : 0.65;
        const cw = 13;
        const total = str.length * cw;
        for (let i = 0; i < 6; i++) {
            const s = n.digits[i];
            if (i < str.length) {
                const ch = str[i];
                const name = ch === '!' ? 'd_ex' : ch === '+' ? 'd_plus' : 'd_' + ch;
                s.node.active = true;
                s.spriteFrame = Atlas.get(name);
                s.node.setPosition(-total / 2 + cw / 2 + i * cw, 0);
                setTint(s, r, g, b, 255);
            } else s.node.active = false;
        }
        n.node.setPosition(n.x, n.y);
    }

    updateNums(dt: number) {
        for (const n of this.nums) {
            if (!n.active) continue;
            n.t += dt;
            const t = n.t / n.life;
            if (t >= 1) { n.active = false; n.node.active = false; continue; }
            const peak = n.big ? 1.7 : 1.3;
            const pop = t < 0.12 ? 0.5 + t / 0.12 * (peak - 0.5) : peak - Math.min(1, (t - 0.12) / 0.2) * (peak - 1);
            const s = pop * (n.big ? 1.3 : 0.92);
            n.node.setScale(s, s, 1);
            n.node.setPosition(n.x, n.y + t * 40);
            if (t > 0.6) {
                const a = 255 * (1 - (t - 0.6) / 0.4);
                for (const d of n.digits) if (d.node.active) setAlpha(d, a);
            }
        }
    }

    // ================================================================ camera
    addShake(v: number) { if (this.host.shakeEnabled()) this.shake = Math.min(16, this.shake + v); }

    updateCamera(dt: number) {
        const vs = this.host.viewSize();
        const z = this.zoom;
        const k = Math.min(1, dt * 6);
        this.camX = lerp(this.camX, this.px, k);
        this.camY = lerp(this.camY, this.py, k);
        const limX = HALF_W + BORDER * 0.6 - vs.w / 2 / z, limY = HALF_H + BORDER * 0.6 - vs.h / 2 / z;
        const cx = limX > 0 ? clamp(this.camX, -limX, limX) : 0;
        const cy = limY > 0 ? clamp(this.camY, -limY, limY) : 0;
        if (this.shake > 0) {
            this.shake = Math.max(0, this.shake - dt * 40);
            this.shakeX = rand(-1, 1) * this.shake; this.shakeY = rand(-1, 1) * this.shake;
        } else { this.shakeX = 0; this.shakeY = 0; }
        const kd = Math.pow(0.0001, dt);
        this.kickX *= kd; this.kickY *= kd;
        this.root.setScale(z, z, 1);
        this.root.setPosition(-cx * z + this.shakeX + this.kickX, -cy * z + this.shakeY + this.kickY);
    }
    zoom = 1;

    worldToScreen(x: number, y: number) {
        const p = this.root.position;
        return { x: x + p.x, y: y + p.y };
    }
}
