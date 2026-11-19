// State of a single run: character, stats, inventory, economy and shop.
import { Stats, emptyStats, addMods, StatKey } from '../data/Stats';
import { CharDef } from '../data/Characters';
import { WEAPONS, WEAPON_MAP, WeaponDef, WEAPON_CLASSES } from '../data/Weapons';
import { ITEMS, ITEM_MAP, ItemDef } from '../data/Items';
import { UPGRADES, UpgradeDef } from '../data/Upgrades';
import { DANGERS } from '../data/Enemies';
import { StageDef, STAGES } from '../data/Stages';
import { chance, pick, shuffle, weightedPick } from '../core/Util';

export interface OwnedWeapon { id: string; tier: number; uid: number }
export interface ShopSlot { kind: 'weapon' | 'item'; id: string; tier: number; price: number; sold?: boolean }
export interface UpgradeOption { up: UpgradeDef; tier: number; value: number }

let UID = 1;
export const MAX_WEAPONS = 6;
const WEAPON_TIER_PRICE = [1, 1.9, 3.6, 6.5];

export class Run {
    char: CharDef;
    stage: StageDef = STAGES[0];
    danger = 0;
    wave = 1;
    mats = 0;
    bag = 0;
    xp = 0;
    level = 0;
    levelsPending = 0;
    crates: number[] = [];             // crate rarity (1 normal, 2 elite)
    hp = 10;
    weapons: OwnedWeapon[] = [];
    items: { [id: string]: number } = {};
    itemOrder: string[] = [];
    bonus: Stats = emptyStats();       // from level-ups and per-wave growth
    stats: Stats = emptyStats();
    special: { [k: string]: number } = {};
    shop: ShopSlot[] = [];
    locked: boolean[] = [false, false, false, false];
    rerolls = 0;
    freeRerolls = 0;
    // run statistics
    kills = 0;
    damageDone = 0;
    matsCollected = 0;
    won = false;
    endless = false;       // past wave 20
    endlessMode = false;   // started from the stage screen's endless mode (no victory at wave 20)
    // rewarded ads used this run
    adRevived = false;
    adRerollWave = -1;
    adCrateWave = -1;

    constructor(char: CharDef, weaponId: string, danger: number, stage: StageDef = STAGES[0]) {
        this.char = char;
        this.danger = danger;
        this.stage = stage;
        this.mats = stage.startMats;
        this.weapons.push({ id: weaponId, tier: Math.max(1, WEAPON_MAP[weaponId].minTier || 1), uid: UID++ });
        if (char.startItems) for (const id of char.startItems) this.addItem(id);
        this.recompute();
        this.hp = this.maxHp;
    }

    get maxHp() { return Math.max(1, Math.round(this.stats.maxHp)); }
    get dangerDef() { return DANGERS[this.danger]; }

    recompute() {
        const s = emptyStats();
        s.maxHp = 10;
        addMods(s, this.char.mods);
        if (this.stage.playerMods) addMods(s, this.stage.playerMods);
        addMods(s, this.bonus);
        s.maxHp += this.level;
        for (const id in this.items) addMods(s, ITEM_MAP[id].mods, this.items[id]);
        // weapon class set bonuses
        const counts = this.classCounts();
        for (const cid in counts) {
            const n = counts[cid];
            if (n >= 2) addMods(s, WEAPON_CLASSES[cid].bonus[Math.min(n, 6) - 2]);
        }
        this.stats = s;
        const sp: { [k: string]: number } = {};
        if (this.char.special) for (const k in this.char.special) sp[k] = (sp[k] || 0) + this.char.special[k];
        for (const id in this.items) {
            const it = ITEM_MAP[id];
            if (it.special) for (const k in it.special) sp[k] = (sp[k] || 0) + it.special[k] * this.items[id];
        }
        this.special = sp;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
    }

    classCounts(): { [id: string]: number } {
        const out: { [id: string]: number } = {};
        const seen: { [k: string]: boolean } = {};
        for (const w of this.weapons) {
            // the same weapon type counts once per copy (like most games in the genre)
            const def = WEAPON_MAP[w.id];
            for (const c of def.classes) out[c] = (out[c] || 0) + 1;
            seen[w.id] = true;
        }
        return out;
    }

    // ---------------------------------------------------------------- xp / level
    xpNeeded(level = this.level) { return (level + 3) * (level + 3); }
    addXp(v: number): number {
        this.xp += v * (1 + this.stats.xpGain / 100);
        let gained = 0;
        while (this.xp >= this.xpNeeded()) {
            this.xp -= this.xpNeeded();
            this.level++;
            this.levelsPending++;
            gained++;
        }
        if (gained) {
            const before = this.maxHp;
            this.recompute();
            this.hp += this.maxHp - before;
        }
        return gained;
    }

    rollUpgrades(): UpgradeOption[] {
        const lvl = this.level;
        const pool = shuffle(UPGRADES.slice()).slice(0, 4);
        return pool.map(up => {
            const r = Math.random() * (1 + this.stats.luck / 200);
            let tier = 0;
            const t4 = lvl >= 10 ? 0.05 + (lvl - 10) * 0.012 : 0;
            const t3 = lvl >= 6 ? 0.12 + (lvl - 6) * 0.02 : 0;
            const t2 = lvl >= 2 ? 0.3 + lvl * 0.02 : 0.08;
            if (r > 1 - t4) tier = 3; else if (r > 1 - t4 - t3) tier = 2; else if (r > 1 - t4 - t3 - t2) tier = 1;
            if (lvl % 5 === 0 && lvl > 0 && tier < 2) tier = 2; // milestone levels give better choices
            return { up, tier, value: up.values[tier] };
        });
    }

    applyUpgrade(o: UpgradeOption) {
        const before = this.maxHp;
        (this.bonus as any)[o.up.stat] += o.value;
        this.recompute();
        if (this.maxHp > before) this.hp += this.maxHp - before;
    }

    // ---------------------------------------------------------------- items & weapons
    addItem(id: string) {
        const before = this.maxHp;
        this.items[id] = (this.items[id] || 0) + 1;
        if (this.itemOrder.indexOf(id) < 0) this.itemOrder.push(id);
        this.recompute();
        if (this.maxHp > before) this.hp += this.maxHp - before;
    }
    itemCount(id: string) { return this.items[id] || 0; }
    canTakeItem(it: ItemDef) { return !it.max || this.itemCount(it.id) < it.max; }

    canEquip(def: WeaponDef) {
        if (this.char.rangedOnly && def.melee) return false;
        if (this.char.meleeOnly && !def.melee) return false;
        return true;
    }
    /** Can this weapon be added (free slot or combinable)? */
    canAddWeapon(id: string, tier: number) {
        if (!this.canEquip(WEAPON_MAP[id])) return false;
        if (this.weapons.length < MAX_WEAPONS) return true;
        return tier < 4 && this.weapons.some(w => w.id === id && w.tier === tier);
    }
    addWeapon(id: string, tier: number): boolean {
        if (!this.canAddWeapon(id, tier)) return false;
        if (this.weapons.length >= MAX_WEAPONS) {
            const w = this.weapons.find(x => x.id === id && x.tier === tier);
            w.tier++;
        } else {
            this.weapons.push({ id, tier, uid: UID++ });
        }
        this.recompute();
        return true;
    }
    canCombine(idx: number) {
        const w = this.weapons[idx];
        if (!w || w.tier >= 4) return false;
        return this.weapons.some((x, i) => i !== idx && x.id === w.id && x.tier === w.tier);
    }
    combine(idx: number) {
        if (!this.canCombine(idx)) return;
        const w = this.weapons[idx];
        const other = this.weapons.findIndex((x, i) => i !== idx && x.id === w.id && x.tier === w.tier);
        w.tier++;
        this.weapons.splice(other, 1);
        this.recompute();
    }
    sellValue(w: OwnedWeapon) { return Math.max(1, Math.round(this.weaponPrice(w.id, w.tier) * 0.3)); }
    sell(idx: number) {
        const w = this.weapons[idx];
        if (!w || this.weapons.length <= 1) return 0;
        const v = this.sellValue(w);
        this.mats += v;
        this.weapons.splice(idx, 1);
        this.recompute();
        return v;
    }

    // ---------------------------------------------------------------- economy
    priceOf(base: number) {
        const w = this.wave;
        const p = (base + w) * (1 + w * 0.08) * (1 - Math.min(60, this.stats.shopDiscount) / 100);
        return Math.max(1, Math.round(p));
    }
    weaponPrice(id: string, tier: number) { return this.priceOf(WEAPON_MAP[id].price * WEAPON_TIER_PRICE[tier - 1]); }
    itemPrice(id: string) { return this.priceOf(ITEM_MAP[id].price); }
    rerollPrice() {
        if (this.freeRerolls > 0) return 0;
        const w = this.wave;
        let p = Math.max(1, Math.round(w * 0.75)) + this.rerolls * Math.max(1, Math.round(w * 0.5));
        if (this.special.cheapReroll) p = Math.ceil(p / 2);
        return p;
    }

    rollTier(bonus = 0): number {
        const w = this.wave, luck = 1 + this.stats.luck / 100;
        const t4 = w >= 8 ? Math.min(0.08, (w - 7) * 0.006) * luck : 0;
        const t3 = w >= 4 ? Math.min(0.25, (w - 3) * 0.02) * luck : 0;
        const t2 = w >= 2 ? Math.min(0.6, (w - 1) * 0.06) * luck : 0;
        const r = Math.random() - bonus;
        if (r < t4) return 4;
        if (r < t4 + t3) return 3;
        if (r < t4 + t3 + t2) return 2;
        return 1;
    }

    randomItem(tier: number): ItemDef {
        let list = ITEMS.filter(i => i.tier === tier && this.canTakeItem(i));
        if (!list.length) list = ITEMS.filter(i => this.canTakeItem(i));
        return pick(list);
    }

    genSlot(): ShopSlot {
        const allowed = WEAPONS.filter(w => this.canEquip(w));
        if (chance(0.35) && allowed.length) {
            // favour weapons the player already owns to make combining feasible
            const owned = this.weapons.map(w => w.id);
            const def = weightedPick(allowed, w => owned.indexOf(w.id) >= 0 ? 3 : 1);
            const tier = Math.max(def.minTier || 1, Math.min(4, this.rollTier()));
            return { kind: 'weapon', id: def.id, tier, price: this.weaponPrice(def.id, tier) };
        }
        const it = this.randomItem(this.rollTier());
        return { kind: 'item', id: it.id, tier: it.tier, price: this.itemPrice(it.id) };
    }

    rollShop(first = false) {
        for (let i = 0; i < 4; i++) {
            if (this.locked[i] && this.shop[i] && !this.shop[i].sold) {
                // re-price locked items for the new wave
                const s = this.shop[i];
                if (first) s.price = s.kind === 'weapon' ? this.weaponPrice(s.id, s.tier) : this.itemPrice(s.id);
                continue;
            }
            this.shop[i] = this.genSlot();
            this.locked[i] = false;
        }
    }

    startShop() {
        this.rerolls = 0;
        this.freeRerolls = this.special.freeReroll || 0;
        this.rollShop(true);
    }

    doReroll(): boolean {
        const p = this.rerollPrice();
        if (this.mats < p) return false;
        this.mats -= p;
        if (this.freeRerolls > 0) this.freeRerolls--; else this.rerolls++;
        this.rollShop();
        return true;
    }

    buy(i: number): boolean {
        const s = this.shop[i];
        if (!s || s.sold || this.mats < s.price) return false;
        if (s.kind === 'weapon') {
            if (!this.addWeapon(s.id, s.tier)) return false;
        } else {
            const it = ITEM_MAP[s.id];
            if (!this.canTakeItem(it)) return false;
            this.addItem(s.id);
        }
        this.mats -= s.price;
        s.sold = true;
        this.locked[i] = false;
        return true;
    }

    /** End-of-wave economy. Returns lines describing gains. */
    endWave(): { harvest: number; interest: number } {
        const harvest = Math.max(0, Math.round(this.stats.harvest));
        this.mats += harvest;
        this.addXp(harvest);
        let interest = 0;
        if (this.special.interest) {
            interest = Math.min(25 * Math.ceil(this.special.interest / 8), Math.floor(this.mats * this.special.interest / 100));
            this.mats += interest;
        }
        // growth
        const growth = this.char.harvestGrowth || 0.05;
        if (this.stats.harvest > 0) this.bonus.harvest += Math.max(1, Math.round(this.stats.harvest * growth));
        if (this.special.engPerWave) this.bonus.engineering += this.special.engPerWave;
        this.recompute();
        return { harvest, interest };
    }

    // ---------------------------------------------------------------- combat helpers
    stat(k: StatKey) { return this.stats[k]; }
}
