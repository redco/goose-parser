# goose-parser

This library allows to parse grids, rows, and simple nodes from the page.
Parser supports paginations via infinity scroll and pages.
It offers such features as pre-parse [actions](#actions) and post-parse [transformations](#transformations).

## Installation

```
npm install goose-parser
```

## Documentation
All css selectors can be set in a [sizzle](https://github.com/jquery/sizzle) format.

### Actions
Allow to execute actions on the page before parse process.

#### Click
Click by the element on the page.
```
{
    type: 'click',
    scope: '.open-button'
}
```

#### Wait
Wait for the element on the page. For using only once you can add flag `once: true`. It cab be useful for wait some element before parsing process.
```
{
    type: 'wait',
    scope: '.open-button.done'
}
```

### Transformations

#### Date
Format date to specific view.
```
{
    type: 'date',
    locale: 'ru',
    from: 'HH:mm D MMM YYYY',
    to: 'YYYY-MM-DD'
}
```

#### Replace
Replace value using Regex.
```
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
```
{
    name: 'node',
    scope: 'div.simple-node'
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
```
{
    name: 'collection',
    scope: 'div.collection-node',
    collection: [
        {
            name: 'node',
            scope: 'div.simple-node'
        },
        ...
    ]
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

```
{
    name: 'collection',
    scope: 'div.collection-node',
    collection: [[
        {
            name: 'node',
            scope: 'div.simple-node'
        },
        ...
    ]]
}
```

**Fields:**

* *name* - name of the node which is presented in the result dataSet.
* *scope* - css selector of the node.
* *collection* - array of array of any rule types.
* *parentScope* [optional] - css selector of the parent node, to specify a global scope (outside current).
* *actions* [optional]  - see [Actions](#actions).
* *transform* [optional] - see [Transformations](#transformations).

## Usage

```
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
                scope: '.expl-progress-bar-container.expl-hidden',
                parentScope: 'body',
                once: true
            }
        ],
        scope: 'div.get-scope-test-5-passed',
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
            {name: 'column1', scope: 'div.get-scope-test-5-passed-column1'},
            {
                name: 'sub-column',
                scope: 'div:last-child',
                extract: true,
                collection: [
                    {
                        name: 'column2', 
                        scope: 'div.get-scope-test-5-passed-column2'
                    },
                    {
                        name: 'column3', 
                        scope: 'div.get-scope-test-5-passed-column3',
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
