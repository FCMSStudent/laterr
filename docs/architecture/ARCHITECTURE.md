# Architecture Overview

This document clarifies the responsibilities and components of the Laterr Garden application, specifically detailing what Supabase and Lovable AI handle in the system architecture.

## Table of Contents

- [System Overview](#system-overview)
- [Supabase Components](#supabase-components)
- [Lovable AI Components](#lovable-ai-components)
- [Technology Stack](#technology-stack)
- [Data Flow](#data-flow)
- [Deployment Pipeline](#deployment-pipeline)

## System Overview

Laterr Garden is a full-stack digital garden application that uses:
- **Supabase** as the backend infrastructure (database, storage, serverless functions)
- **Lovable AI** as the frontend hosting and deployment platform
- **React + TypeScript** for the frontend application
- **OpenAI** for AI-powered features (embeddings, semantic search)

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTPS
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                      Lovable AI Platform                     │
│  - Hosts React Frontend                                      │
│  - Serves Static Assets                                      │
│  - Handles Deployment Pipeline                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ API Calls (Supabase Client)
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Supabase Platform                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ PostgreSQL Database (with pgvector)                 │    │
│  │ - Tables: items, categories, tag_icons              │    │
│  │ - Vector embeddings for semantic search             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Storage                                              │    │
│  │ - Images, files, videos                              │    │
│  │ - Generated thumbnails                               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Edge Functions (Deno)                                │    │
│  │ - analyze-url                                        │    │
│  │ - analyze-image                                      │    │
│  │ - analyze-file                                       │    │
│  │ - generate-embedding                                 │    │
│  │ - generate-tag-icon                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Authentication                                       │    │
│  │ - Row Level Security (RLS)                           │    │
│  │ - Public access policies (currently)                 │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Supabase Components

Supabase provides the complete backend infrastructure for Laterr Garden:

### 1. Database (PostgreSQL with pgvector)

**Purpose**: Stores all application data with vector search capabilities

**Tables**:
- `items` - URLs, notes, images, videos, and documents
  - Fields: id, type, title, content, summary, tags, category_id, preview_image_url, user_notes, embedding, created_at, updated_at
- `categories` - Organization categories
  - Fields: id, name, color, created_at
- `tag_icons` - AI-generated custom icons for tags
  - Fields: id, tag_name, icon_url, created_at

**Features**:
- pgvector extension for semantic search via embeddings
- Full-text search capabilities
- JSONB support for flexible metadata
- Array types for tags

**Configuration**: See `supabase/migrations/` for schema definitions

### 2. Storage

**Purpose**: Manages file uploads and serves media assets

**Buckets**:
- Image uploads (user-uploaded images)
- Generated thumbnails
- Video files
- Document files

**Features**:
- Automatic thumbnail generation
- Presigned URLs for secure access
- CDN integration for fast delivery

### 3. Edge Functions (Serverless)

**Purpose**: Backend logic and AI processing

**Functions**:

#### `analyze-url`
- Fetches and analyzes web pages
- Extracts metadata (title, description, images)
- Uses Mozilla Readability for content extraction
- Generates summaries using OpenAI
- **Triggers**: When user adds a URL to their garden

#### `analyze-image`
- Analyzes image content using OpenAI Vision
- Generates descriptions and tags
- Extracts embedded text
- **Triggers**: When user uploads an image

#### `analyze-file`
- Processes document files (PDF, text, etc.)
- Extracts text content
- Generates summaries
- **Triggers**: When user uploads a document

#### `generate-embedding`
- Creates vector embeddings for semantic search
- Uses OpenAI's text-embedding-3-small model
- Combines title, summary, tags, and extracted text
- **Triggers**: After content analysis completes

#### `generate-tag-icon`
- Generates custom SVG icons for tags
- Uses AI to create contextual visual representations
- **Triggers**: When a new tag is created

**Runtime**: Deno (TypeScript)

**Environment Variables**:
- `LOVABLE_API_KEY` - OpenAI API key for AI features

### 4. Authentication

**Current Implementation**: Public access with Row Level Security (RLS) enabled

**Policies**:
- All tables have public read/write access
- RLS is enabled but policies allow unrestricted access
- Configuration in: `src/integrations/supabase/client.ts`

**Auth Features Available**:
- Session persistence via localStorage
- Auto token refresh
- Ready for future user authentication implementation

**Future**: Can be extended to support user-specific data isolation

## Lovable AI Components

Lovable AI provides the frontend hosting and deployment infrastructure:

### 1. Hosting

**Purpose**: Serves the React application to users

**Features**:
- Global CDN for fast content delivery
- HTTPS by default
- Custom domain support
- Automatic SSL certificate management

**URL**: https://lovable.dev/projects/28683ca3-713b-4aac-a657-44ab3b98e337

### 2. Frontend Application

**What's Hosted**:
- React 18 application
- TypeScript codebase
- Vite-bundled static assets
- CSS (Tailwind) and JavaScript bundles
- Public assets (images, fonts, etc.)

**Build Output**: Static files from `npm run build` (Vite)

### 3. Deployment Pipeline

**Process**:
1. Code changes pushed to repository
2. Lovable detects changes
3. Runs `npm run build`
4. Deploys to CDN
5. Live in seconds

**Deployment Methods**:
- Click "Publish" in Lovable dashboard
- Automatic deployment on repository updates (if configured)
- Manual deployment via Lovable CLI

**Configuration**: Custom domain settings in Project > Settings > Domains

### 4. Development Tools

**lovable-tagger**:
- Development plugin for component tagging
- Helps track component usage
- Only active in development mode
- Configuration in `vite.config.ts`

**Features**:
- Component identification
- Usage analytics
- Development debugging

## Technology Stack

### Frontend (Hosted on Lovable AI)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **UI Library**: shadcn/ui (Radix UI components)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Form Handling**: React Hook Form with Zod validation

### Backend (Supabase)
- **Database**: PostgreSQL 15+ with pgvector
- **Functions**: Deno runtime (TypeScript)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth (configured but using public access)

### External Services
- **AI/ML**: OpenAI API
  - GPT models for content analysis
  - text-embedding-3-small for embeddings
  - Vision API for image analysis

## Data Flow

### Adding a URL to the Garden

```
1. User submits URL in React app (Lovable-hosted)
   ↓
2. Frontend calls Supabase Edge Function: analyze-url
   ↓
3. Edge function:
   - Fetches the URL content
   - Extracts metadata and text
   - Calls OpenAI for summary
   ↓
4. Frontend calls generate-embedding edge function
   ↓
5. Embedding function:
   - Combines title, summary, tags
   - Calls OpenAI for vector embedding
   ↓
6. Frontend stores data in Supabase database:
   - Item record with content
   - Vector embedding for search
   ↓
7. UI updates with new item (React Query refetch)
```

### Semantic Search Flow

```
1. User types search query in React app
   ↓
2. Frontend calls generate-embedding for query
   ↓
3. Embedding function returns query vector
   ↓
4. Frontend queries Supabase database:
   - Uses pgvector similarity search
   - Compares query embedding with item embeddings
   ↓
5. Database returns ranked results
   ↓
6. UI displays semantically similar items
```

## Deployment Pipeline

### Development Workflow

```
Local Development → Git Push → Lovable Build → Production
```

**Steps**:

1. **Local Development**
   ```bash
   npm install          # Install dependencies
   npm run dev          # Start dev server (localhost:8080)
   npm run lint         # Check code quality
   npm run build        # Test production build
   ```

2. **Code Changes**
   - Edit files in `src/`
   - Test locally
   - Commit to Git branch

3. **Deployment**
   - Push to GitHub repository
   - Open Lovable project
   - Click "Share" → "Publish"
   - Or configure auto-deployment

4. **Production**
   - Lovable builds with `npm run build`
   - Deploys to CDN
   - Live on custom domain

### Environment Variables

**Required for Production** (configured in Lovable):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase public API key

**Required for Supabase Edge Functions**:
- `LOVABLE_API_KEY` - OpenAI API key (set in Supabase dashboard)

**Local Development** (`.env` file):
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
LOVABLE_API_KEY=your_openai_api_key
```

### Build Configuration

**vite.config.ts**:
- Code splitting for optimal loading
- Vendor chunks separated (React, UI, Supabase, Utils)
- Tree shaking for smaller bundles
- Lovable-tagger integration for development

## Security Considerations

### Current Setup
- Public database access (via RLS policies)
- No user authentication required
- Edge functions validate input data
- CORS headers configured for cross-origin requests

### Security Features
- Row Level Security (RLS) enabled on all tables
- Input validation in edge functions
- URL validation to prevent SSRF attacks
- Private IP blocking in analyze-url function
- HTTPS encryption for all connections

### Future Enhancements
- User authentication with Supabase Auth
- Per-user data isolation
- API rate limiting
- Enhanced input sanitization

## Troubleshooting

### Common Issues

**Build fails on Lovable**:
- Check environment variables are set
- Ensure dependencies are in package.json
- Verify no TypeScript errors locally

**Edge functions not working**:
- Check LOVABLE_API_KEY is set in Supabase
- Verify function logs in Supabase dashboard
- Test function endpoints manually

**Database connection issues**:
- Verify VITE_SUPABASE_URL is correct
- Check VITE_SUPABASE_PUBLISHABLE_KEY
- Review network tab for API errors

**Embeddings not generating**:
- Confirm OpenAI API key is valid
- Check OpenAI API quota/usage
- Review edge function logs

## Related Documentation

- [Main README](../README.md) - Project overview and quick start
- [Design System](DESIGN_SYSTEM.md) - UI/UX guidelines
- [Embeddings Guide](EMBEDDINGS_GUIDE.md) - Semantic search details
- [Contributing](../CONTRIBUTING.md) - Development workflow
- [Testing Checklist](TESTING_CHECKLIST.md) - QA procedures

## Summary

**Supabase handles**: Backend infrastructure
- ✅ Database (PostgreSQL with pgvector)
- ✅ Storage (images, files, videos)
- ✅ Edge Functions (AI processing, content analysis)
- ✅ Authentication (configured but using public access)

**Lovable AI handles**: Frontend infrastructure
- ✅ Hosting (global CDN)
- ✅ Frontend deployment pipeline
- ✅ Build process (Vite)
- ✅ Development tools (lovable-tagger)

**Integration**: React app (Lovable) → Supabase Client SDK → Supabase Backend

This architecture provides a modern, scalable foundation for the digital garden application with AI-powered features.
