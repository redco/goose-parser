#!/bin/sh

pipe=/tmp/goose-pipe
if [ ! -p ${pipe} ]; then
  mkfifo ${pipe}
fi

# goose-parser uses stdout to deliver parsing result in cli mode
# to do so, it forwards stdout -> /dev/null and pipe -> stdout
# all debug/logs information is provided to stderr
node index.js "$@" > /dev/null &
cat ${pipe}

