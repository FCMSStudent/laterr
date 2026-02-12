import type { Item, ItemType } from "@/features/bookmarks/types";

type ItemOverrides = Partial<Item>;

export const createItemFixture = (overrides?: ItemOverrides): Item => {
  const type = (overrides?.type ?? "url") as ItemType;
  return {
    id: overrides?.id ?? "item-1",
    user_id: overrides?.user_id ?? "user-1",
    type,
    title: overrides?.title ?? "Example item",
    content: overrides?.content ?? "https://example.com",
    summary: overrides?.summary ?? "Example summary",
    user_notes: overrides?.user_notes ?? null,
    tags: overrides?.tags ?? ["read later"],
    preview_image_url: overrides?.preview_image_url ?? null,
    embedding: overrides?.embedding ?? null,
    created_at: overrides?.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: overrides?.updated_at,
    deleted_at: overrides?.deleted_at ?? null,
  };
};
