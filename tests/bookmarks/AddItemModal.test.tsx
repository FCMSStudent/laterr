import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createSupabaseMock } from "../helpers/mockSupabase";
import { AddItemModal } from "@/features/bookmarks/components/AddItemModal";
import { supabase } from "@/integrations/supabase/client";

const supabaseMock = createSupabaseMock();
const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast,
}));

vi.mock("react-pdf", () => ({
  Document: () => null,
  Page: () => null,
  pdfjs: {
    version: "test",
    GlobalWorkerOptions: {
      workerSrc: "",
    },
    getDocument: vi.fn(),
  },
}));

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

describe("AddItemModal", () => {
  beforeEach(() => {
    vi.spyOn(supabase, "from").mockReturnValue(supabaseMock.queryBuilder as never);
    vi.spyOn(supabase.auth, "getUser").mockImplementation(supabaseMock.auth.getUser);
    vi.spyOn(supabase, "functions", "get").mockReturnValue(supabaseMock.supabase.functions as never);

    toast.error.mockReset();
    toast.success.mockReset();
    toast.warning.mockReset();
    supabaseMock.auth.getUser.mockReset();
    supabaseMock.supabase.functions.invoke.mockReset();
    supabaseMock.queryBuilder.insert.mockReset();
  });

  test("shows validation error for invalid url without calling backend", async () => {
    const user = userEvent.setup();
    render(<AddItemModal open={true} onOpenChange={vi.fn()} onItemAdded={vi.fn()} />);

    await user.type(screen.getByLabelText("URL to add"), "not-a-url");
    await user.click(screen.getByRole("button", { name: /add url/i }));

    expect(toast.error).toHaveBeenCalled();
    expect(supabaseMock.auth.getUser).not.toHaveBeenCalled();
  });

  test("submits note and calls callbacks on success", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onItemAdded = vi.fn();
    const embedding = Array.from({ length: 1536 }, () => 0);

    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseMock.supabase.functions.invoke.mockResolvedValue({
      data: { embedding },
      error: null,
    });
    supabaseMock.queryBuilder.insert.mockResolvedValue({ error: null });

    render(<AddItemModal open={true} onOpenChange={onOpenChange} onItemAdded={onItemAdded} />);

    await user.click(screen.getByRole("tab", { name: "Note" }));
    await user.type(screen.getByLabelText("Note content"), "My note content");
    await user.click(screen.getByRole("button", { name: /save note/i }));

    await waitFor(() => {
      expect(onItemAdded).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
