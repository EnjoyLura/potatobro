// Rewarded video ads through the TapTap host (tap.createRewardedVideoAd), wired the same way as
// S5Game's runtime bridge: a fresh ad object per request, load() then show(), reward only when
// onClose reports isEnded, then destroy(). One request at a time; a 120 s timeout frees a stuck one.
//
// H5 mini games have ads switched on for the game in the TapTap developer center (商店 → 小游戏广告),
// with no ad space id to fill in, so the ad is created without adUnitId. If the platform ever hands
// out an id, put it in AD_UNIT (or per slot in SLOT_UNITS) and it is passed along.
// Outside the TapTap host (plain browser, GitHub Pages) the buttons stay visible and tapping one
// says ads are not supported here.
import { Sfx } from './Sfx';

export type AdSlot = 'revive' | 'reroll' | 'crate' | 'startBonus';

/** Optional ad space id (not needed for H5 mini games). */
const AD_UNIT = '';
/** Optional per-slot ad space ids (empty = use AD_UNIT). */
const SLOT_UNITS: { [k in AdSlot]: string } = { revive: '', reroll: '', crate: '', startBonus: '' };

export const AD_TEXT: { [k in AdSlot]: string } = {
    revive: '看广告复活（恢复 50% 生命，每局两次）',
    reroll: '看广告免费刷新商店（每波一次）或升级选项（每级一次）',
    crate: '看广告再拿一件同品质物品（每波一次）',
    startBonus: '看广告开局获得额外晶体（每局一次）',
};

export interface AdResult { ok: boolean; msg: string }

const TIMEOUT_MS = 120000;
/** A failure this long after show() means the video was on screen (closed early). */
const SHOWN_AFTER_MS = 3000;

function host(): any {
    try { const t = (globalThis as any).tap; return t && typeof t.createRewardedVideoAd === 'function' ? t : null; } catch (e) { return null; }
}

function failText(err: any, shownAt: number): string {
    const code = Number(err && (err.errCode ?? err.errno ?? err.code));
    const msg = String((err && (err.errMsg || err.message || err.msg)) || err || '');
    const low = msg.toLowerCase();
    if (/close|cancel|skip|关闭/.test(low)) return '需要完整看完广告才能获得奖励';
    if (code === 1004) return '暂时没有合适的广告，请稍后再试';
    if (shownAt && Date.now() - shownAt >= SHOWN_AFTER_MS) return '广告没有完整播放，这次没有奖励';
    return '广告暂时无法播放，请稍后再试' + (isFinite(code) && code ? `（${code}）` : '');
}

export class Ads {
    /** Show the reserved ad buttons while ads are not live yet. */
    static SHOW_PLACEHOLDERS = true;

    private static busy = false;
    private static busySince = 0;

    private static unit(slot: AdSlot): string { return SLOT_UNITS[slot] || AD_UNIT; }
    private static live(slot: AdSlot): boolean { return !!host(); }
    /** Whether a slot's button should be drawn at all. */
    static visible(slot: AdSlot): boolean { return this.live(slot) || this.SHOW_PLACEHOLDERS; }

    /** Plays a rewarded video; ok = watched to the end (give the reward). */
    static show(slot: AdSlot): Promise<AdResult> {
        const tap = host();
        if (!tap) return Promise.resolve({ ok: false, msg: '当前环境不支持播放广告' });
        if (this.busy && Date.now() - this.busySince < TIMEOUT_MS) return Promise.resolve({ ok: false, msg: '广告加载中，请稍候' });
        this.busy = true; this.busySince = Date.now();
        console.log('[Ads] request', slot);
        return new Promise<AdResult>((resolve) => {
            let ad: any = null, done = false, shownAt = 0;
            const finish = (r: AdResult, why: string) => {
                if (done) return; done = true; this.busy = false;
                clearTimeout(timer);
                console.log('[Ads] result', slot, r.ok, why);
                try { if (ad) { if (ad.offClose) ad.offClose(onClose); if (ad.offError) ad.offError(onError); } } catch (e) { /* old base library */ }
                try { if (ad && ad.destroy) ad.destroy(); } catch (e) { /* already gone */ }
                Sfx.resume();
                resolve(r);
            };
            const onClose = (res: any) => {
                if (res && res.isEnded === false) finish({ ok: false, msg: '需要完整看完广告才能获得奖励' }, 'closed early');
                else finish({ ok: true, msg: '' }, 'ended');
            };
            const onError = (err: any) => finish({ ok: false, msg: failText(err, shownAt) }, JSON.stringify(err || null));
            const timer = setTimeout(() => finish({ ok: false, msg: '广告暂时无法播放，请稍后再试' }, 'timeout'), TIMEOUT_MS);
            try {
                const unit = this.unit(slot);
                ad = tap.createRewardedVideoAd(unit ? { adUnitId: unit } : {});
                ad.onClose(onClose);
                ad.onError(onError);
                Sfx.suspend();
                Promise.resolve(ad.load())
                    .then(() => { if (done) return; shownAt = Date.now(); return ad.show(); })
                    .catch(onError);
            } catch (e) { onError(e); }
        });
    }
}
