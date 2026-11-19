// TapTap cloud save (mini game / H5 inside the TapTap app). Docs:
// https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/cloud-save-tutorial/
//
// One archive named "core_rush_save" holds the progress part of the save as JSON. The file is written to
// the TapTap local file system first, then createArchive / updateArchive uploads it (at most once a
// minute, so uploads are queued). At startup the cloud copy is downloaded and compared with the local
// progress; if they differ (and this device has progress of its own) the player picks one.
import { Save, Progress } from './Save';

export type CloudStatus = 'unavailable' | 'checking' | 'empty' | 'synced' | 'conflict' | 'uploading' | 'error';

const ARCHIVE = 'core_rush_save';
const MIN_GAP = 61000; // ms between uploads (platform limit: 1 per minute)

declare const tap: any;

function call<T = any>(obj: any, fn: string, args: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
        try {
            obj[fn](Object.assign({}, args, {
                success: (res: T) => resolve(res),
                fail: (err: any) => reject(err || { errMsg: fn + ' failed' }),
            }));
        } catch (e) { reject(e); }
    });
}

export class CloudSave {
    static status: CloudStatus = 'unavailable';
    static cloud: Progress | null = null;     // last known cloud copy
    static error = '';
    /** UI hooks */
    static onChange: (() => void) | null = null;
    static onConflict: (() => void) | null = null;

    private static mgr: any = null;
    private static fs: any = null;
    private static uuid = '';
    private static lastUpload = 0;
    private static timer: any = null;
    private static chain: Promise<any> = Promise.resolve();

    static available(): boolean {
        try { return typeof tap !== 'undefined' && !!tap.getCloudSaveManager && !!tap.getFileSystemManager; } catch (e) { return false; }
    }

    private static set(st: CloudStatus, err = '') {
        this.status = st; this.error = err;
        if (this.onChange) this.onChange();
    }
    /** Runs platform calls one after another (concurrent calls are rejected with 400007). */
    private static queue<T>(fn: () => Promise<T>): Promise<T> {
        const p = this.chain.then(fn, fn);
        this.chain = p.catch(() => undefined);
        return p;
    }
    private static path() { return `${tap.env.USER_DATA_PATH}/${ARCHIVE}.json`; }

    /** Startup: find the archive, download it and compare with local progress. */
    static init() {
        if (!this.available()) { this.set('unavailable'); return; }
        try { this.mgr = tap.getCloudSaveManager(); this.fs = tap.getFileSystemManager(); } catch (e) { this.set('unavailable'); return; }
        this.set('checking');
        this.queue(() => this.check()).catch((e) => this.set('error', errText(e)));
    }

    private static async check() {
        const list = await call<{ saves: any[] }>(this.mgr, 'getArchiveList');
        const a = (list && list.saves || []).filter(x => x.name === ARCHIVE)[0];
        if (!a) {
            this.uuid = ''; this.cloud = null;
            if (Save.hasProgress()) { this.set('uploading'); await this.upload(); }
            else this.set('empty');
            return;
        }
        this.uuid = a.uuid;
        const res = await call<{ filePath: string }>(this.mgr, 'getArchiveData', { archiveUUID: a.uuid, archiveFileId: a.fileId, targetFilePath: `${tap.env.USER_DATA_PATH}/${ARCHIVE}_cloud.json` });
        const txt = await call<{ data: string }>(this.fs, 'readFile', { filePath: res.filePath, encoding: 'utf8' });
        this.cloud = JSON.parse(txt.data) as Progress;
        this.compare();
    }

    /** synced if equal; adopt the cloud copy silently if this device has no progress; otherwise ask. */
    private static compare() {
        if (!this.cloud) { this.set(Save.hasProgress() ? 'uploading' : 'empty'); return; }
        if (Save.progressKey(this.cloud) === Save.progressKey(Save.data)) { this.set('synced'); return; }
        if (!Save.hasProgress()) { Save.applyProgress(this.cloud); this.set('synced'); return; }
        this.set('conflict');
        if (this.onConflict) this.onConflict();
    }

    /** Called after every local save: uploads changed progress (rate limited). */
    static requestUpload() {
        if (!this.mgr || this.status === 'conflict' || this.status === 'checking' || this.status === 'unavailable') return;
        if (this.cloud && Save.progressKey(this.cloud) === Save.progressKey(Save.data)) return;
        if (!Save.hasProgress()) return;
        if (this.timer) return;
        const wait = Math.max(0, this.lastUpload + MIN_GAP - Date.now());
        this.set('uploading');
        this.timer = setTimeout(() => {
            this.timer = null;
            this.queue(() => this.upload()).catch(() => { /* status set inside */ });
        }, wait);
    }

    private static async upload() {
        const p = Save.progress();
        try {
            await call(this.fs, 'writeFile', { filePath: this.path(), data: JSON.stringify(p), encoding: 'utf8' });
            const meta = {
                name: ARCHIVE,
                summary: `最高波次${p.bestWave} 总局数${p.runs} 总击杀${p.kills}`,
                extra: String(p.savedAt),
                playtime: Math.round(p.playTime || 0),
            };
            this.lastUpload = Date.now();
            const res: any = this.uuid
                ? await call(this.mgr, 'updateArchive', { archiveUUID: this.uuid, archiveMetaData: meta, archiveFilePath: this.path() })
                : await call(this.mgr, 'createArchive', { archiveMetaData: meta, archiveFilePath: this.path() });
            if (res && res.uuid) this.uuid = res.uuid;
            this.cloud = p;
            this.set('synced');
            // progress changed again while uploading
            if (Save.progressKey(p) !== Save.progressKey(Save.data)) this.requestUpload();
        } catch (e: any) {
            if (e && (e.errno === 400001 || /400001/.test(String(e.errMsg)))) {
                // too soon: try again after the limit
                this.lastUpload = Date.now();
                this.set('uploading');
                this.requestUpload();
                return;
            }
            this.set('error', errText(e));
        }
    }

    /** Conflict resolution */
    static useCloud() {
        if (!this.cloud) return;
        Save.applyProgress(this.cloud);
        this.set('synced');
    }
    static useLocal() {
        this.set('uploading');
        this.queue(() => this.upload()).catch(() => { /* status set inside */ });
    }
    /** Retry after an error. */
    static retry() { if (this.mgr) { this.set('checking'); this.queue(() => this.check()).catch((e) => this.set('error', errText(e))); } else this.init(); }
}

function errText(e: any) {
    if (!e) return '未知错误';
    if (e.errno) return `错误 ${e.errno}`;
    return String(e.errMsg || e.message || e).slice(0, 60);
}
