import { beforeEach, describe, expect, test, vi } from "vitest";
import { createSupabaseMock } from "../helpers/mockSupabase";
import { supabase } from "@/integrations/supabase/client";

const supabaseMock = createSupabaseMock();

import {
  findSimilarItems,
  findSimilarItemsByText,
  getRecommendations,
} from "@/features/bookmarks/utils/semantic-search";

const embedding = Array.from({ length: 1536 }, () => 1);

describe("semantic search utilities", () => {
  beforeEach(() => {
    vi.spyOn(supabase, "from").mockReturnValue(supabaseMock.queryBuilder as never);
    vi.spyOn(supabase, "rpc").mockImplementation(
      supabaseMock.supabase.rpc as unknown as typeof supabase.rpc,
    );
    vi.spyOn(supabase.auth, "getUser").mockImplementation(supabaseMock.auth.getUser);
    vi.spyOn(supabase, "functions", "get").mockReturnValue(supabaseMock.supabase.functions as never);

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    supabaseMock.supabase.rpc.mockReset();
    supabaseMock.supabase.functions.invoke.mockReset();
    supabaseMock.auth.getUser.mockReset();
    supabaseMock.queryBuilder.single.mockReset();
    supabaseMock.queryBuilder.limit.mockReset();
  });

  test("findSimilarItems filters out source item and returns matches", async () => {
    supabaseMock.queryBuilder.single.mockResolvedValue({
      data: { embedding, user_id: "user-1" },
      error: null,
    });
    supabaseMock.supabase.rpc.mockResolvedValue({
      data: [
        { id: "source-item", similarity: 0.99 },
        { id: "other-item", similarity: 0.91 },
      ],
      error: null,
    });

    const result = await findSimilarItems("source-item");
    expect(result).toEqual([{ id: "other-item", similarity: 0.91 }]);
  });

  test("findSimilarItemsByText returns empty when user is unauthenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await findSimilarItemsByText("hello");
    expect(result).toEqual([]);
  });

  test("findSimilarItemsByText rejects invalid embedding dimension", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseMock.supabase.functions.invoke.mockResolvedValue({
      data: { embedding: [1, 2, 3] },
      error: null,
    });

    const result = await findSimilarItemsByText("hello");
    expect(result).toEqual([]);
    expect(supabaseMock.supabase.rpc).not.toHaveBeenCalled();
  });

  test("getRecommendations returns empty when no authenticated user", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getRecommendations();
    expect(result).toEqual([]);
  });
});
