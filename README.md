# RedParser Phantom

## Installing and run

```
npm install
npm start
```

## Documentation

### Parse Rules:

#### Simple value

The purpose of this rule - retrieving simple textual node value

**Fields:**

* *name* - name of the node which is presented in the result dataSet
* *scope* - css selector of the node

#### Collection value

The purpose of this rule - retrieving collection of nodes

**Fields:**

* *name* - name of the node which is presented in the result dataSet
* *scope* - css selector of the node
* *extract* - if set and parent is object, result value will be extracted to the parent
* *collection* - array of any rule types

#### DataSet value

The purpose of this rule - retrieving collection of collection

**Fields:**

* *name* - name of the node which is presented in the result dataSet
* *scope* - css selector of the node
* *collection* - array of any rule types

## Usage

[Sync] This is a sync way of parsing simple page:

```
var parser = new PhantomParser();
parser.parse(
    'http://some-page-url.com/page.html',
    {
        scope: 'div.get-scope-test-5-passed',
        collection: [[
            {name: 'column1', scope: 'div.get-scope-test-5-passed-column1'},
            {
                name: 'sub-column',
                scope: 'div:last-child',
                extract: true,
                collection: [
                    {name: 'column2', scope: 'div.get-scope-test-5-passed-column2'},
                    {name: 'column3', scope: 'div.get-scope-test-5-passed-column3'},
                    {name: 'column4', scope: 'div.get-scope-test-5-passed-column4'}
                ]
            }
        ]]
    }
).then(function(parsed) {

});
```

[Async] That one will parse a page with infinity scroll pagination:

```
var parser = new PhantomParser();
parser.parse(
    'http://some-page-url.com/page.html',
    {
        scope: 'div.get-scope-test-5-passed',
        collection: [[
            {name: 'column1', scope: 'div.get-scope-test-5-passed-column1'},
            {
                name: 'sub-column',
                scope: 'div:last-child',
                extract: true,
                collection: [
                    {name: 'column2', scope: 'div.get-scope-test-5-passed-column2'},
                    {name: 'column3', scope: 'div.get-scope-test-5-passed-column3'},
                    {name: 'column4', scope: 'div.get-scope-test-5-passed-column4'}
                ]
            }
        ]]
    },
    {
        type: 'scroll',
        interval: 50000
    },
).then(function(parsed) {
    
});
```

[Async] That one will parse a page with ajax pagination:

```
var parser = new PhantomParser();
parser.parse(
    'http://some-page-url.com/page.html',
    {
        scope: 'div.get-scope-test-5-passed',
        collection: [[
            {name: 'column1', scope: 'div.get-scope-test-5-passed-column1'},
            {
                name: 'sub-column',
                scope: 'div:last-child',
                extract: true,
                collection: [
                    {name: 'column2', scope: 'div.get-scope-test-5-passed-column2'},
                    {name: 'column3', scope: 'div.get-scope-test-5-passed-column3'},
                    {name: 'column4', scope: 'div.get-scope-test-5-passed-column4'}
                ]
            }
        ]]
    },
    {
        type: 'paginate',
        scope: 'div.pageable > div.pagination > div'
    }
);
```