"""Zip build/web-mobile for H5 upload (e.g. TapTap): one top-level folder core-rush/ holding index.html
and the rest; dot files (.nojekyll, .runtime-bridge) are left out. Run build.bat first.

Run:  python tools/pack_h5.py   ->  release/core-rush-h5.zip
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, 'build', 'web-mobile')
OUT = os.path.join(ROOT, 'release', 'core-rush-h5.zip')
TOP = 'core-rush'


def main():
    if not os.path.isfile(os.path.join(WEB, 'index.html')):
        print('pack: build/web-mobile is missing, run build.bat first')
        return 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    n = 0
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for r, dirs, files in os.walk(WEB):
            dirs[:] = sorted(d for d in dirs if not d.startswith('.'))
            for f in sorted(files):
                if f.startswith('.'):
                    continue
                p = os.path.join(r, f)
                z.write(p, TOP + '/' + os.path.relpath(p, WEB).replace(os.sep, '/'))
                n += 1
    print('pack: %d files -> %s (%.1f MB)' % (n, OUT, os.path.getsize(OUT) / 1e6))
    return 0


if __name__ == '__main__':
    sys.exit(main())
