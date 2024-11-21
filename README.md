# json-mason

[![npm version](https://badge.fury.io/js/json-mason.svg)](https://www.npmjs.com/package/json-mason)
[![tests passing: 33/33](https://img.shields.io/badge/tests%20passing-26/26-blue.svg)](https://github.com/VaibhavAcharya/json-mason/blob/main/tests/index.ts)

Json Mason is a library for performing structured modifications on JSON data. It provides a safe, predictable way to transform JSON objects through a series of operations.

It is light-weight, dependency-free, type-safe yet feature-full.

## Features

- 🛠️ Structured JSON modifications
- 🎯 Path-based targeting
- ⚡ Array and string manipulations
- 🔄 Deep cloning of data
- 🐛 Comprehensive error handling
- 🔒 Type-safe operations

## Installation

```bash
npm install json-mason

# or
yarn add json-mason
pnpm add json-mason
bun add json-mason
```

## Quick Start

```typescript
import { JsonMason } from 'json-mason';

const mason = new JsonMason();

const data = {
  user: {
    name: "John",
    tags: ["user"]
  }
};

const operations = [
  { path: ["user", "name"], action: "set", value: "John Smith" },
  { path: ["user", "tags"], action: "append", value: "admin" }
];

const result = mason.apply(data, operations);
// Result:
// {
//   user: {
//     name: "John Smith",
//     tags: ["user", "admin"]
//   }
// }
```

## API Reference

### JsonMason Class

#### `apply<T>(source: T, operations: Operation[], config?: Config): T`

Applies a series of operations to a source object.

```typescript
const mason = new JsonMason();

// Single operation
const result1 = mason.apply(data, [
  { path: ["user", "name"], action: "set", value: "John" }
]);

// Multiple operations
const result2 = mason.apply(data, [
  { path: ["users"], action: "set", value: [] },
  { path: ["users"], action: "append", value: { id: 1 }}
]);

// With config
const result3 = mason.apply(data, operations, { strict: false });
```

#### `getErrors(): OperationError[]`

Retrieves errors from the last operation (when strict mode is disabled).

```typescript
const mason = new JsonMason();
mason.apply(data, operations, { strict: false });
const errors = mason.getErrors();
// [{index: 0, operation: {...}, reason: "..."}]
```

### Supported Operations

#### Set Operation
Sets a value at a specific path.

```typescript
const operation = {
  path: ["user", "settings", "theme"],
  action: "set",
  value: "dark"
};
```

#### Append Operation
Appends a value to an array or string.

```typescript
// Array append
const arrayOp = {
  path: ["tags"],
  action: "append",
  value: "new-tag"
};

// String append
const stringOp = {
  path: ["message"],
  action: "append",
  value: " World"
};
```

#### Prepend Operation
Prepends a value to an array or string.

```typescript
// Array prepend
const arrayOp = {
  path: ["tags"],
  action: "prepend",
  value: "important"
};

// String prepend
const stringOp = {
  path: ["message"],
  action: "prepend",
  value: "Hello "
};
```

#### Delete Operation
Removes a value at a specific path.

```typescript
const operation = {
  path: ["user", "temporary"],
  action: "delete"
};
```

### Configuration

You can configure JsonMason behavior using the Config object:

```typescript
interface Config {
  strict?: boolean; // When true, throws errors immediately. Default: true
}
```

Example:
```typescript
// Throw immediately on error (default)
const result = mason.apply(data, operations, { strict: true });

// Continue on errors
const result = mason.apply(data, operations, { strict: false });
```

## Error Handling

JsonMason provides detailed error information when operations fail:

```typescript
try {
  mason.apply(data, operations);
} catch (error) {
  console.error(error.message);
}

// Or in non-strict mode:
mason.apply(data, operations, { strict: false });

const errors = mason.getErrors();

errors.forEach(error => {
  console.log(`Operation ${error.index} failed: ${error.reason}`);
});
```

## Type Safety

JsonMason is written in TypeScript and provides full type safety:

```typescript
import { Operation } from 'json-mason';

// Type-checked operations
const operation: Operation = {
  path: ["users", 0, "name"],
  action: "set",
  value: "John"
};
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
