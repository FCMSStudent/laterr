import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookmarkCard } from "@/features/bookmarks/components/BookmarkCard";

const mockUseDominantColor = vi.fn();

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/shared/hooks/useDominantColor", () => ({
  useDominantColor: (imageUrl?: string | null) => mockUseDominantColor(imageUrl),
}));

describe("BookmarkCard", () => {
  beforeEach(() => {
    mockUseDominantColor.mockReturnValue({ color: "rgb(10, 20, 30)" });
  });

  test("calls onClick when pressing enter on card", () => {
    const onClick = vi.fn();
    render(
      <BookmarkCard
        id="bookmark-1"
        type="note"
        title="My Note"
        summary="Summary"
        tags={["read later"]}
        onClick={onClick}
        onTagClick={vi.fn()}
      />,
    );

    const article = screen.getByRole("article");
    fireEvent.keyDown(article, { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("bookmark-1");
  });

  test("emits selection changes while in selection mode", () => {
    const onSelectionChange = vi.fn();

    render(
      <BookmarkCard
        id="bookmark-2"
        type="image"
        title="Card"
        summary="Summary"
        previewImageUrl="https://example.com/image.jpg"
        tags={["wishlist"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
        isSelectionMode={true}
        isSelected={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onSelectionChange).toHaveBeenCalledWith("bookmark-2", true);
  });

  test("uses dark-text mode for very bright thumbnails and applies light text shadow", () => {
    mockUseDominantColor.mockReturnValue({ color: "rgb(245, 245, 245)" });

    render(
      <BookmarkCard
        id="bookmark-bright"
        type="image"
        title="Bright Card"
        summary="Bright summary"
        previewImageUrl="https://example.com/bright.jpg"
        tags={["read later"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("bookmark-card-overlay")).toHaveAttribute("data-contrast-mode", "dark-text");
    expect(screen.getByText("Bright Card")).toHaveStyle("text-shadow: 0 1px 3px rgba(255,255,255,0.35)");
    expect(screen.getByText("Bright summary")).toHaveStyle("text-shadow: 0 1px 3px rgba(255,255,255,0.35)");
  });

  test("uses light-text mode for darker thumbnails and applies dark text shadow", () => {
    mockUseDominantColor.mockReturnValue({ color: "rgb(10, 20, 30)" });

    render(
      <BookmarkCard
        id="bookmark-dark"
        type="image"
        title="Dark Card"
        summary="Dark summary"
        previewImageUrl="https://example.com/dark.jpg"
        tags={["read later"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("bookmark-card-overlay")).toHaveAttribute("data-contrast-mode", "light-text");
    expect(screen.getByText("Dark Card")).toHaveStyle("text-shadow: 0 1px 4px rgba(0,0,0,0.5)");
    expect(screen.getByText("Dark summary")).toHaveStyle("text-shadow: 0 1px 4px rgba(0,0,0,0.5)");
  });

  test("uses object-contain for document previews", () => {
    render(
      <BookmarkCard
        id="bookmark-document"
        type="document"
        title="Doc Card"
        summary="Doc summary"
        previewImageUrl="https://example.com/doc.jpg"
        tags={["read later"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("bookmark-card-image")).toHaveClass("object-contain");
  });

  test("uses object-contain for file previews", () => {
    render(
      <BookmarkCard
        id="bookmark-file"
        type="file"
        title="File Card"
        summary="File summary"
        previewImageUrl="https://example.com/file.jpg"
        tags={["read later"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("bookmark-card-image")).toHaveClass("object-contain");
  });

  test("keeps object-cover for image previews", () => {
    render(
      <BookmarkCard
        id="bookmark-image"
        type="image"
        title="Image Card"
        summary="Image summary"
        previewImageUrl="https://example.com/image.jpg"
        tags={["read later"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("bookmark-card-image")).toHaveClass("object-cover");
  });

  test("renders structured note preview from note content instead of raw markdown syntax", () => {
    render(
      <BookmarkCard
        id="bookmark-note-content"
        type="note"
        title="Tasks"
        content={"[ ] buy meds\n[x] book flight"}
        tags={["read later"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
      />,
    );

    expect(screen.getByText("buy meds")).toBeInTheDocument();
    expect(screen.getByText("book flight")).toBeInTheDocument();
    expect(screen.queryByText("[ ] buy meds")).not.toBeInTheDocument();
    expect(screen.queryByText("[x] book flight")).not.toBeInTheDocument();
  });

  test("falls back to summary text when note content is empty", () => {
    render(
      <BookmarkCard
        id="bookmark-note-empty"
        type="note"
        title="Fallback Note"
        content=""
        summary="Summary fallback"
        tags={["read later"]}
        onClick={vi.fn()}
        onTagClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Summary fallback")).toBeInTheDocument();
  });
});
