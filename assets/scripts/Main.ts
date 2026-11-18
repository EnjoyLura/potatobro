// Entry component (attached to the Canvas in main.scene). Owns the World, the UI and the game state machine.
import { _decorator, Component, view, ResolutionPolicy, input, Input, EventKeyboard, KeyCode, game, Game } from 'cc';
import { Atlas } from './core/Atlas';
import { registerArt } from './core/Art';
import { Sfx } from './core/Sfx';
import { Save } from './core/Save';
import { World, WorldHost } from './game/World';
import { Run } from './game/Run';
import { UI, UIHost } from './ui/UI';
import { COL } from './ui/UIKit';
import { CharDef } from './data/Characters';
import { MAX_WAVE } from './data/Enemies';

const { ccclass } = _decorator;

type State = 'menu' | 'play' | 'pause' | 'waveEnd' | 'levelup' | 'shop' | 'over';

@ccclass('Main')
export class Main extends Component implements WorldHost, UIHost {
    world: World;
    ui: UI;
    runObj: Run = null;
    state: State = 'menu';
    keys: { [k: number]: boolean } = {};
    joyX = 0; joyY = 0;
    recorded = false;

    onLoad() {
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT);
        Save.load();
        Sfx.setSfx(Save.data.sfx);
        Sfx.setMusic(Save.data.music);
        registerArt();
        Atlas.build();
        this.world = new World(this.node, this);
        this.ui = new UI(this.node, this);
        this.world.root.active = true;
        this.world.playerSpr.node.active = false;
        this.world.zoom = this.ui.scale > 1.2 ? 1.15 : this.ui.scale > 1 ? 1.07 : 1;

        input.on(Input.EventType.KEY_DOWN, this.onKey, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        view.on('canvas-resize', this.onResize, this);
        game.on(Game.EVENT_HIDE, () => { if (this.state === 'play') this.pause(); });
        Sfx.startMusic();
        this.ui.showMenu();
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKey, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onResize() {
        this.ui.updateSize();
        this.world.zoom = this.ui.scale > 1.2 ? 1.15 : this.ui.scale > 1 ? 1.07 : 1;
        // rebuild the current screen so it fits the new aspect ratio
        switch (this.state) {
            case 'menu': this.ui.showMenu(); break;
            case 'play': this.ui.buildHud(); break;
            case 'pause': this.ui.buildHud(); this.ui.showPause(); break;
            case 'shop': this.ui.showShop(); break;
        }
    }

    onKey(e: EventKeyboard) {
        this.keys[e.keyCode] = true;
        Sfx.unlock();
        if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.KEY_P) {
            if (this.state === 'play') this.pause();
            else if (this.state === 'pause') { this.ui.clearScreen(); this.resume(); }
        }
    }
    onKeyUp(e: EventKeyboard) { this.keys[e.keyCode] = false; }

    update(dt: number) {
        dt = Math.min(dt, 1 / 30);
        if (this.state === 'play' || this.state === 'waveEnd' || this.state === 'over') {
            if (this.state === 'play') {
                const k = this.keys;
                let kx = 0, ky = 0;
                if (k[KeyCode.KEY_A] || k[KeyCode.ARROW_LEFT]) kx -= 1;
                if (k[KeyCode.KEY_D] || k[KeyCode.ARROW_RIGHT]) kx += 1;
                if (k[KeyCode.KEY_W] || k[KeyCode.ARROW_UP]) ky += 1;
                if (k[KeyCode.KEY_S] || k[KeyCode.ARROW_DOWN]) ky -= 1;
                if (kx || ky) { const l = Math.hypot(kx, ky); this.world.moveX = kx / l; this.world.moveY = ky / l; }
                else { this.world.moveX = this.joyX; this.world.moveY = this.joyY; }
            } else { this.world.moveX = 0; this.world.moveY = 0; }
            this.world.update(dt);
            this.ui.updateHud();
        }
    }

    // ================================================================ WorldHost
    shakeEnabled() { return Save.data.shake; }
    viewSize() { const v = view.getVisibleSize(); return { w: v.width, h: v.height }; }
    onElite(text: string) { this.ui.toast(text, '#ff5c5c', 60, 44); }

    waveBanner() {
        const r = this.runObj;
        this.ui.toast(r.wave >= MAX_WAVE && !r.endless ? '最终波！' : `第 ${r.wave} 波`, '#ffffff', 100, 48);
    }

    onWaveEnd() {
        this.state = 'waveEnd';
        this.ui.resetJoystick();
        const run = this.runObj;
        const econ = run.endWave();
        this.ui.toast('波次完成！', COL.gold, 140, 46);
        if (econ.harvest > 0) this.scheduleOnce(() => this.ui.toast(`收获 +${econ.harvest}`, COL.mat, 80, 30), 0.3);
        if (econ.interest > 0) this.scheduleOnce(() => this.ui.toast(`利息 +${econ.interest}`, COL.mat, 40, 28), 0.6);
        this.scheduleOnce(() => this.postWave(), 1.5);
    }

    postWave() {
        const run = this.runObj;
        if (!run.endless && run.wave >= MAX_WAVE) {
            run.won = true;
            this.record(true);
            this.state = 'over';
            Sfx.victory();
            this.ui.showResult(true);
            return;
        }
        this.processQueue();
    }

    processQueue() {
        const run = this.runObj;
        this.ui.hideHud();
        if (run.levelsPending > 0) {
            this.state = 'levelup';
            Sfx.levelUp();
            this.ui.showLevelUp(() => this.processQueue());
            return;
        }
        if (run.crates.length) {
            this.state = 'levelup';
            const t = run.crates.shift();
            this.ui.showCrate(t, () => this.processQueue());
            return;
        }
        this.state = 'shop';
        run.startShop();
        this.ui.showShop();
    }

    onPlayerDead() {
        this.state = 'over';
        for (const e of this.world.enemies) this.world.puff(e.x, e.y, e.def, e.r);
        this.world.clearAll(false);
        this.record(false);
        this.ui.showResult(false);
    }

    record(win: boolean) {
        if (this.recorded) return;
        this.recorded = true;
        const run = this.runObj;
        const d = Save.data;
        d.runs++;
        d.kills += run.kills;
        d.bestWave = Math.max(d.bestWave, run.wave);
        if (win) d.wins[run.char.id] = Math.max(Save.winLevel(run.char.id), run.danger);
        Save.save();
    }

    // ================================================================ UIHost
    run() { return this.runObj; }

    startRun(c: CharDef, weaponId: string, danger: number) {
        Sfx.unlock();
        this.runObj = new Run(c, weaponId, danger);
        this.recorded = false;
        this.world.playerSpr.node.active = true;
        this.world.beginRun(this.runObj);
        this.ui.clearScreen();
        this.ui.buildHud();
        this.world.startWave();
        this.state = 'play';
        this.waveBanner();
    }

    nextWave() {
        this.runObj.wave++;
        this.ui.clearScreen();
        this.ui.buildHud();
        this.world.startWave();
        this.state = 'play';
        this.waveBanner();
    }

    continueEndless() {
        this.runObj.endless = true;
        this.processQueue();
    }

    pause() {
        if (this.state !== 'play') return;
        this.state = 'pause';
        this.ui.resetJoystick();
        this.ui.showPause();
    }

    resume() {
        if (this.state === 'pause') this.state = 'play';
    }

    quitToMenu() {
        if (this.runObj && !this.recorded && this.state !== 'menu') this.record(false);
        this.world.running = false;
        this.world.dead = false;
        this.world.clearAll(true);
        for (const w of this.world.weapons) w.spr.node.destroy();
        this.world.weapons.length = 0;
        this.world.playerSpr.node.active = false;
        this.world.camX = 0; this.world.camY = 0; this.world.px = 0; this.world.py = 0;
        this.world.updateCamera(1);
        this.state = 'menu';
        Sfx.intensity = 0;
        this.ui.showMenu();
    }

    restart() {
        const r = this.runObj;
        this.quitToMenu();
        this.ui.selChar = r.char;
        this.startRun(r.char, this.ui.selWeapon || r.char.weapons[0], r.danger);
    }

    bossInfo() {
        const b = this.world.boss;
        if (!b || !b.alive) return null;
        return { name: b.def.name, hp: b.hp, max: b.maxHp };
    }

    waveInfo() { return { time: this.world.waveTime, wave: this.runObj ? this.runObj.wave : 1 }; }

    setMove(x: number, y: number) { this.joyX = x; this.joyY = y; }
}
