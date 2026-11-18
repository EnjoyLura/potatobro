"""Publish build/web-mobile to the gh-pages branch of this repo's origin (GitHub Pages).

The branch holds a single commit with the current build (force-pushed each time), so old builds and
their audio files do not pile up in the repository history. Run build.bat first.

Run:  python tools/deploy_pages.py
Site: https://<owner>.github.io/<repo>/  (Settings > Pages: "Deploy from a branch", gh-pages, / (root))
"""
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, 'build', 'web-mobile')


def git(*args, cwd):
    subprocess.run(['git', *args], cwd=cwd, check=True)


def main():
    if not os.path.isfile(os.path.join(WEB, 'index.html')):
        print('deploy: build/web-mobile is missing, run build.bat first')
        return 1
    with open(os.path.join(WEB, 'index.html'), encoding='utf-8') as f:
        if '__CR_DPR_CAP' not in f.read():
            print('deploy: build has no DPR script (post-build step missing), run build.bat again')
            return 1
    origin = subprocess.run(['git', 'remote', 'get-url', 'origin'], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    head = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip() or 'unknown'
    tmp = tempfile.mkdtemp(prefix='core-rush-pages-')
    try:
        site = os.path.join(tmp, 'site')
        shutil.copytree(WEB, site)
        open(os.path.join(site, '.nojekyll'), 'w').close()
        git('init', '-q', '-b', 'gh-pages', cwd=site)
        git('add', '-A', cwd=site)
        git('commit', '-q', '-m', 'Deploy CORE RUSH web build (source ' + head + ')', cwd=site)
        git('push', '--force', origin, 'gh-pages:gh-pages', cwd=site)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('deploy: pushed build to gh-pages of', origin)
    return 0


if __name__ == '__main__':
    sys.exit(main())
