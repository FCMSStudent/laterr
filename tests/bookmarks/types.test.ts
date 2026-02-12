import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createBulletBlock,
  createChecklistBlock,
  createEmptyNotesData,
  createHeadingBlock,
  createNumberedBlock,
  createTextBlock,
} from "@/features/bookmarks/types";

describe("bookmark note block factories", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("uuid-1")
      .mockReturnValueOnce("uuid-2")
      .mockReturnValueOnce("uuid-3")
      .mockReturnValueOnce("uuid-4")
      .mockReturnValueOnce("uuid-5");
  });

  test("createEmptyNotesData returns v1 structure", () => {
    expect(createEmptyNotesData()).toEqual({
      version: 1,
      blocks: [],
    });
  });

  test("creates typed blocks with expected defaults", () => {
    expect(createTextBlock()).toMatchObject({ id: "uuid-1", type: "text", content: "" });
    expect(createChecklistBlock("task")).toMatchObject({
      id: "uuid-2",
      type: "checklist",
      content: "task",
      checked: false,
    });
    expect(createHeadingBlock("title", 1)).toMatchObject({
      id: "uuid-3",
      type: "heading",
      content: "title",
      level: 1,
    });
    expect(createBulletBlock("point")).toMatchObject({
      id: "uuid-4",
      type: "bullet",
      content: "point",
    });
    expect(createNumberedBlock("step")).toMatchObject({
      id: "uuid-5",
      type: "numbered",
      content: "step",
    });
  });
});
