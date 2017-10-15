# goose-parser [![Latest Stable Version](https://img.shields.io/npm/v/goose-parser.svg?style=flat)](https://www.npmjs.com/package/goose-parser) [![Total Downloads](https://img.shields.io/npm/dt/goose-parser.svg?style=flat)](https://www.npmjs.com/package/goose-parser)

[![Build Status](https://img.shields.io/travis/redco/goose-parser/master.svg?style=flat)](https://travis-ci.org/redco/goose-parser)
[![Coverage Status](https://img.shields.io/coveralls/redco/goose-parser/master.svg?style=flat)](https://coveralls.io/github/redco/goose-parser)

This tool moves routine crawling process to the new level. 
Now it's possible to parse a web page for a few moments. 
All you need is to specify parsing rules based on css selectors. It's so simple as Goose can do it.
This library allows to parse such data types as grids, collections, and simple objects.
Parser supports pagination via infinite scroll and pages.
It offers next features: pre-parse [actions](#actions) and post-parse [transformations](#transformations).

## Key features
* Declarative approach for definition of parsing rules, actions and transformations.
* Multi environments to run parser on the browser and server sides.
* Clear and consistent API with promises all the way.
* Improved Sizzle format of selectors.
* Ajax and multi-pages parsing modes.
* Docker support
* Easy extendable.

## Table of contents:
* [Installation](#installation)
* [Documentation](#documentation)
    * [Environments](#environments)
        * [BrowserEnvironment](#browserenvironment)
    * [Parser](#parser)
        * [#parse method](#parse-method)
        * [#addAction Custom action](#addaction-custom-action)
        * [#addTransform Custom transformation](#addtransformation-custom-transformation)
        * [#addPagination Custom pagination](#addpagination-custom-pagination)
    * [Parse rules](#parse-rules)
        * [Simple rule](#simple-rule)
        * [Collection rule](#collection-rule)
        * [Grid rule](#grid-rule)
    * [Pagination](#pagination)
        * [Scroll pagination](#scroll-pagination)
        * [Page pagination](#page-pagination)
    * [Actions](#actions)
        * [Click](#click)
        * [Wait](#wait)
        * [Type](#type)
        * [Exist](#exist)
        * [ConditionalActions](#conditionalactions)
        * [Custom actions](#custom-actions)
    * [Transforms](#transforms)
        * [Date](#date)
        * [Replace](#replace)
        * [Custom transforms](#custom-transforms)
* [Tests](#tests)
    * [With BrowserEnvironment](#with-browserenvironment)
* [Debug](#debug)
* [Docker usage](#docker-usage)
* [Usage](#usage)

## Installation

```bash
npm install goose-parser
```

This library has dependency on [PhantomJS 2.0](https://github.com/eugene1g/phantomjs/releases). 
Follow instructions provided by the link or build it [manually](http://phantomjs.org/build.html). 

## Documentation
All css selectors can be set in a [sizzle](https://github.com/jquery/sizzle) format.

### Environments
This is a special atmosphere where Parser has to be executed. The main purpose of the [environment](https://github.com/redco/goose-parser/blob/master/lib/Environment.js) is to provide a method for evaluating JS on the page.

#### BrowserEnvironment
That environment is used for running Parser in the browser.
```JS
var env = new BrowserEnvironment();
```
To created packed js-file with Parser execute following command:
```bash
npm run build
```

### Parser
[Parser.js](https://github.com/redco/goose-parser/blob/master/lib/Parser.js) is the main component of the package which performs page parsing. 

```JS
var parser = new Parser({
    environment: env,
    pagination: pagination
});
```

**Fields:**

* *environment* - one of the allowed [environments](#environments).
* *pagination* [optional] - [pagination](#pagination) definition.

#### #parse method
```JS
parser.parse({
    actions: actions,
    rules: parsingRules
});
```

**Fields:**

* *actions* [optional] - Array of [actions](#actions) to execute before parsing process.
* *rules* - [parsing rules](#parserules) which define scopes on the page.

#### #addAction Custom action
Add custom action by using method `addAction`. Custom function is aware about context of Actions.

**Example**
```JS
parser.addAction('custom-click', function(options) {
    // do some action
});
```

**Params:**

* *type* - name of the action.
* *action* - function to execute when action is called.

#### #addTransform Custom transformation
Add custom trasformation by using method `addTransform`.

**Example**
```JS
parser.addTransform('custom-transform', function (options, result) {
    return result + options.increment;
});
```

**Params:**

* *type* - name of the transformation.
* *transformation* - function to execute when transformation is called.

#### #addPagination Custom pagination
Add custom pagination by using method `addPagination`. Custom pagination is aware about context of Paginator.

**Usage**
```JS
parser.addPagination('custom-pagination', function (options) {
    // Paginate function
    // return vow.resolve();
}, function (options, timeout) {
    // Check pagination function
    // return vow.resolve();
});
```

*Params:*
* *type* - name of new pagination method.
* *paginateFn* - Function performs pagination, should return `Promise`.
* *checkPaginationFn* - Function checks pagination complete, should return `Promise`.

**Example**

Describe new pagination type
```js
var previousPageHtml;
parser.addPagination('clickPerPage', function (options) {
    var selector = options.scope + ':eq(' + this._currentPage + ')';
    return this._env
        .evaluateJs(options.pageScope, this._getPaginatePageHtml)
        .then(function (html) {
            previousPageHtml = html;
            return this._actions.click(selector);
        }, this);
}, function (options, timeout) {
    return this._actions.wait(this._getPaginatePageHtml, function (html) {
        return html !== null && html !== previousPageHtml;
    }, [options.pageScope], timeout)
});
```

Use it
```js
var pagination = {
    type: 'clickPerPage', // your custom type
    pageScope: '.page__content',
    scope: '.page__pagination'
};

var parser = new Parser({
    environment: env,
    pagination: pagination
});

parser.parse({
    rules: {}
});
```

### Parse rules

#### Simple rule

The purpose of this rule - retrieving simple textual node value(s).

**Example:**

*Parsing rule*
```JS
{
    name: 'node',
    scope: 'div.simple-node'
}
```

*HTML*
```HTML
<div class='simple-node'>simple-value</div>
```

*Parsing result*
```JS
{
    node: 'simple-value'
}
```

**Fields:**

* *name* - name of the node which is presented in the result dataSet.
* *scope* - css selector of the node.
* *id* [optional] - true|Function. Will mark a row as identifier, the result will be set to node with `_id` name. If function specified, parser will call it for each row. See more info in [example](#examples-with-predefined-row-id).
* *attr* [optional] - name of attribute to parse. If specified, parser will parse `node.getAttribute(attr)`
* *separator* [optional]  - separator applies to glue the nodes after parse, if nodes more than one.
* *type* [optional]  - (array|string[default]). Allows to specify result data type.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *actions* [optional]  - see [Actions](#actions).
* *transform* [optional] - see [Transforms](#transforms).

#### Collection rule

The purpose of this rule - retrieving collection of nodes.

**Example:**

*Parsing rule*
```JS
{
    name: 'row',
    scope: 'div.collection-node',
    collection: [
        {
            name: 'node1',
            scope: 'div.simple-node1'
        },
        {
            name: 'node2',
            scope: 'div.simple-node2'
        },
        {
            name: 'nested',
            scope: 'div.nested-node',
            collection: [
                {
                    name: 'node3',
                    scope: 'div.simple-node3'
                }
            ]
        }
    ]
}
```

*HTML*
```HTML
<div class='collection-node'>
    <div class='simple-node1'>simple-value1</div>
    <div class='simple-node2'>simple-value2</div>
    <div class='nested-node'>
        <div class='simple-node3'>simple-value3</div>
    </div>
</div>
```

*Parsing result*
```JS
{
    row: {
        node1: 'simple-value1',
        node2: 'simple-value2',
        nested: {
            node3: 'simple-value3'
        }
    }
}
```

**Fields:**

* *name* - name of the node which is presented in the result dataSet.
* *scope* - css selector of the node.
* *collection* - array of any rule types.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *actions* [optional]  - see [Actions](#actions).
* *transform* [optional] - see [Transforms](#transforms).

#### Grid rule

The purpose of this rule - retrieving collection of collection.

**Example:**

*Parsing rule*
```JS
{
    scope: 'div.collection-node',
    collection: [[
        {
            name: 'node1',
            scope: 'div.simple-node1'
        },
        {
            name: 'node2',
            scope: 'div.simple-node2'
        }
    ]]
}
```

*HTML*
```HTML
<div>
    <div class='collection-node'>
        <div class='simple-node1'>simple-value1</div>
        <div class='simple-node2'>simple-value2</div>
    </div>
    <div class='collection-node'>
        <div class='simple-node1'>simple-value3</div>
        <div class='simple-node2'>simple-value4</div>
    </div>
</div>
```

*Parsing result*
```JS
[
    {
        node1: 'simple-value1',
        node2: 'simple-value2'
    },
    {
        node1: 'simple-value3',
        node2: 'simple-value4'
    }
]
```

**Fields:**

* *scope* - css selector of the node.
* *collection* - array of array of any rule types.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *actions* [optional]  - see [Actions](#actions).
* *transform* [optional] - see [Transforms](#transforms).
 
#### Examples with predefined row id
*Parsing rule with id = function*
```JS
var id = 0;
{
    scope: 'div.collection-node',
    collection: [[
        {
            id: function (rule, result) {
               return ++id;
            },
            scope: 'simple-reference'
        },
        {
            name: 'node',
            scope: 'div.simple-node'
        }
    ]]
}
```

*Parsing rule with id from scope*
```JS
{
    scope: 'div.collection-node',
    collection: [[
        {
            id: true,
            scope: 'simple-reference'
        },
        {
            name: 'node',
            scope: 'div.simple-node'
        }
    ]]
}
```

*HTML*
```HTML
<div>
    <div class='collection-node'>
        <div class='simple-reference'>1</div>
        <div class='simple-node'>simple-value1</div>
    </div>
    <div class='collection-node'>
        <div class='simple-reference'>2</div>
        <div class='simple-node'>simple-value2</div>
    </div>
</div>
```

*Parsing result*
```JS
[
    {
        _id: 1,
        node2: 'simple-value1'
    },
    {
        _id: 2,
        node2: 'simple-value2'
    }
]
```

### Pagination
This is a way to parse collection-based data. See more info in [Paginator.js](https://github.com/redco/goose-parser/blob/master/lib/Paginator.js)

#### Scroll pagination
This type of pagination allows to parse collections with infinite scroll.
```JS
{
    type: 'scroll',
    interval: 500
}
```

**Fields:**

* *type* - "scroll" for that type of pagination.
* *interval* - interval in pixels to scroll.
* *maxPagesCount* [optional] - max pages to parse.
* *maxResultsCount* [optional] - max results count.
* *timeout* [optional] - timeout for paginate action.

#### Page pagination
This type of pagination allows to parse collections with ajax-page pagination.

*JS definition*
```JS
{
    type: 'page',
    scope: '.page',
    pageScope: '.pageContainer',
}
```

*HTML*
```HTML
<div>
    <div class='pageContainer'>
        <div class='collection-node'>
            <div class='simple-node1'>simple-value1</div>
            <div class='simple-node2'>simple-value2</div>
        </div>
        <div class='collection-node'>
            <div class='simple-node1'>simple-value3</div>
            <div class='simple-node2'>simple-value4</div>
        </div>
    </div>
    <div class='pagination'>
        <div class='page'>1</div>
        <div class='page'>2</div>
        <div class='page'>3</div>
    </div>
</div>
```

**Fields:**

* *type* - "page" for that type of pagination.
* *scope* - css selector for paginator block (page label).
* *pageScope* - css selector for page scope (container for page-data).
* *strategy* - [optional] ajax|newPage - pagination strategy, if empty will be detected automatically.
* *maxPagesCount* [optional] - max pages to parse.
* *maxResultsCount* [optional] - max results count.
* *timeout* [optional] - timeout for paginate action.

### Actions
Allow to execute actions on the page before parse process. All actions could return a result of the execution.

#### Click
Click by the element on the page.

**Example:**
```JS
{
    type: 'click',
    scope: '.open-button'
}
```

**Fields:**

* *type* - `click` for that action.
* *scope* - css selector of the node.
* *waitForPage* [optional] - true|false. Wait for the page reload, could be useful when click handles page refresh.
* *waitForPageTimeout* [optional] - timeout for waitForPage action.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *once* [optional]  - to perform action only once (can be useful on pre-parse moment).

#### Wait
Wait for the element on the page.

**Example:**
```JS
{
    type: 'wait',
    scope: '.open-button.done'
}
```

**Fields:**

* *type* - `wait` for that action.
* *scope* - css selector of the node.
* *timeout* [optional] - time to cancel wait in seconds.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *once* [optional]  - to perform action only once (can be useful on pre-parse moment).

#### Type
Type text to the element.

**Example:**
```JS
{
    type: 'type',
    scope: 'input'
    text: 'Some text to enter'
}
```

**Fields:**

* *type* - `type` for that action.
* *scope* - css selector of the node.
* *text* - text to enter to the element.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).

#### Exist
Check if element exist on the page.

**Example:**
```JS
{
    type: 'exist',
    scope: '.some-element'
}
```

**Fields:**

* *type* - `exist` for that action.
* *scope* - css selector of the node.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).

#### ConditionalActions
Action which helps to create `if` statement based on another action.

**Example:**
```JS
{
    type: 'conditionalActions',
    conditions: [
        {
            type: 'exist',
            scope: '.element-to-check'
        }
    ],
    actions: [
        {
            type: 'click',
            scope: '.element-to-check',
            waitForPage: true
        }
    ]
}
```
In this particular action parser checks if element `.element-to-check` presents on the page, do action click on it.

**Fields:**

* *type* - `conditionalActions` for that action.
* *conditions* - Actions to check condition.
* *actions* - Actions which will be executed if conditions are true.

#### Custom actions
Add custom action by using method `addAction`. Custom function is aware about context of Actions.

**Example**
```JS
actions.addAction('custom-click', function(options) {
    // do some action
});
```

### Transforms

Allow to transform parsed value to some specific form.

#### Date
Format date to specific view (using [momentjs](https://github.com/moment/moment/)).
```JS
{
    type: 'date',
    locale: 'ru',
    from: 'HH:mm D MMM YYYY',
    to: 'YYYY-MM-DD'
}
```

#### Replace
Replace value using Regex.
```JS
{
    type: 'replace',
    re: ['\\s', 'g'],
    to: ''
}
```

#### Custom transforms
Add custom transform by using method `addTransform`.

**Example**
```JS
transforms.addTransform('custom-transform', function (options, result) {
    return result + options.increment;
});
```

## Tests

### With BrowserEnvironment
To run [tests](https://github.com/redco/goose-parser/blob/master/tests/browser_parser_test.js) build them with command:
```bash
npm run build-test
```
And then run [file](https://github.com/redco/goose-parser/blob/master/tests/browser_parser.html) in the browser.

## Debug
All parser components are covered by [debug](https://github.com/visionmedia/debug) library, which give an ability to debug application in easy way.
Set `DEBUG` variable with name of js file to show debug information.
```bash
DEBUG=Parser,Actions app.js
```

## Docker usage

For now it's available to run goose-parser as a docker service.

**Params:**

* *url* - first param is an url to parser
* *Parsing rules* [optional] - Rules to parse. It's optional, if *--rules-file* specified.

**Options:**

* -e "DEBUG=*" - to enable debug mode and see all what happens inside the goose-parser. Reed more about debug [here](https://www.npmjs.com/package/debug).
* *--rules-file* - to specify rules file. Be aware that you need to mount a folder with rules as a volume to the docker container.

There are two options to run it:

### Parsing rules from the input

```bash
docker run -it --rm -e "DEBUG=*" redcode/goose-parser:0.2-alpha 'https://www.google.ru/#newwindow=1&q=php+vs+nodejs' '{"actions": [{"type": "wait", "scope": ".g"}], "rules": {"scope": ".g", "collection": [[{"scope": ".r>a", "name": "name"}]]}}'
```

### Parsing rules from the file

Create a file `rules/rules.json` which contains parser rules and run following command:

```bash
docker run -it --rm --volume="`pwd`/rules:/app/rules:ro" -e "DEBUG=*" redcode/goose-parser:0.2-alpha --rules-file="/app/rules/rules.json" 'https://www.google.ru/#newwindow=1&q=php+vs+nodejs'
```

## Usage

```JS
var env = new PhantomEnvironment({
    url: uri,
    screen: {
        width: 1080,
        height: 200
    }
});

var parser = new Parser({
    environment: env,
    pagination: {
        type: 'scroll',
        interval: 500
    }
});

parser.parse({
    actions: [
        {
            type: 'wait',
            timeout: 2 * 60 * 1000,
            scope: '.container',
            parentScope: 'body'
        }
    ],
    rules: {
        scope: '.outer-wrap',
        collection: [[
            {
                name: 'node1',
                scope: '.node1',
                actions: [
                    {
                        type: 'click',
                        scope: '.prepare-node1'
                    },
                    {
                        type: 'wait',
                        scope: '.prepare-node1.clicked'
                    }
                ],
                collection: [
                    {
                        name: 'subNode',
                        scope: '.sub-node',
                        collection: [[
                            {
                                name: 'date',
                                scope: '.date-node',
                                transform: [
                                    {
                                        type: 'date',
                                        locale: 'ru',
                                        from: 'HH:mm D MMM YYYY',
                                        to: 'YYYY-MM-DD'
                                    }
                                ]
                            },
                            {
                                name: 'number',
                                scope: '.number-node'
                            }
                        ]]
                    }
                ]
            },
            {
                name: 'prices',
                scope: '.price'
            }
        ]]
    }
}).done(function (results) {
    // do whatever with results
});
```
