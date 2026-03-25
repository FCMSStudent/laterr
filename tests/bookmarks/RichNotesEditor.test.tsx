import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { RichNotesEditor } from "@/features/bookmarks/components/RichNotesEditor";

function ControlledRichNotes({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial);
  return <RichNotesEditor value={value} onChange={setValue} />;
}

describe("RichNotesEditor", () => {
  test("adds a text block and emits serialized updates", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichNotesEditor value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Text/i }));
    const input = screen.getByPlaceholderText("Text...");
    await user.type(input, "Hello notes");

    expect(onChange).toHaveBeenCalled();
    const lastPayload = onChange.mock.calls.at(-1)?.[0] as string;
    expect(lastPayload).toContain("Hello notes");
  });

  test("keeps focus on the text input while typing in controlled mode", async () => {
    const user = userEvent.setup();
    render(<ControlledRichNotes initial={null} />);

    await user.click(screen.getByRole("button", { name: /Text/i }));
    const input = screen.getByPlaceholderText("Text...");
    await user.type(input, "Hello");
    expect(document.activeElement).toBe(input);
  });

  test("preserves block id across successive keystrokes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichNotesEditor value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Text/i }));
    const input = screen.getByPlaceholderText("Text...");
    await user.type(input, "a");
    const id1 = JSON.parse(onChange.mock.calls.at(-1)![0] as string).blocks[0].id as string;
    await user.type(input, "b");
    const id2 = JSON.parse(onChange.mock.calls.at(-1)![0] as string).blocks[0].id as string;
    expect(id2).toBe(id1);
  });

  test("applies external value when parent replaces content", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<RichNotesEditor value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Text/i }));
    await user.type(screen.getByPlaceholderText("Text..."), "local");

    const serverPayload = JSON.stringify({
      version: 1,
      blocks: [{ id: "server-block", type: "text", content: "from server" }],
    });
    rerender(<RichNotesEditor value={serverPayload} onChange={onChange} />);

    expect(screen.getByPlaceholderText("Text...")).toHaveValue("from server");
  });
});
