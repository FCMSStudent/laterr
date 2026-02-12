import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

import { FilterBar, MobileFilterSortButton } from "@/features/bookmarks/components/FilterBar";

describe("FilterBar", () => {
  test("renders active filters and clears them", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();

    render(
      <FilterBar
        selectedTag="read later"
        selectedSort="date-desc"
        selectedTypeFilter="url"
        onTagSelect={vi.fn()}
        onSortChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onClearAll={onClearAll}
      />,
    );

    expect(screen.getByText("Active Filters:")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Clear All/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  test("mobile filter button shows active count badge", () => {
    render(
      <MobileFilterSortButton
        selectedTag="read later"
        selectedTypeFilter="url"
        selectedSort="date-desc"
        onTagSelect={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
