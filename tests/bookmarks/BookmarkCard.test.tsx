import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { BookmarkCard } from "@/features/bookmarks/components/BookmarkCard";

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/shared/hooks/useDominantColor", () => ({
  useDominantColor: () => ({ color: "rgb(10, 20, 30)" }),
}));

describe("BookmarkCard", () => {
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
});
