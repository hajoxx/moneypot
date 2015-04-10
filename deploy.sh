#!/bin/sh
set -o verbose
rm -rf node_modules
npm install
./build.sh
git add build --force
git commit -a -m "Compiled Version"
git merge origin/compiled -s recursive -X ours -m "Merge master into compiled"
git push origin HEAD:compiled
git reset --hard origin/master