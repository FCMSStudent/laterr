import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useInfiniteScroll } from "@/features/bookmarks/hooks/useInfiniteScroll";

let observerCallback: IntersectionObserverCallback | undefined;
const observe = vi.fn();
const disconnect = vi.fn();

const TestComponent = ({
  loading,
  hasMore,
  onLoadMore,
}: {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) => {
  const { loadMoreRef } = useInfiniteScroll({
    loading,
    hasMore,
    onLoadMore,
  });

  return <div data-testid="sentinel" ref={loadMoreRef} />;
};

describe("useInfiniteScroll", () => {
  beforeEach(() => {
    observe.mockReset();
    disconnect.mockReset();
    observerCallback = undefined;

    Object.defineProperty(globalThis, "IntersectionObserver", {
      writable: true,
      value: vi.fn((callback: IntersectionObserverCallback) => {
        observerCallback = callback;
        return {
          observe,
          disconnect,
          unobserve: vi.fn(),
        };
      }),
    });
  });

  test("triggers onLoadMore when sentinel intersects and more data is available", () => {
    const onLoadMore = vi.fn();
    render(<TestComponent loading={false} hasMore={true} onLoadMore={onLoadMore} />);

    expect(observe).toHaveBeenCalledTimes(1);

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  test("does not trigger onLoadMore while loading", () => {
    const onLoadMore = vi.fn();
    render(<TestComponent loading={true} hasMore={true} onLoadMore={onLoadMore} />);

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
