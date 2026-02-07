## 2025-05-15 - [Batching Signed URLs]
**Learning:** Supabase storage `createSignedUrl` calls in a loop (even via `Promise.all`) are a major network bottleneck for list views. The Supabase SDK provides `createSignedUrls` (plural) which can fetch multiple signed URLs in a single round-trip.
**Action:** Always check if multiple storage objects need signed URLs simultaneously and use the batch API (`createSignedUrls`) with key deduplication.
