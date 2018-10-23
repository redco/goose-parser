ARG ENVIRONMENT
ARG BASE="redcode/${ENVIRONMENT}"
ARG ENVIRONMENT_VERSION=latest

FROM ${BASE}:${ENVIRONMENT_VERSION}

MAINTAINER Andrew Reddikh <andrew@reddikh.com>

COPY docker/index.js /usr/src/app
COPY docker/build.js /usr/src/app
COPY docker/entrypoint.sh /usr/src/app
RUN node ./build.js && rm ./build.js
RUN yarn install --production --no-progress

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
