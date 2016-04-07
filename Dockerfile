FROM node:4

MAINTAINER Andrew Reddikh <andrew@reddikh.com>

# Define working directory
WORKDIR /goose

ADD package.json /goose/package.json

# Install dependencies updates
RUN npm install

# Set env
ENV PATH=/usr/local/bin:/bin:/usr/bin:/goose/node_modules/phantomjs-prebuilt/bin

ADD . /goose
