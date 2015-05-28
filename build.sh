set -o verbose
rm -rf build/

#Old client
./node_modules/requirejs/bin/r.js -o client/build.js
./node_modules/requirejs/bin/r.js -o client/build-main.js

#New client
./node_modules/requirejs/bin/r.js -o client_new/build.js
./node_modules/requirejs/bin/r.js -o client_new/build-main.js

node build.js

# jenkins
# ./build.sh
# npm install
# git add node_modules --force
# git add build --force
# git commit -a -m "Compiled Version"
# git merge origin/prod -s recursive -X ours -m "Merge master into compiled"
# git push origin HEAD:prod
# git push git@heroku.com:devpot.git HEAD:master