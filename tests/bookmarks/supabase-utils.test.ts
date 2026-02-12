import { beforeEach, describe, expect, test, vi } from "vitest";
import { createItemFixture } from "../helpers/itemFixtures";

const supabaseMock = vi.hoisted(() => {
  const storageBucket = {
    createSignedUrl: vi.fn(),
    createSignedUrls: vi.fn(),
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
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
  createSignedUrlForFile,
  generateSignedUrl,
  generateSignedUrlsForItems,
  uploadFileToStorage,
  uploadThumbnailToStorage,
  validateFileForUpload,
} from "@/shared/lib/supabase-utils";

describe("supabase utility helpers", () => {
  beforeEach(() => {
    supabaseMock.supabase.storage.from.mockClear();
    supabaseMock.storageBucket.createSignedUrl.mockReset();
    supabaseMock.storageBucket.createSignedUrls.mockReset();
    supabaseMock.storageBucket.upload.mockReset();
    supabaseMock.storageBucket.getPublicUrl.mockReset();

    supabaseMock.storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed" },
      error: null,
    });
    supabaseMock.storageBucket.createSignedUrls.mockResolvedValue({
      data: [],
      error: null,
    });
    supabaseMock.storageBucket.upload.mockResolvedValue({ data: null, error: null });
    supabaseMock.storageBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.com/public.jpg" },
    });
  });

  test("validateFileForUpload enforces required file, size, and mime type", () => {
    expect(() => validateFileForUpload(null)).toThrowError();

    const file = new File(["hello"], "doc.txt", { type: "text/plain" });
    expect(() =>
      validateFileForUpload(file, {
        maxFileSizeBytes: 1,
      }),
    ).toThrowError();

    expect(() =>
      validateFileForUpload(file, {
        allowedMimeTypes: ["application/pdf"],
      }),
    ).toThrowError();
  });

  test("generateSignedUrl returns null when path is not storage-backed", async () => {
    const result = await generateSignedUrl("https://example.com/not-storage");
    expect(result).toBeNull();
  });

  test("generateSignedUrl creates signed url from storage path", async () => {
    const result = await generateSignedUrl("/item-images/user-1/file.pdf");
    expect(result).toBe("https://example.com/signed");
    expect(supabaseMock.supabase.storage.from).toHaveBeenCalledWith("item-images");
    expect(supabaseMock.storageBucket.createSignedUrl).toHaveBeenCalledWith("user-1/file.pdf", 3600);
  });

  test("generateSignedUrlsForItems maps signed urls back to matching items", async () => {
    const items = [
      createItemFixture({
        id: "1",
        preview_image_url: "/item-images/user-1/one.jpg",
      }),
      createItemFixture({
        id: "2",
        preview_image_url: "/item-images/user-1/two.jpg",
      }),
    ];
    supabaseMock.storageBucket.createSignedUrls.mockResolvedValue({
      data: [
        { path: "user-1/one.jpg", signedUrl: "https://example.com/one.jpg", error: null },
        { path: "user-1/two.jpg", signedUrl: "https://example.com/two.jpg", error: null },
      ],
      error: null,
    });

    const result = await generateSignedUrlsForItems(items);

    expect(result[0].preview_image_url).toBe("https://example.com/one.jpg");
    expect(result[1].preview_image_url).toBe("https://example.com/two.jpg");
  });

  test("uploadFileToStorage uploads to item-images and returns storage path", async () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("uuid-1");
    const file = new File(["hello"], "file.pdf", { type: "application/pdf" });

    const result = await uploadFileToStorage(file, "user-1");

    expect(supabaseMock.supabase.storage.from).toHaveBeenCalledWith("item-images");
    expect(result.storagePath).toContain("/item-images/user-1/");
    expect(result.fileName).toContain("uuid-1");
  });

  test("createSignedUrlForFile throws when signed url creation fails", async () => {
    supabaseMock.storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: null },
      error: new Error("boom"),
    });

    await expect(createSignedUrlForFile("user-1/file.pdf", 60)).rejects.toThrow();
  });

  test("uploadThumbnailToStorage returns public thumbnail url", async () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("uuid-2");
    const blob = new Blob(["thumb"], { type: "image/jpeg" });

    const result = await uploadThumbnailToStorage(blob, "user-1");

    expect(supabaseMock.supabase.storage.from).toHaveBeenCalledWith("thumbnails");
    expect(result).toBe("https://example.com/public.jpg");
  });
});
