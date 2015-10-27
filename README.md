# goose-parser

This tool moves routine crawling process to the new simple way. 
Now it's possible to parse a web page for a few moments. 
All you need is to specify parsing rules based on css selectors. It's so simple as Goose can do it.
This library allows to parse such data types as grids, collections, and simple objects.
Parser supports pagination via infinite scroll and pages.
It offers next features: pre-parse [actions](#actions) and post-parse [transformations](#transformations).

## Installation

```bash
npm install goose-parser
```

## Documentation
All css selectors can be set in a [sizzle](https://github.com/jquery/sizzle) format.

### Actions
Allow to execute actions on the page before parse process.

#### Click
Click by the element on the page.

**Example:**
```JS
{
    type: 'click',
    scope: '.open-button'
    parentScope: 'body',
    once: true
}
```

**Fields:**

* *type* - type of action
* *scope* - css selector of the node.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *once* [optional]  - to perform action only once (can be useful on pre-parse moment).

#### Wait
Wait for the element on the page.

**Example:**
```JS
{
    type: 'wait',
    scope: '.open-button.done'
    timeout: 2 * 60 * 1000,
    parentScope: 'body',
    once: true
}
```

**Fields:**

* *type* - type of action
* *scope* - css selector of the node.
* *timeout* [optional] - time to cancel wait in seconds.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *once* [optional]  - to perform action only once (can be useful on pre-parse moment).

### Transformations

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

### Parse rules

#### Simple rule

The purpose of this rule - retrieving simple textual node value.

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
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *actions* [optional]  - see [Actions](#actions).
* *transform* [optional] - see [Transformations](#transformations).

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
* *transform* [optional] - see [Transformations](#transformations).

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
* *transform* [optional] - see [Transformations](#transformations).

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
    rules: {
        actions: [
            {
                type: 'wait',
                timeout: 2 * 60 * 1000,
                scope: '.container',
                parentScope: 'body',
                once: true
            }
        ],
        scope: 'div.scope-test',
        collection: [[
            actions: [
                {
                    type: 'click',
                    scope: '.open-button'
                },
                {
                    type: 'wait',
                    scope: '.open-button.done'
                }
            ],
            {name: 'column1', scope: 'div.scope-test-column1'},
            {
                name: 'sub-column',
                scope: 'div:last-child',
                collection: [
                    {
                        name: 'column2', 
                        scope: 'div.scope-test-column2'
                    },
                    {
                        name: 'column3', 
                        scope: 'div.scope-test-column3'
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
                        name: 'column4', 
                        scope: 'div.scope-test-column4',
                        transform: [
                            {
                                type: 'replace',
                                re: ['\\s', 'g'],
                                to: ''
                            }
                        ]
                    }
                ]
            }
        ]]
    }
}).then(function(parsed) {
    
});
```

## Tests
To run [tests](https://github.com/redco/goose-parser/blob/master/tests/parser_test.js) use command
```bash
npm test
```
