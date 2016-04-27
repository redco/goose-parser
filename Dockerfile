FROM node:4

MAINTAINER Andrew Reddikh <andrew@reddikh.com>

# Define working directory
WORKDIR /app

ADD package.json /app/package.json

# Install dependencies updates
RUN npm install

# Add the actual code of goose as a node module
ADD lib /app/node_modules/goose-parser/lib
ADD index.js /app/node_modules/goose-parser
ADD vendor /app/node_modules/goose-parser/vendor

# Set env
ENV PATH=/usr/local/bin:/bin:/usr/bin:/app/node_modules/phantomjs-prebuilt/bin

ADD docker/index.js /app
#ADD docker/index.js /usr/bin/parse

CMD ["node", "index.js"]
