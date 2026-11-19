"""Post-build fixes for build/web-mobile (run by build.bat after every successful Cocos build).

1. Sharp rendering on phones:
   a. Cocos 3.8 clamps devicePixelRatio to min(dpr, 2) in its web screen adapter, so on 3x phones the
      canvas is drawn at 2/3 resolution and stretched. The clamp is patched to read
      window.__CR_DPR_CAP() from the page template (build-templates/web-mobile/index.ejs):
      real dpr up to 4, ?dpr=N in the URL overrides it.
   b. Label text is rasterized at fontSize x view scale only; node scale is ignored, so text under
      our scaled UI root (1.3x on phones) was stretched. The assemblers now also multiply by
      window.__CR_LABEL_SCALE(label) (UI scale / node world scale, from the template).
   c. The engine's 100px cap on the rendered font size is raised to 320 (big titles).
2. No engine splash: settings.json splashScreen.totalTime = 0 (no Cocos logo, no minimum delay);
   the page's own "加载中" text shows while loading instead.
3. Cache-busting: the entry import gets ?v=<time> so GitHub Pages visitors get the new build.

Same approach as the S4Game (KingdomWatch) release scripts.
"""
import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, 'build', 'web-mobile')
CAP = '(window.__CR_DPR_CAP?window.__CR_DPR_CAP():2)'


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(s)


LABEL = '(window.__CR_LABEL_SCALE?window.__CR_LABEL_SCALE(%s):1)'
MAX_FONT = 320


def patch_dpr(s):
    if '__CR_DPR_CAP' in s:
        return s, True
    # minified getter: Math.min(null!==(t=window.devicePixelRatio)&&void 0!==t?t:1,2)
    s2, n = re.subn(r'(devicePixelRatio\)&&void 0!==(\w+)\?\2:1),2\)', lambda m: m.group(1) + ',' + CAP + ')', s, count=1)
    if n == 0:
        # non-minified / babel form: ..._window$devicePixelRa : 1, 2);
        s2, n = re.subn(r'(devicePixelRatio[^;]{0,160}?:\s*1),\s*2\)', lambda m: m.group(1) + ', ' + CAP + ')', s, count=1)
    return s2, n > 0


def patch_label_scale(s):
    if '__CR_LABEL_SCALE' in s:
        return s, True
    # ttf + bmfont assemblers: style.fontScale = view.getScaleX()  (minified: r=t.textStyle,...;r.fontScale=SB.getScaleX())
    s2, n = re.subn(r'(\w+)=(\w+)\.textStyle,([^{}]{0,200}?)\1\.fontScale=(\w+)\.getScaleX\(\)',
                    lambda m: '%s=%s.textStyle,%s%s.fontScale=%s.getScaleX()*%s' % (m.group(1), m.group(2), m.group(3), m.group(1), m.group(4), LABEL % m.group(2)), s)
    if n == 0:
        s2, n = re.subn(r'(style\.fontScale\s*=\s*\w+\.getScaleX\(\))', lambda m: m.group(1) + '*' + LABEL % 'comp', s)
    return s2, n > 0


def patch_max_font(s):
    # TextProcessing caps the rendered font size at 100px (big titles drew at 100 and were stretched)
    s2, n = re.subn(r'(_maxFontSize\s*=\s*)100\b', lambda m: m.group(1) + str(MAX_FONT), s)
    return s2, n > 0 or ('_maxFontSize=%d' % MAX_FONT) in s


def patch_engine():
    d = os.path.join(WEB, 'cocos-js')
    files = [os.path.join(d, f) for f in os.listdir(d) if f.endswith('.js')]
    found = {'dpr clamp': False, 'label scale': False, 'label max font size': False}
    for p in files:
        s = orig = read(p)
        for name, fn in (('dpr clamp', patch_dpr), ('label scale', patch_label_scale), ('label max font size', patch_max_font)):
            s, ok = fn(s)
            found[name] = found[name] or ok
        if s != orig:
            write(p, s)
            print('postbuild: engine patched in', os.path.relpath(p, ROOT))
    ok = True
    for name, hit in found.items():
        if not hit:
            print('postbuild: FATAL engine pattern not found:', name)
            ok = False
    if ok:
        print('postbuild: engine patches present: ' + ', '.join(found))
    return ok


def patch_settings():
    d = os.path.join(WEB, 'src')
    names = [f for f in os.listdir(d) if re.match(r'settings(\.\w+)?\.json$', f)]
    if not names:
        print('postbuild: FATAL settings.json not found')
        return False
    for name in names:
        p = os.path.join(d, name)
        s = json.loads(read(p))
        s['splashScreen'] = {'totalTime': 0}
        write(p, json.dumps(s, separators=(',', ':')))
        print('postbuild: engine splash disabled in', name)
    return True


def patch_index():
    p = os.path.join(WEB, 'index.html')
    s = read(p)
    if '__CR_DPR_CAP' not in s:
        print('postbuild: FATAL index.html has no __CR_DPR_CAP script (template build-templates/web-mobile/index.ejs missing?)')
        return False
    ver = str(int(time.time()))
    s2, n = re.subn(r"System\.import\('\./(index(?:\.[\w-]+)?\.js)(\?v=\d+)?'\)", lambda m: "System.import('./%s?v=%s')" % (m.group(1), ver), s)
    if n:
        write(p, s2)
        print('postbuild: entry cache-bust v=' + ver)
    return True


def main():
    if not os.path.isdir(WEB):
        print('postbuild: no build at', WEB)
        return 1
    ok = patch_engine() & patch_settings() & patch_index()
    # GitHub Pages: serve files as-is (no Jekyll processing)
    write(os.path.join(WEB, '.nojekyll'), '')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
