FROM node:8.6.0

MAINTAINER Andrew Reddikh <andrew@reddikh.com>

ARG ENVIRONMENT

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/
ADD docker/index.js /usr/src/app
ADD docker/build.js /usr/src/app
RUN ENVIRONMENT=$ENVIRONMENT node ./build.js
RUN yarn install --production --no-progress
RUN rm ./build.js

ENTRYPOINT ["node", "index.js"]
