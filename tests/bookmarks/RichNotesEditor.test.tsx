import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { RichNotesEditor } from "@/features/bookmarks/components/RichNotesEditor";

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
});
