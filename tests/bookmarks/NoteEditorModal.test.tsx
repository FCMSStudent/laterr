import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createSupabaseMock } from "../helpers/mockSupabase";
import { createItemFixture } from "../helpers/itemFixtures";
import { NoteEditorModal } from "@/features/bookmarks/components/NoteEditorModal";
import { supabase } from "@/lib/supabase/client";

const supabaseMock = createSupabaseMock();
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast,
}));

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/features/bookmarks/components/RichNotesEditor", () => ({
  RichNotesEditor: ({
    value,
    onChange,
  }: {
    value: string | null | undefined;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Rich editor"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe("NoteEditorModal", () => {
  beforeEach(() => {
    vi.spyOn(supabase, "from").mockReturnValue(supabaseMock.queryBuilder as never);

    toast.success.mockReset();
    toast.error.mockReset();
    supabaseMock.queryBuilder.update.mockReset();
    supabaseMock.queryBuilder.update.mockReturnValue(supabaseMock.queryBuilder);
    supabaseMock.queryBuilder.eq.mockReset();
    supabaseMock.queryBuilder.eq.mockResolvedValue({ error: null });
  });

  test("saves note changes", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const item = createItemFixture({
      id: "note-1",
      type: "note",
      title: "Original title",
      content: "Original content",
    });

    render(
      <NoteEditorModal
        open={true}
        onOpenChange={vi.fn()}
        item={item}
        onUpdate={onUpdate}
      />,
    );

    await user.clear(screen.getByPlaceholderText("Note title..."));
    await user.type(screen.getByPlaceholderText("Note title..."), "Updated title");
    await user.type(screen.getByLabelText("Rich editor"), " + updates");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(supabaseMock.queryBuilder.update).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  test("supports keyboard save shortcut", async () => {
    const item = createItemFixture({
      id: "note-2",
      type: "note",
      title: "Shortcut title",
      content: "Shortcut content",
    });

    render(
      <NoteEditorModal
        open={true}
        onOpenChange={vi.fn()}
        item={item}
        onUpdate={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(supabaseMock.queryBuilder.update).toHaveBeenCalled();
    });
  });
});
