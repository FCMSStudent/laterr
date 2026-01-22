# Integrations

External service integrations and API clients.

## Structure

```
integrations/
└── supabase/        # Supabase integration
```

## Overview

This directory contains integrations with external services and APIs. Each integration is organized in its own folder with client setup, configuration, and helper functions.

## Supabase Integration

### Files
- **client.ts** - Supabase client initialization
- **types.ts** - Database types and interfaces
- **auth.ts** - Authentication helpers
- **storage.ts** - File storage helpers
- **queries.ts** - Common database queries

### Usage

```tsx
import { supabase } from '@/integrations/supabase/client';

// Query data
const { data, error } = await supabase
  .from('bookmarks')
  .select('*')
  .eq('user_id', userId);

// Insert data
const { data, error } = await supabase
  .from('bookmarks')
  .insert({ title: 'New Bookmark' });

// Upload file
const { data, error } = await supabase
  .storage
  .from('documents')
  .upload('path/to/file', file);
```

## Adding New Integrations

When adding a new external service integration:

1. **Create a folder**: `integrations/service-name/`
2. **Add client setup**: Initialize the service client
3. **Add types**: Define TypeScript types for the service
4. **Add helpers**: Create helper functions for common operations
5. **Document usage**: Add examples and documentation

### Example Structure

```
integrations/
└── my-service/
    ├── client.ts           # Service client initialization
    ├── types.ts            # TypeScript types
    ├── api.ts              # API methods
    ├── hooks.ts            # React hooks (optional)
    └── README.md           # Service-specific documentation
```

## Best Practices

### 1. Environment Variables
Store API keys and secrets in environment variables:

```typescript
const apiKey = import.meta.env.VITE_SERVICE_API_KEY;
```

### 2. Error Handling
Implement consistent error handling:

```typescript
try {
  const result = await serviceClient.doSomething();
  return { data: result, error: null };
} catch (error) {
  return { data: null, error: error.message };
}
```

### 3. Type Safety
Use TypeScript for all integration code:

```typescript
interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

async function fetchData(): Promise<ServiceResponse<Data>> {
  // ...
}
```

### 4. Abstraction
Abstract service-specific details behind clean interfaces:

```typescript
// Good - Clean interface
export async function uploadFile(file: File): Promise<string> {
  // Service-specific implementation hidden
}

// Avoid - Exposing service details
export function getSupabaseClient() {
  return supabase; // Leaks implementation
}
```

### 5. Configuration
Centralize configuration:

```typescript
export const serviceConfig = {
  apiUrl: import.meta.env.VITE_SERVICE_URL,
  timeout: 30000,
  retries: 3,
};
```

## Common Integrations

### Supabase
- Database (PostgreSQL)
- Authentication
- File storage
- Real-time subscriptions
- Edge functions

### Potential Future Integrations
- Payment processing (Stripe)
- Email service (SendGrid, Resend)
- Analytics (Mixpanel, Amplitude)
- Search (Algolia, Meilisearch)
- AI services (OpenAI, Anthropic)

## Security Considerations

1. **Never commit secrets** - Use environment variables
2. **Validate input** - Sanitize data before sending to services
3. **Handle errors gracefully** - Don't expose sensitive error details
4. **Rate limiting** - Implement rate limiting for API calls
5. **Authentication** - Ensure proper authentication for all requests

## Testing

Test integrations with:
- Mock clients for unit tests
- Test environments for integration tests
- Error scenario testing
- Rate limit handling

```typescript
// Example mock
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
  })),
};
```
