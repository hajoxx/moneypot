set -o verbose
rm -rf build/
./node_modules/requirejs/bin/r.js -o client/build.js
./node_modules/requirejs/bin/r.js -o client/build-main.js 
node build.js

# jenkins
# ./build.sh
# npm install
# git add node_modules --force
# git add build --force
# git commit -a -m "Compiled Version"
# git merge origin/compiled -s recursive -X ours -m "Merge master into compiled"
# git push origin HEAD:compiled
# git push git@heroku.com:devpot.git HEAD:master