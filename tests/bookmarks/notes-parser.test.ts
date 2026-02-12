import { describe, expect, test } from "vitest";
import {
  getChecklistStats,
  notesToPlainText,
  parseNotes,
  serializeNotes,
} from "@/features/bookmarks/utils/notes-parser";

describe("notes-parser utilities", () => {
  test("returns empty notes structure for blank input", () => {
    expect(parseNotes("")).toEqual({ version: 1, blocks: [] });
    expect(parseNotes(null)).toEqual({ version: 1, blocks: [] });
  });

  test("parses valid JSON notes payload", () => {
    const payload = {
      version: 1,
      blocks: [{ id: "1", type: "text", content: "Hello" }],
    };

    expect(parseNotes(JSON.stringify(payload))).toEqual(payload);
  });

  test("parses plain text syntax into block types", () => {
    const parsed = parseNotes(
      ["# Heading", "[x] Done", "[ ] Todo", "- Bullet item", "1. Numbered", "Paragraph"].join("\n"),
    );

    expect(parsed.blocks.map((block) => block.type)).toEqual([
      "heading",
      "checklist",
      "checklist",
      "bullet",
      "numbered",
      "text",
    ]);
    expect(parsed.blocks[1]).toMatchObject({ checked: true, content: "Done" });
    expect(parsed.blocks[2]).toMatchObject({ checked: false, content: "Todo" });
  });

  test("serializes and converts notes to plaintext", () => {
    const data = parseNotes(["## Header", "[x] Task", "Normal text"].join("\n"));
    const serialized = serializeNotes(data);
    const text = notesToPlainText(data);

    expect(JSON.parse(serialized)).toMatchObject({ version: 1 });
    expect(text).toContain("## Header");
    expect(text).toContain("[x] Task");
    expect(text).toContain("Normal text");
  });

  test("computes checklist stats", () => {
    const data = parseNotes(["[x] One", "[ ] Two", "Plain text"].join("\n"));

    expect(getChecklistStats(data)).toEqual({ total: 2, completed: 1 });
  });
});
