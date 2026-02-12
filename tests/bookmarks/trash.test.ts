import { beforeEach, describe, expect, test, vi } from "vitest";
import { createItemFixture } from "../helpers/itemFixtures";

const supabaseMock = vi.hoisted(() => {
  const storageBucket = {
    remove: vi.fn(),
  };

  return {
    storageBucket,
    supabase: {
      storage: {
        from: vi.fn(() => storageBucket),
      },
    },
  };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: supabaseMock.supabase,
}));

import {
  collectItemStorageRefs,
  extractStorageObjectRef,
  removeMultipleItemsStorageObjects,
} from "@/features/bookmarks/utils/trash";

describe("trash utilities", () => {
  beforeEach(() => {
    supabaseMock.supabase.storage.from.mockClear();
    supabaseMock.storageBucket.remove.mockReset();
    supabaseMock.storageBucket.remove.mockResolvedValue({ data: null, error: null });
  });

  test("extractStorageObjectRef parses valid storage paths and urls", () => {
    expect(extractStorageObjectRef("/item-images/user-1/file.png")).toEqual({
      bucket: "item-images",
      key: "user-1/file.png",
    });

    expect(
      extractStorageObjectRef(
        "https://example.supabase.co/storage/v1/object/public/thumbnails/user-1/preview.jpg",
      ),
    ).toEqual({
      bucket: "thumbnails",
      key: "user-1/preview.jpg",
    });

    expect(extractStorageObjectRef("https://example.com/nope")).toBeNull();
  });

  test("collectItemStorageRefs deduplicates refs across content and preview", () => {
    const item = createItemFixture({
      content: "/item-images/user-1/file.pdf",
      preview_image_url: "/item-images/user-1/file.pdf",
    });

    expect(collectItemStorageRefs(item)).toEqual([
      {
        bucket: "item-images",
        key: "user-1/file.pdf",
      },
    ]);
  });

  test("removeMultipleItemsStorageObjects groups refs by bucket", async () => {
    const itemA = createItemFixture({
      id: "a",
      content: "/item-images/user-1/a.pdf",
      preview_image_url: "/thumbnails/user-1/a.jpg",
    });
    const itemB = createItemFixture({
      id: "b",
      content: "/item-images/user-1/b.pdf",
      preview_image_url: "/thumbnails/user-1/b.jpg",
    });

    await removeMultipleItemsStorageObjects([itemA, itemB]);

    expect(supabaseMock.supabase.storage.from).toHaveBeenCalledWith("item-images");
    expect(supabaseMock.supabase.storage.from).toHaveBeenCalledWith("thumbnails");
    expect(supabaseMock.storageBucket.remove).toHaveBeenCalledTimes(2);
  });

  test("removeMultipleItemsStorageObjects chunks large batches", async () => {
    const items = Array.from({ length: 205 }, (_, index) =>
      createItemFixture({
        id: `item-${index}`,
        content: `/item-images/user-1/file-${index}.pdf`,
        preview_image_url: null,
      }),
    );

    await removeMultipleItemsStorageObjects(items);

    const firstBatch = supabaseMock.storageBucket.remove.mock.calls[0]?.[0] as string[];
    const secondBatch = supabaseMock.storageBucket.remove.mock.calls[1]?.[0] as string[];
    const thirdBatch = supabaseMock.storageBucket.remove.mock.calls[2]?.[0] as string[];

    expect(supabaseMock.storageBucket.remove).toHaveBeenCalledTimes(3);
    expect(firstBatch).toHaveLength(100);
    expect(secondBatch).toHaveLength(100);
    expect(thirdBatch).toHaveLength(5);
  });
});
