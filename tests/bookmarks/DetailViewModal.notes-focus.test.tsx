import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { createItemFixture } from "../helpers/itemFixtures";
import { DetailViewModal } from "@/features/bookmarks/components/DetailViewModal";

const supabaseMock = vi.hoisted(() => {
  const selectChain = {
    contains: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({
    eq: updateEq,
  }));

  return {
    selectChain,
    update,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update,
      })),
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMock.supabase,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("react-pdf", () => ({
  Document: () => null,
  Page: () => null,
  pdfjs: {
    version: "test",
    GlobalWorkerOptions: { workerSrc: "" },
    getDocument: vi.fn(),
  },
}));

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/features/bookmarks/components/ThumbnailPreview", () => ({
  ThumbnailPreview: () => <div data-testid="thumb-preview" />,
}));

vi.mock("@/shared/lib/supabase-utils", async () => {
  const actual = await vi.importActual<typeof import("@/shared/lib/supabase-utils")>(
    "@/shared/lib/supabase-utils",
  );
  return {
    ...actual,
    generateSignedUrl: vi.fn().mockResolvedValue(null),
    generateSignedUrlsForItems: vi.fn().mockResolvedValue([]),
  };
});

/**
 * Regression: nested Mobile/Desktop components inside DetailViewModal caused full subtree
 * remount on each keystroke and lost Notes focus. Uses real CardDetailRightPanel (not mocked).
 */
describe("DetailViewModal Notes focus", () => {
  test("Notes textarea keeps focus while typing on desktop URL detail", async () => {
    const user = userEvent.setup();
    const item = createItemFixture({
      id: "url-notes-focus",
      type: "url",
      content: "https://example.com/product",
      preview_image_url: "https://example.com/img.jpg",
      title: "Sample product",
      user_notes: "",
    });

    render(
      <DetailViewModal open={true} onOpenChange={vi.fn()} item={item} onUpdate={vi.fn()} />,
    );

    const textarea = screen.getByRole("textbox", { name: /notes/i });
    await user.click(textarea);
    await user.type(textarea, "hello");
    expect(document.activeElement).toBe(textarea);
  });
});
