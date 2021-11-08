#!/usr/bin/env bash

PROJECT_NAME="spb-ai-champ"
SOLUTION_CODE_ENTRYPOINT="src/my-strategy.ts"
function compile() (
    set -e
    npm run build
    (cd build && zip -r - .) > $PROJECT_NAME.zip
)
COMPILED_FILE_PATH="$SOLUTION_CODE_PATH/$PROJECT_NAME.zip"
function run() (
    set -e
    unzip $MOUNT_POINT -d /tmp/project >/dev/null
    cd /tmp/project
    node main.js $WORLD_NAME $PORT $SECRET_TOKEN
)

. codegame.sh