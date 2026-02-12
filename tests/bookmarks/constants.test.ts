import { describe, expect, test } from "vitest";
import { EMBEDDING_DIMENSION, isValidEmbedding } from "@/features/bookmarks/constants";

describe("bookmark constants", () => {
  test("isValidEmbedding returns true only for expected vector size", () => {
    const valid = Array.from({ length: EMBEDDING_DIMENSION }, (_, index) => index);
    const invalidShort = Array.from({ length: 10 }, () => 0);

    expect(isValidEmbedding(valid)).toBe(true);
    expect(isValidEmbedding(invalidShort)).toBe(false);
    expect(isValidEmbedding("not-an-array")).toBe(false);
    expect(isValidEmbedding(null)).toBe(false);
  });
});
