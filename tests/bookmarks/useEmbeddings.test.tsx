import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createSupabaseMock } from "../helpers/mockSupabase";
import { supabase } from "@/lib/supabase/client";

const supabaseMock = createSupabaseMock();

const getGenerateEmbeddingErrorMessage = vi.hoisted(() =>
  vi.fn(() => "Unable to generate embedding right now."),
);

vi.mock("@/shared/lib/error-messages", () => ({
  getGenerateEmbeddingErrorMessage,
}));

import { useEmbeddings } from "@/features/bookmarks/hooks/useEmbeddings";

const validEmbedding = Array.from({ length: 1536 }, () => 0.1);

describe("useEmbeddings hook", () => {
  beforeEach(() => {
    vi.spyOn(supabase, "functions", "get").mockReturnValue(supabaseMock.supabase.functions as never);

    getGenerateEmbeddingErrorMessage.mockClear();
    supabaseMock.supabase.functions.invoke.mockReset();
  });

  test("generateEmbedding resolves valid embedding and clears error", async () => {
    supabaseMock.supabase.functions.invoke.mockResolvedValue({
      data: { embedding: validEmbedding },
      error: null,
    });

    const { result } = renderHook(() => useEmbeddings());

    let output: number[] | null = null;
    await act(async () => {
      output = await result.current.generateEmbedding("Title", "Summary", ["read later"], "text");
    });

    expect(output).toHaveLength(1536);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test("generateEmbedding maps function errors to user-facing message", async () => {
    supabaseMock.supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { status: 503, code: "SERVICE_UNAVAILABLE" },
    });
    getGenerateEmbeddingErrorMessage.mockReturnValue("Service temporarily unavailable.");

    const { result } = renderHook(() => useEmbeddings());

    let output: number[] | null = null;
    await act(async () => {
      output = await result.current.generateEmbedding("Title", "Summary", ["read later"], "text");
    });

    expect(output).toBeNull();
    expect(result.current.error).toBe("Service temporarily unavailable.");
    expect(result.current.loading).toBe(false);
  });
});
