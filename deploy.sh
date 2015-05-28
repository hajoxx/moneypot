#!/bin/sh
set -o verbose
rm -rf node_modules
npm install
./build.sh
git add build --force
git add config/buildConfig.js --force
git commit -a -m "Compiled Version"
git merge origin/prod -s recursive -X ours -m "Merge master into compiled"
git push origin HEAD:prod --force
git reset --hard origin/master