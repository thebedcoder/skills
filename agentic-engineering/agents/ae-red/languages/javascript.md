# JavaScript / TypeScript Bug Patterns

## Async/await most common bugs

```javascript
// Missing await — returns Promise, not value
async function getUser(id) {
    const user = db.findById(id)   // missing await — user is a Promise
    return user.name               // TypeError: user.name is undefined (Promise has no .name)
}

// Missing await in condition
if (validateUser(id)) { ... }   // if validateUser is async, always truthy (Promise)

// Unhandled rejection in event handler
button.addEventListener('click', async () => {
    await riskyOperation()   // rejection not caught — unhandledPromiseRejection
})
// Fix: wrap in try/catch or add .catch()
```

## forEach with async

```javascript
// forEach doesn't wait — all run concurrently without coordination
items.forEach(async (item) => {
    await processItem(item)
})
// Code after forEach runs before any item is processed

// Fix
await Promise.all(items.map(item => processItem(item)))
// Or sequential:
for (const item of items) {
    await processItem(item)
}
```

## this context loss

```javascript
class Timer {
    constructor() { this.count = 0 }
    
    start() {
        setInterval(this.tick, 1000)   // Bug: this inside tick will be undefined/global
    }
    
    tick() {
        this.count++   // TypeError: Cannot set property 'count' of undefined
    }
}

// Fix — bind or arrow function
setInterval(this.tick.bind(this), 1000)
setInterval(() => this.tick(), 1000)
// Or: tick = () => { this.count++ }  // arrow function property
```

## Variable hoisting

```javascript
// var hoisting — variable exists but is undefined before assignment
console.log(x)   // undefined (not ReferenceError)
var x = 5

// let/const in loops — closure capture (see state-bugs.md)
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0)   // prints 3,3,3 not 0,1,2
}
```

## Object/array mutation

```javascript
// Shallow copy doesn't prevent nested mutation
const copy = { ...original }
copy.nested.value = 'changed'   // also mutates original.nested.value!

// Array methods that mutate vs return new
const sorted = arr.sort()       // mutates arr AND returns it
const sorted = [...arr].sort()  // safe — sort copy

arr.reverse()       // mutates in place
arr.slice().reverse()  // safe
```

## TypeScript false safety

```typescript
// Type assertion doesn't validate at runtime
const user = data as User        // no runtime check
const user = <User>data          // same — no runtime check

// Non-null assertion on external data
const el = document.querySelector('.btn')!   // crashes if element absent
const val = obj.property!                     // crashes if undefined

// any escapes type system
function process(data: any) {
    data.forEach(...)   // TypeError at runtime if data isn't array
}
```

## Common Node.js bugs

```javascript
// Callback error not checked
fs.readFile(path, (err, data) => {
    processData(data)   // Bug: data is undefined if err is set
})
// Fix
fs.readFile(path, (err, data) => {
    if (err) return handleError(err)
    processData(data)
})

// EventEmitter missing error handler — throws unhandled error
const emitter = new EventEmitter()
emitter.on('data', handler)
// emitter.on('error', errorHandler)   // missing — unhandled error crashes process

// require() caches modules — mutating exported objects affects all importers
const config = require('./config')
config.debug = true   // mutates shared cached module
```

## Equality and comparison

```javascript
NaN === NaN   // false — use Number.isNaN()
typeof null === 'object'   // true — historical bug, use x === null
[] == false   // true — coercion
{} == false   // false — coercion differs for objects
```
