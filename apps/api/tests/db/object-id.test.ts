import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import {
  InvalidObjectIdError,
  parseObjectId,
  requireObjectId,
  serializeObjectId,
} from "../../src/db/object-id.js";

describe("ObjectId mapping", () => {
  it("parses valid API identifiers and serializes lowercase hex", () => {
    const parsed = requireObjectId("ABCDEFABCDEFABCDEFABCDEF");

    expect(parsed).toBeInstanceOf(ObjectId);
    expect(serializeObjectId(parsed)).toBe("abcdefabcdefabcdefabcdef");
  });

  it("rejects malformed identifiers before database access", () => {
    expect(parseObjectId("not-an-object-id")).toBeNull();
    expect(() => requireObjectId("not-an-object-id")).toThrow(
      InvalidObjectIdError,
    );
  });
});
