[![mr.Goose](https://i.imgur.com/e0CPF7C.png)](http://goose.show)

# goose-parser 

[![CircleCI (all branches)](https://img.shields.io/circleci/project/github/redco/goose-parser.svg)](https://circleci.com/gh/redco/goose-parser)
[![Codecov](https://img.shields.io/codecov/c/github/redco/goose-parser.svg)](https://codecov.io/gh/redco/goose-parser)
[![Latest Stable Version](https://img.shields.io/npm/v/goose-parser.svg?style=flat)](https://www.npmjs.com/package/goose-parser)
[![Total Downloads](https://img.shields.io/npm/dt/goose-parser.svg?style=flat)](https://www.npmjs.com/package/goose-parser)

This tool moves routine crawling process to the new level.
Now it's possible to parse a web page for a moment. 
All you need is to specify parsing rules based on css selectors. It's so simple as Goose can do it.
This library allows to parse such data types as Grid, Collections, and Simple objects.
Parser has support of pagination by extension [goose-paginator](https://github.com/redco/goose-paginator).
Also it offers you following features: *actions* to interact with the page and *transforms* to convert parsed data to friendly format.

## Goose Starter Kit
Now it's easy to start with Goose, just try to use [goose-starter-kit](https://github.com/redco/goose-starter-kit) for it.

## Key features
* Declarative approach for definition of parsing rules, actions and transformations.
* Multi environments to run parser on the browser, PhantomJS, Chrome, JsDOM and more.
* Clear code with the latest features of ES6.
* Clear and consistent API with promises all the way.
* Improved [Sizzle](https://sizzlejs.com) format of selectors.
* Ajax and multi-pages parsing modes.
* Docker Support.
* It's easy extendable.

## Installation

```bash
yarn add goose-parser goose-phantom-environment
```

## Usage

```JS
const Parser = require('goose-parser');
const PhantomEnvironment = require('goose-phantom-environment');

const env = new PhantomEnvironment({
  url: 'https://www.google.com/search?q=goose-parser',
});

const parser = new Parser({ environment: env });

(async function () {
  try {
    const results = await parser.parse({
      actions: [
        {
          type: 'wait',
          timeout: 10 * 1000,
          scope: '.srg>.g',
          parentScope: 'body'
        }
      ],
      rules: {
        scope: '.srg>.g',
        collection: [[
          {
            name: 'url',
            scope: 'h3.r>a',
            attr: 'href',
          },
          {
            name: 'text',
            scope: 'h3.r>a',
          }
        ]]
      }
    });
    console.log(results);
  } catch (e) {
    console.log('Error occured:');
    console.log(e.stack);
  }
})();
```

## Environment
This is a special atmosphere where Parser has to be executed. The main purpose of an environment is to provide a method for evaluating JS on the page.
Goose supports following environments:
* [PhantomJS](https://github.com/redco/goose-phantom-environment) (executes in NodeJS)
* [Chrome](https://github.com/redco/goose-chrome-environment) (executes in NodeJS)
* [JSDom](https://github.com/redco/goose-jsdom-environment) (executes in NodeJS)
* FireFox (coming soon)
* [Browser](https://github.com/redco/goose-phantom-environment) (executes in Browser)

## Docker usage

For now it's available to run goose-parser as a docker service.

**Params:**

* *url* - first param is an url to parser
* *Parsing rules* [optional] - Rules to parse. It's optional, if *--rules-file* specified.

**Options:**

* -e "DEBUG=*" - to enable debug mode and see all what happens inside the goose-parser. Reed more about debug [here](https://www.npmjs.com/package/debug).
* *--rules-file* - to specify rules file. Be aware that you need to mount a folder with rules as a volume to the docker container.

There are two options to run it:

### Process parsing from the user input

```bash
docker run -it --rm -e "DEBUG=*,-puppeteer:*" redcode/goose-parser:chrome-1.0.17-parser-0.5.2\
    https://www.google.com/search?q=goose-parser\
    '{
      "actions": [
        {
          "type": "wait",
          "scope": ".g"
        }
      ],
      "rules": {
        "scope": ".g",
        "collection": [
          [
            {
              "scope": ".r>a h3",
              "name": "name"
            },
            {
              "scope": ".r>a:eq(0)",
              "name": "link",
              "attr": "href"
            }
          ]
        ]
      }
    }'
```

### Process parsing from the mounted file with parsing rules

Create a file `rules/rules.json` which contains parser rules and run following command:

```bash
docker run -it --rm --volume="`pwd`/rules:/app/rules:ro" -e "DEBUG=*,-puppeteer:*" redcode/goose-parser:phantom-latest --rules-file="/app/rules/rules.json" 'https://www.google.com/search?q=goose-parser'
```

## Documentation
Based on the code you can find detailed documentation about [actions](https://github.com/redco/goose-parser/tree/master/lib/actions) and [transformations](https://github.com/redco/goose-parser/tree/master/lib/transforms)

API reference - coming soon
