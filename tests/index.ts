import { describe, expect, test } from "bun:test";
import { JsonMason, JsonMasonUtils, type Operation } from "./../src/index";

describe("JsonMasonUtils", () => {
  describe("clone()", () => {
    test("creates deep copy of primitive values", () => {
      expect(JsonMasonUtils.clone(42)).toBe(42);
      expect(JsonMasonUtils.clone("test")).toBe("test");
      expect(JsonMasonUtils.clone(true)).toBe(true);
      expect(JsonMasonUtils.clone(null)).toBe(null);
    });

    test("creates independent copy of objects", () => {
      const original: any = { nested: { value: 1 }, array: [1, 2, 3] };
      const clone = JsonMasonUtils.clone(original);

      clone.nested.value = 2;
      clone.array[0] = 99;

      expect(original.nested.value).toBe(1);
      expect(original.array[0]).toBe(1);
      expect(clone.nested.value).toBe(2);
      expect(clone.array[0]).toBe(99);
    });

    test("handles complex nested structures", () => {
      const original: any = {
        users: [
          { id: 1, data: { name: "John" } },
          { id: 2, data: { name: "Jane" } },
        ],
        metadata: new Map([["version", 1]]),
      };

      const clone = JsonMasonUtils.clone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });
  });

  describe("get()", () => {
    const testObj: any = {
      user: {
        name: "John",
        contacts: [
          { type: "email", value: "john@example.com" },
          { type: "phone", value: "123-456-7890" },
        ],
      },
      settings: { theme: "dark" },
    };

    test("retrieves values at various depths", () => {
      expect(JsonMasonUtils.get(testObj, ["user", "name"])).toBe("John");
      expect(JsonMasonUtils.get(testObj, ["settings", "theme"])).toBe("dark");
      expect(
        JsonMasonUtils.get(testObj, ["user", "contacts", 0, "value"]),
      ).toBe("john@example.com");
    });

    test("returns undefined for non-existent paths", () => {
      expect(JsonMasonUtils.get(testObj, ["invalid"])).toBeUndefined();
      expect(JsonMasonUtils.get(testObj, ["user", "invalid"])).toBeUndefined();
      expect(
        JsonMasonUtils.get(testObj, ["user", "contacts", 99]),
      ).toBeUndefined();
    });

    test("handles empty path", () => {
      expect(JsonMasonUtils.get(testObj, [])).toBe(testObj);
    });
  });

  describe("set()", () => {
    test("sets values at various depths", () => {
      const obj: any = { user: { name: "John" } };

      const result1 = JsonMasonUtils.set(obj, ["user", "name"], "Jane");
      expect(result1.user.name).toBe("Jane");
      expect(obj.user.name).toBe("John"); // Original unchanged

      const result2 = JsonMasonUtils.set(obj, ["user", "age"], 30);
      expect(result2.user.age).toBe(30);
      expect("age" in obj.user).toBe(false);
    });

    test("creates intermediate objects and arrays", () => {
      const obj: any = {};

      const result1 = JsonMasonUtils.set(obj, ["users", 0, "name"], "John");
      expect(result1).toEqual({ users: [{ name: "John" }] });

      const result2 = JsonMasonUtils.set(
        obj,
        ["data", "settings", "theme"],
        "dark",
      );
      expect(result2).toEqual({ data: { settings: { theme: "dark" } } });
    });

    test("handles empty path", () => {
      const obj: any = { test: true };
      const newValue: any = { replaced: true };

      const result = JsonMasonUtils.set(obj, [], newValue);
      expect(result).toEqual(newValue);
    });
  });

  describe("validateArray()", () => {
    test("validates arrays successfully", () => {
      expect(() => {
        JsonMasonUtils.validateArray([], ["test"]);
        JsonMasonUtils.validateArray([1, 2, 3], ["numbers"]);
      }).not.toThrow();
    });

    test("throws for non-array values", () => {
      expect(() => {
        JsonMasonUtils.validateArray({}, ["test"]);
      }).toThrow("Target at path test is not an array");

      expect(() => {
        JsonMasonUtils.validateArray("not-array", ["path"]);
      }).toThrow("Target at path path is not an array");

      expect(() => {
        JsonMasonUtils.validateArray(null, ["null-path"]);
      }).toThrow("Target at path null-path is not an array");
    });
  });
});

// ===== JsonMason Tests =====
describe("JsonMason", () => {
  describe("Single Operations", () => {
    const mason = new JsonMason();

    test("set operation modifies values", () => {
      const source: any = { user: { name: "John" } };
      const operations: Operation[] = [
        { path: ["user", "name"], action: "set", value: "Jane" },
      ];

      const result = mason.apply(source, operations);
      expect(result.user.name).toBe("Jane");
      expect(source.user.name).toBe("John"); // Original unchanged
    });

    test("append operation adds to arrays", () => {
      const source: any = { tags: ["a", "b"] };
      const operations: Operation[] = [
        { path: ["tags"], action: "append", value: "c" },
      ];

      const result = mason.apply(source, operations);
      expect(result.tags).toEqual(["a", "b", "c"]);
      expect(source.tags).toEqual(["a", "b"]); // Original unchanged
    });

    test("prepend operation adds to start of arrays", () => {
      const source: any = { tags: ["b", "c"] };
      const operations: Operation[] = [
        { path: ["tags"], action: "prepend", value: "a" },
      ];

      const result = mason.apply(source, operations);
      expect(result.tags).toEqual(["a", "b", "c"]);
      expect(source.tags).toEqual(["b", "c"]); // Original unchanged
    });
  });

  describe("Multiple Operations", () => {
    const mason = new JsonMason();

    test("applies multiple operations in sequence", () => {
      const source: any = {
        user: { name: "John", tags: ["user"] },
        count: 0,
      };

      const operations: Operation[] = [
        { path: ["user", "name"], action: "set", value: "Jane" },
        { path: ["user", "tags"], action: "append", value: "admin" },
        { path: ["count"], action: "set", value: 1 },
      ];

      const result = mason.apply(source, operations);
      expect(result).toEqual({
        user: { name: "Jane", tags: ["user", "admin"] },
        count: 1,
      });
    });

    test("handles operations that create nested structures", () => {
      const source: any = {};
      const operations: Operation[] = [
        { path: ["users", 0, "name"], action: "set", value: "John" },
        { path: ["users", 0, "tags"], action: "set", value: [] },
        { path: ["users", 0, "tags"], action: "append", value: "admin" },
      ];

      const result = mason.apply(source, operations);
      expect(result).toEqual({
        users: [{ name: "John", tags: ["admin"] }],
      });
    });
  });

  describe("Error Handling", () => {
    const mason = new JsonMason();

    test("throws in strict mode for invalid operations", () => {
      const source: any = { items: {} };
      const operations: Operation[] = [
        { path: ["items"], action: "append", value: "test" }, // Should fail - items is not an array
      ];

      expect(() => mason.apply(source, operations)).toThrow(
        "Target at path items is not an array",
      );
    });

    test("returns original data and stores errors in non-strict mode", () => {
      const source: any = {
        items: {},
        list: ["a"],
      };
      const operations: Operation[] = [
        { path: ["items"], action: "append", value: "test" }, // Will fail
        { path: ["list"], action: "append", value: "b" }, // Would succeed, but won't run
      ];

      const result = mason.apply(source, operations, { strict: false });

      // Should return original unchanged
      expect(result).toBe(source);

      // Should record error
      const errors = mason.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].index).toBe(0);
      expect(errors[0].reason).toContain("is not an array");
    });

    test("validates array operations", () => {
      const source: any = { values: null };
      const operations: Operation[] = [
        { path: ["values"], action: "append", value: 1 },
      ];

      expect(() => mason.apply(source, operations)).toThrow(
        "Target at path values is not an array",
      );
    });
  });

  describe("Edge Cases", () => {
    const mason = new JsonMason();

    test("handles empty operations array", () => {
      const source: any = { test: true };
      const result = mason.apply(source, []);
      expect(result).toEqual(source);
      expect(result).not.toBe(source); // Should still be a clone
    });

    test("handles operations on root path", () => {
      const source: any = { original: true };
      const operations: Operation[] = [
        { path: [], action: "set", value: { replaced: true } },
      ];

      const result = mason.apply(source, operations);
      expect(result).toEqual({ replaced: true });
    });

    test("handles undefined and null values", () => {
      const source: any = { data: { value: 1 } };
      const operations: Operation[] = [
        { path: ["data", "value"], action: "set", value: null },
        { path: ["data", "optional"], action: "set", value: undefined },
      ];

      const result = mason.apply(source, operations);
      expect(result.data.value).toBeNull();
      expect("optional" in result.data).toBe(true);
      expect(result.data.optional).toBeUndefined();
    });

    test("maintains value types", () => {
      const source: any = {
        numbers: [],
        meta: { created: new Date("2023-01-01") },
      };

      const now = new Date();
      const operations: Operation[] = [
        { path: ["numbers"], action: "append", value: 42n }, // BigInt
        { path: ["meta", "updated"], action: "set", value: now },
      ];

      const result = mason.apply(source, operations);
      expect(result.numbers[0]).toBe(42n);
      expect(result.meta.updated).toEqual(now);
    });
  });

  describe("Configuration Options", () => {
    const mason = new JsonMason();

    test("defaults to strict mode", () => {
      const source: any = { items: "not-an-array" };
      const operations: Operation[] = [
        { path: ["items"], action: "append", value: 1 },
      ];

      expect(() => mason.apply(source, operations)).toThrow();
      expect(() => mason.apply(source, operations, {})).toThrow();
    });

    test("clears previous errors on new apply", () => {
      const source: any = { items: "not-an-array" };
      const operations: Operation[] = [
        { path: ["items"], action: "append", value: 1 },
      ];

      // First operation - should fail
      mason.apply(source, operations, { strict: false });
      expect(mason.getErrors().length).toBe(1);

      // Second operation - should clear previous errors
      const validSource = { items: [] };
      mason.apply(validSource, operations, { strict: false });
      expect(mason.getErrors().length).toBe(0);
    });
  });

  describe("String Operations", () => {
    const mason = new JsonMason();

    test("append operation works with strings", () => {
      const source: any = { text: "Hello" };
      const operations: Operation[] = [
        { path: ["text"], action: "append", value: " World" },
      ];

      const result = mason.apply(source, operations);
      expect(result.text).toBe("Hello World");
    });

    test("prepend operation works with strings", () => {
      const source: any = { text: "World" };
      const operations: Operation[] = [
        { path: ["text"], action: "prepend", value: "Hello " },
      ];

      const result = mason.apply(source, operations);
      expect(result.text).toBe("Hello World");
    });

    test("throws when appending non-string to string", () => {
      const source: any = { text: "Hello" };
      const operations: Operation[] = [
        { path: ["text"], action: "append", value: 42 },
      ];

      expect(() => mason.apply(source, operations)).toThrow();
    });
  });

  describe("Delete Operations", () => {
    const mason = new JsonMason();

    test("deletes object properties", () => {
      const source: any = { a: 1, b: 2 };
      const operations: Operation[] = [{ path: ["a"], action: "delete" }];

      const result = mason.apply(source, operations);
      expect(result).toEqual({ b: 2 });
      expect("a" in result).toBe(false);
    });

    test("deletes array elements", () => {
      const source: any = { items: [1, 2, 3] };
      const operations: Operation[] = [
        { path: ["items", 1], action: "delete" },
      ];

      const result = mason.apply(source, operations);
      expect(result.items).toEqual([1, 3]);
    });

    test("handles nested deletions", () => {
      const source: any = { user: { name: "John", age: 30 } };
      const operations: Operation[] = [
        { path: ["user", "age"], action: "delete" },
      ];

      const result = mason.apply(source, operations);
      expect(result.user).toEqual({ name: "John" });
    });

    test("throws when trying to delete root", () => {
      const source: any = { test: true };
      const operations: Operation[] = [{ path: [], action: "delete" }];

      expect(() => mason.apply(source, operations)).toThrow(
        "Cannot delete root object",
      );
    });

    test("throws when parent path doesn't exist", () => {
      const source: any = { test: true };
      const operations: Operation[] = [
        { path: ["invalid", "path"], action: "delete" },
      ];

      expect(() => mason.apply(source, operations)).toThrow();
    });
  });
});
