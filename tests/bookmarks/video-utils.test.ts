import { describe, expect, test } from "vitest";
import {
  getVideoEmbedUrl,
  getVimeoVideoId,
  getYouTubeThumbnail,
  getYouTubeVideoId,
  isVideoUrl,
  isVimeoUrl,
  isYouTubeUrl,
} from "@/features/bookmarks/utils/video-utils";

describe("video utils", () => {
  test("detects youtube urls and extracts ids from common formats", () => {
    expect(isYouTubeUrl("https://youtube.com/watch?v=abc123")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/xyz987")).toBe(true);
    expect(getYouTubeVideoId("https://youtube.com/watch?v=abc123&feature=share")).toBe("abc123");
    expect(getYouTubeVideoId("https://youtu.be/xyz987")).toBe("xyz987");
  });

  test("detects vimeo urls and extracts numeric ids", () => {
    expect(isVimeoUrl("https://vimeo.com/12345678")).toBe(true);
    expect(getVimeoVideoId("https://vimeo.com/12345678")).toBe("12345678");
    expect(getVimeoVideoId("https://example.com")).toBeNull();
  });

  test("builds thumbnails and embed urls", () => {
    expect(getYouTubeThumbnail("abc123")).toBe("https://img.youtube.com/vi/abc123/maxresdefault.jpg");
    expect(getVideoEmbedUrl("https://youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
    expect(getVideoEmbedUrl("https://vimeo.com/12345678")).toBe("https://player.vimeo.com/video/12345678");
    expect(getVideoEmbedUrl("https://example.com")).toBeNull();
  });

  test("isVideoUrl detects supported platforms only", () => {
    expect(isVideoUrl("https://youtube.com/watch?v=abc123")).toBe(true);
    expect(isVideoUrl("https://vimeo.com/12345678")).toBe(true);
    expect(isVideoUrl("https://example.com/video.mp4")).toBe(false);
  });
});
