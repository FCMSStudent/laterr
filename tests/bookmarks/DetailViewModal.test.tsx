import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
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

  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn(() => ({
    eq: deleteEq,
  }));

  return {
    selectChain,
    updateEq,
    update,
    deleteEq,
    del,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update,
        delete: del,
      })),
    },
  };
});

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: supabaseMock.supabase,
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

vi.mock("@/features/bookmarks/components/CardDetailRightPanel", () => ({
  CardDetailRightPanel: ({
    isTrashed,
    onRestore,
  }: {
    isTrashed?: boolean;
    onRestore?: () => void;
  }) => (
    <div>
      {isTrashed && (
        <button type="button" onClick={onRestore}>
          Restore
        </button>
      )}
    </div>
  ),
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

describe("DetailViewModal", () => {
  beforeEach(() => {
    toast.success.mockReset();
    toast.error.mockReset();
    supabaseMock.supabase.from.mockClear();
    supabaseMock.update.mockClear();
    supabaseMock.updateEq.mockReset();
    supabaseMock.updateEq.mockResolvedValue({ error: null });
  });

  test("restores trashed item", async () => {
    const onOpenChange = vi.fn();
    const onUpdate = vi.fn();
    const item = createItemFixture({
      id: "item-restore",
      type: "note",
      content: "hello",
      deleted_at: "2026-01-02T00:00:00.000Z",
    });

    render(
      <DetailViewModal
        open={true}
        onOpenChange={onOpenChange}
        item={item}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Restore$/i }));

    await waitFor(() => {
      expect(supabaseMock.update).toHaveBeenCalledWith({
        deleted_at: null,
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
