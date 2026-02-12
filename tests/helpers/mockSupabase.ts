import { vi } from "vitest";

type QueryResult<T = unknown> = Promise<{ data: T; error: unknown }>;

export const createSupabaseMock = () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  };

  const storageBucket = {
    createSignedUrl: vi.fn<(...args: unknown[]) => QueryResult<{ signedUrl: string | null }>>(),
    createSignedUrls: vi.fn<(...args: unknown[]) => QueryResult<Array<{ path?: string; signedUrl?: string | null; error?: unknown }>>>(),
    upload: vi.fn<(...args: unknown[]) => QueryResult<null>>(),
    remove: vi.fn<(...args: unknown[]) => QueryResult<null>>(),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/public.jpg" } }),
  };

  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  const supabase = {
    from: vi.fn().mockReturnValue(queryBuilder),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn().mockReturnValue(storageBucket),
    },
    auth,
  };

  return {
    supabase,
    queryBuilder,
    storageBucket,
    auth,
  };
};
