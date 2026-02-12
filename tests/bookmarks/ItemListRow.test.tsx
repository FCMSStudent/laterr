import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ItemListRow } from "@/features/bookmarks/components/ItemListRow";

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

describe("ItemListRow", () => {
  test("opens item on keyboard enter", () => {
    const onClick = vi.fn();
    render(
      <ItemListRow
        id="row-1"
        type="url"
        title="Example"
        summary="Example summary"
        tags={["read later"]}
        createdAt="2026-01-01T00:00:00.000Z"
        onClick={onClick}
        onTagClick={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole("article"), { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("row-1");
  });

  test("filters by tag when tag badge is clicked", () => {
    const onTagClick = vi.fn();
    render(
      <ItemListRow
        id="row-2"
        type="url"
        title="Example"
        summary="Example summary"
        tags={["read later", "work"]}
        createdAt="2026-01-01T00:00:00.000Z"
        onClick={vi.fn()}
        onTagClick={onTagClick}
      />,
    );

    fireEvent.click(screen.getByText("#work"));
    expect(onTagClick).toHaveBeenCalledWith("work");
  });
});
