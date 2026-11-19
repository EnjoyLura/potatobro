// Rewarded video ads (TapTap mini game / H5: tap.createRewardedVideoAd). Docs:
// https://developer.taptap.cn/minigameapidoc/dev/api/ad/tap.createRewardedVideoAd/
//
// Ad filing (广告备案) is still under review, so the buttons are placeholders for now: they show,
// and tapping one explains that ads are coming soon (no reward). To go live:
//   1. create rewarded video ad units in the TapTap developer console,
//   2. paste their ids into AD_UNITS below (one id can serve every slot),
//   3. set ENABLED = true.
import { Sfx } from './Sfx';

export type AdSlot = 'revive' | 'reroll' | 'crate' | 'startBonus';

/** Ad unit id per slot; fill in after the filing is approved. */
const AD_UNITS: { [k in AdSlot]: string } = {
    revive: '',
    reroll: '',
    crate: '',
    startBonus: '',
};

export const AD_TEXT: { [k in AdSlot]: string } = {
    revive: '看广告复活（恢复 50% 生命，每局两次）',
    reroll: '看广告免费刷新商店（每波一次）或升级选项（每级一次）',
    crate: '看广告再拿一件同品质物品（每波一次）',
    startBonus: '看广告开局获得额外晶体（每局一次）',
};

export interface AdResult { ok: boolean; msg: string }

declare const tap: any;

export class Ads {
    /** Real ads on/off (turn on once ad units exist). */
    static ENABLED = false;
    /** Show the reserved ad buttons while ads are not live yet. */
    static SHOW_PLACEHOLDERS = true;

    private static ads: { [unit: string]: any } = {};
    private static busy = false;

    private static live(slot: AdSlot): boolean {
        try { return this.ENABLED && !!AD_UNITS[slot] && typeof tap !== 'undefined' && !!tap.createRewardedVideoAd; } catch (e) { return false; }
    }
    /** Whether a slot's button should be drawn at all. */
    static visible(slot: AdSlot): boolean { return this.live(slot) || this.SHOW_PLACEHOLDERS; }

    /** Plays a rewarded video; ok = watched to the end (give the reward). */
    static show(slot: AdSlot): Promise<AdResult> {
        if (!this.live(slot)) return Promise.resolve({ ok: false, msg: '广告功能审核中，即将开放' });
        if (this.busy) return Promise.resolve({ ok: false, msg: '广告加载中…' });
        this.busy = true;
        const unit = AD_UNITS[slot];
        return new Promise<AdResult>((resolve) => {
            let ad: any;
            try { ad = this.ads[unit] || (this.ads[unit] = tap.createRewardedVideoAd({ adUnitId: unit })); }
            catch (e) { this.busy = false; resolve({ ok: false, msg: '广告暂时不可用' }); return; }
            let done = false;
            const finish = (r: AdResult) => {
                if (done) return; done = true; this.busy = false;
                try { ad.offClose(onClose); ad.offError(onError); } catch (e) { /* old base library */ }
                Sfx.resume();
                resolve(r);
            };
            const onClose = (res: any) => finish(res && res.isEnded === false ? { ok: false, msg: '需要看完广告才能获得奖励' } : { ok: true, msg: '' });
            const onError = (err: any) => finish({ ok: false, msg: err && err.errCode === 1004 ? '暂时没有合适的广告，请稍后再试' : '广告加载失败，请稍后再试' });
            ad.onClose(onClose);
            ad.onError(onError);
            Sfx.suspend();
            ad.show().catch(() => ad.load().then(() => ad.show())).catch(onError);
        });
    }
}
