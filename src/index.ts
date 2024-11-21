/**
 * **Defines a modification operation to be applied to JSON data**
 *
 * Represents a single transformation instruction
 * @example
 * ```ts
 * const operation: Operation = {
 *   path: ["users", 0, "name"],
 *   action: "set",
 *   value: "John Smith"
 * }
 * ```
 */
export type Operation = {
  path: (string | number)[];
} & (
  | {
      action: "set" | "append" | "prepend";
      value: unknown;
    }
  | {
      action: "delete";
      value?: unknown; // Will be ignored
    }
);

/**
 * **Details about a failed operation attempt**
 *
 * Contains complete operation context for debugging
 * @example
 * ```ts
 * {
 *   index: 0,
 *   operation: {path: ["invalid"], action: "set", value: "test"},
 *   reason: "Target path does not exist"
 * }
 * ```
 */
export type OperationError = {
  index: number;
  operation: Operation;
  reason: string;
};

/**
 * **Configuration options for JsonMason behavior**
 * @example
 * ```ts
 * const config: Config = {
 *   strict: false // Continue on errors
 * }
 * ```
 */
export type Config = {
  /** When true, throws errors immediately. Default: true */
  strict?: boolean;
};

/**
 * **Static utility methods for JSON operations**
 *
 * Provides core functionality for data manipulation
 * @example
 * ```ts
 * const value = JsonMasonUtils.get(obj, ["users", 0]);
 * const newObj = JsonMasonUtils.set(obj, ["count"], 42);
 * ```
 */
export class JsonMasonUtils {
  /**
   * **Creates a deep clone of an object**
   *
   * Uses structured clone for maximum compatibility
   * @example
   * ```ts
   * const original = {nested: {value: 1}};
   * const clone = JsonMasonUtils.clone(original);
   * clone.nested.value = 2; // Doesn't affect original
   * ```
   */
  public static clone<T>(source: T): T {
    return structuredClone(source);
  }

  /**
   * **Safely retrieves a nested value from an object**
   * @example
   * ```ts
   * const obj = {users: [{name: "John"}]};
   * const name = JsonMasonUtils.get(obj, ["users", 0, "name"]); // "John"
   * const missing = JsonMasonUtils.get(obj, ["invalid"]); // undefined
   * ```
   */
  public static get<T>(obj: T, path: (string | number)[]): unknown {
    let current = obj as any;

    for (const key of path) {
      if (current == null) return undefined;
      current = current[key];
    }

    return current;
  }

  /**
   * **Sets a value at a nested path**
   *
   * Creates intermediate objects/arrays as needed
   * @example
   * ```ts
   * const obj = {users: []};
   * const result = JsonMasonUtils.set(obj, ["users", 0, "name"], "John");
   * // result = {users: [{name: "John"}]}
   * ```
   */
  public static set<T>(obj: T, path: (string | number)[], value: unknown): T {
    if (path.length === 0) return value as T;

    const result = this.clone(obj);
    let current = result as any;

    // Navigate to the target location, creating path as needed
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      const nextKey = path[i + 1];

      if (!(key in current)) {
        // Create intermediate container based on next key type
        current[key] = typeof nextKey === "number" ? [] : {};
      }
      current = current[key];
    }

    current[path[path.length - 1]] = value;
    return result;
  }

  /**
   * **Validates if a value is an array**
   *
   * Centralizes array checking logic
   * @example
   * ```ts
   * const arr = [1, 2, 3];
   * JsonMasonUtils.validateArray(arr, ["numbers"]); // OK
   * JsonMasonUtils.validateArray({}, ["invalid"]); // Throws Error
   * ```
   */
  public static validateArray(
    value: unknown,
    path: (string | number)[],
  ): asserts value is unknown[] {
    if (!Array.isArray(value)) {
      throw new Error(`Target at path ${path.join(".")} is not an array`);
    }
  }

  /**
   * **Validates if a value is a string**
   *
   * Centralizes string validation logic
   * @example
   * ```ts
   * const str = "test";
   * JsonMasonUtils.validateString(str, ["path"]); // OK
   * JsonMasonUtils.validateString(123, ["invalid"]); // Throws Error
   * ```
   */
  public static validateString(
    value: unknown,
    path: (string | number)[],
  ): asserts value is string {
    if (typeof value !== "string") {
      throw new Error(`Target at path ${path.join(".")} is not a string`);
    }
  }

  /**
   * **Validates if value is array or string**
   *
   * Ensures target is appendable/prependable
   * @example
   * ```ts
   * const arr = [1, 2, 3];
   * const str = "test";
   * JsonMasonUtils.validateAppendable(arr, ["array"]); // OK
   * JsonMasonUtils.validateAppendable(str, ["string"]); // OK
   * JsonMasonUtils.validateAppendable({}, ["invalid"]); // Throws Error
   * ```
   */
  public static validateAppendable(
    value: unknown,
    path: (string | number)[],
  ): asserts value is unknown[] | string {
    if (!Array.isArray(value) && typeof value !== "string") {
      throw new Error(
        `Target at path ${path.join(".")} is not an array or string`,
      );
    }
  }
}

/**
 * **Core class for performing JSON transformations**
 *
 * Handles operations like setting values and array modifications
 * @example
 * ```ts
 * const mason = new JsonMason();
 * const result = mason.apply(data, [
 *   {path: ["name"], action: "set", value: "John"},
 *   {path: ["tags"], action: "append", value: "new"}
 * ]);
 * ```
 */
export class JsonMason {
  private errors: OperationError[] = [];

  /**
   * **Retrieves errors from the last operation**
   *
   * Only populated when strict mode is disabled
   * @example
   * ```ts
   * const mason = new JsonMason();
   * mason.apply(data, operations, {strict: false});
   * const errors = mason.getErrors();
   * // [{index: 0, operation: {...}, reason: "..."}]
   * ```
   */
  public getErrors(): OperationError[] {
    return this.errors;
  }

  /**
   * **Applies multiple operations to a source object**
   *
   * Processes operations sequentially with error handling
   * @example
   * ```ts
   * const source = {count: 0, items: []};
   * const operations = [
   *   {path: ["count"], action: "set", value: 1},
   *   {path: ["items"], action: "append", value: "first"}
   * ];
   * const result = mason.apply(source, operations);
   * // {count: 1, items: ["first"]}
   * ```
   */
  public apply<T>(source: T, operations: Operation[], config?: Config): T {
    const strict = config?.strict ?? true;
    this.errors = []; // Reset errors

    let result = JsonMasonUtils.clone(source);

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      try {
        result = this.executeOperation(result, operation);
      } catch (error) {
        const operationError = {
          index: i,
          operation: operation,
          reason: error instanceof Error ? error.message : String(error),
        };

        if (strict) throw new Error(operationError.reason);

        this.errors.push(operationError);
        return source;
      }
    }

    return result;
  }

  private executeOperation<T>(source: T, operation: Operation): T {
    const { path, action, value } = operation;

    switch (action) {
      case "set":
        return JsonMasonUtils.set(source, path, value);

      case "delete": {
        // Handle empty path case
        if (path.length === 0) {
          throw new Error("Cannot delete root object");
        }

        const result = JsonMasonUtils.clone(source);
        const parentPath = path.slice(0, -1);
        const target =
          parentPath.length === 0
            ? result
            : JsonMasonUtils.get(result, parentPath);

        if (target == null) {
          throw new Error(`Parent path ${parentPath.join(".")} does not exist`);
        }

        const key = path[path.length - 1];
        if (Array.isArray(target)) {
          if (typeof key === "number") {
            target.splice(key, 1);
          } else {
            throw new Error(`Invalid array index: ${key}`);
          }
        } else if (typeof target === "object") {
          delete (target as any)[key];
        } else {
          throw new Error(
            `Cannot delete from non-object at ${parentPath.join(".")}`,
          );
        }

        return result;
      }

      case "append":
      case "prepend": {
        const current = JsonMasonUtils.get(source, path);
        JsonMasonUtils.validateAppendable(current, path);

        let newValue;
        if (typeof current === "string") {
          if (typeof value !== "string") {
            throw new Error("Can only append/prepend strings to strings");
          }
          newValue = action === "append" ? current + value : value + current;
        } else {
          // Array case
          newValue =
            action === "append" ? [...current, value] : [value, ...current];
        }

        return JsonMasonUtils.set(source, path, newValue);
      }

      default:
        throw new Error(`Unknown operation: ${action}`);
    }
  }
}
