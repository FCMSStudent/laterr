import { test, expect } from "@playwright/test";
import { extractStorageObjectRef } from "../src/features/bookmarks/utils/trash";

test("extractStorageObjectRef parses storage paths and URLs", () => {
  expect(extractStorageObjectRef("/item-images/user-1/file.png")).toEqual({
    bucket: "item-images",
    key: "user-1/file.png",
  });

  expect(
    extractStorageObjectRef("https://example.supabase.co/storage/v1/object/public/thumbnails/user-1/preview.jpg")
  ).toEqual({
    bucket: "thumbnails",
    key: "user-1/preview.jpg",
  });

  expect(
    extractStorageObjectRef(
      "https://example.supabase.co/storage/v1/object/sign/item-images/user-1/file.pdf?token=abc"
    )
  ).toEqual({
    bucket: "item-images",
    key: "user-1/file.pdf",
  });

  expect(extractStorageObjectRef("https://example.com/hello")).toBeNull();
});
