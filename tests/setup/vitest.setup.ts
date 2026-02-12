import { randomUUID } from "node:crypto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.useRealTimers();
});

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID,
    },
    configurable: true,
  });
} else if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: randomUUID,
    configurable: true,
  });
}

if (!globalThis.matchMedia) {
  Object.defineProperty(globalThis, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

class MockIntersectionObserver {
  public disconnect = vi.fn();
  public observe = vi.fn();
  public unobserve = vi.fn();

  constructor(public callback: IntersectionObserverCallback) {}
}

class MockResizeObserver {
  public disconnect = vi.fn();
  public observe = vi.fn();
  public unobserve = vi.fn();
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

if (!globalThis.URL.createObjectURL) {
  Object.defineProperty(globalThis.URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:mock-url"),
  });
}

if (!globalThis.URL.revokeObjectURL) {
  Object.defineProperty(globalThis.URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  });
}

if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
    configurable: true,
  });
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
