# Laterr Codebase Documentation

## Overview

**Laterr** is a modern web application built with React, TypeScript, and Vite, featuring a comprehensive system for managing bookmarks, health data, and subscriptions. The application uses Supabase as its backend and provides a rich user interface with advanced features like semantic search, AI-powered analysis, and document processing.

## Technology Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19
- **UI Library**: Radix UI components
- **Styling**: Tailwind CSS 3.4.17
- **Routing**: React Router DOM 6.30.1
- **State Management**: TanStack Query (React Query) 5.83.0
- **Forms**: React Hook Form 7.61.1
- **Charts**: Recharts 2.15.4
- **Notifications**: Sonner 1.7.4

### Backend
- **Database & Auth**: Supabase 2.76.1
- **Edge Functions**: Deno-based Supabase Functions

### Development Tools
- **Linting**: ESLint 9.32.0
- **Testing**: Playwright 1.57.0
- **Package Manager**: npm (with bun.lockb also present)

## Project Structure

```
laterr/
├── public/                    # Static assets
│   ├── favicon.ico
│   ├── manifest.json         # PWA manifest
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/                      # Source code
│   ├── features/             # Feature-based modules
│   │   ├── bookmarks/        # Bookmark management
│   │   ├── health/           # Health tracking
│   │   └── subscriptions/    # Subscription management
│   │
│   ├── integrations/         # External service integrations
│   │   └── supabase/         # Supabase client and types
│   │
│   ├── pages/                # Route pages
│   │   ├── Auth.tsx
│   │   ├── Bookmarks.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Health.tsx
│   │   ├── Landing.tsx
│   │   ├── NotFound.tsx
│   │   ├── Subscriptions.tsx
│   │   └── ViewerLoadingTest.tsx
│   │
│   ├── shared/               # Shared resources
│   │   ├── components/       # Reusable components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility libraries
│   │   └── types/            # TypeScript type definitions
│   │
│   ├── styles/               # Additional styles
│   │   └── gradient.css
│   │
│   ├── App.tsx               # Main application component
│   ├── App.css               # App-level styles
│   ├── index.css             # Global styles
│   ├── main.tsx              # Application entry point
│   └── vite-env.d.ts         # Vite environment types
│
├── supabase/                 # Supabase configuration
│   ├── config.toml           # Supabase project config
│   ├── functions/            # Edge functions
│   │   ├── _shared/          # Shared utilities
│   │   ├── analyze-file/     # File analysis
│   │   ├── analyze-image/    # Image analysis
│   │   ├── analyze-url/      # URL analysis
│   │   ├── extract-health-data/  # Health data extraction
│   │   ├── generate-embedding/   # Vector embeddings
│   │   ├── generate-tag-icon/    # Icon generation
│   │   └── health-chat/      # AI health chat
│   │
│   └── migrations/           # Database migrations
│       └── *.sql             # SQL migration files
│
├── Configuration Files
├── .env                      # Environment variables (gitignored)
├── .gitignore                # Git ignore rules
├── components.json           # shadcn/ui configuration
├── eslint.config.js          # ESLint configuration
├── index.html                # HTML entry point
├── package.json              # npm dependencies and scripts
├── package-lock.json         # npm lock file
├── bun.lockb                 # Bun lock file
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript base config
├── tsconfig.app.json         # TypeScript app config
├── tsconfig.node.json        # TypeScript node config
└── vite.config.ts            # Vite configuration
```

## Core Features

### 1. Bookmarks Feature (`src/features/bookmarks/`)
Comprehensive bookmark management system with advanced capabilities:

#### Components
- **AddItemModal.tsx**: Add new bookmarks
- **BookmarkCard.tsx**: Individual bookmark card display
- **BulkActionsBar.tsx**: Bulk operations on bookmarks
- **ChecklistItem.tsx** & **ChecklistProgress.tsx**: Checklist functionality
- **DetailViewModal.tsx**: Detailed bookmark view
- **EditItemModal.tsx**: Edit bookmark details
- **FilterBar.tsx**: Filter bookmarks by various criteria
- **ItemCard.tsx** & **ItemListRow.tsx**: Different bookmark display modes
- **NoteEditorModal.tsx** & **RichNotesEditor.tsx**: Rich text note editing
- **NotePreview.tsx**: Display notes
- **ThumbnailPreview.tsx**: Generate and show thumbnails

#### Document Viewers
- **PDFPreview.tsx**: PDF document viewer
- **DOCXPreview.tsx**: Word document viewer
- **VideoPreview.tsx**: Video player
- **ViewerShell.tsx**: Unified viewer container

#### Utilities
- **notes-parser.ts**: Parse and process notes
- **semantic-search.ts**: AI-powered semantic search
- **thumbnail-generator.ts**: Generate thumbnails
- **video-utils.ts**: Video processing utilities

#### Hooks
- **useEmbeddings.ts**: Manage vector embeddings
- **useInfiniteScroll.ts**: Infinite scroll pagination

### 2. Health Feature (`src/features/health/`)
Health data tracking and analysis system:

#### Components
- **AddHealthDocumentModal.tsx**: Upload health documents
- **AddMeasurementModal.tsx**: Add health measurements
- **EmbeddingBackfillDialog.tsx**: Backfill embeddings
- **ExtractedHealthDataDisplay.tsx**: Display extracted data
- **FloatingAIChatButton.tsx**: AI chat interface
- **HealthChartPanel.tsx**: Health data visualization
- **HealthChatPanel.tsx**: Chat panel for health queries
- **HealthDocumentCard.tsx** & **HealthDocumentDetailModal.tsx**: Document management
- **HealthSpeedDial.tsx**: Quick action menu
- **InlineHealthStats.tsx**: Statistics display
- **MeasurementCard.tsx** & **MeasurementDetailModal.tsx**: Measurement management
- **MeasurementGroup.tsx**: Group related measurements
- **RecommendationsPanel.tsx**: Health recommendations

#### Utilities
- **embedding-backfill.ts**: Backfill vector embeddings
- **health-utils.ts**: Health-specific utilities

#### Hooks
- **useHealthDocuments.ts**: Manage health documents

### 3. Subscriptions Feature (`src/features/subscriptions/`)
Subscription tracking and management:

#### Components
- **AddSubscriptionModal.tsx**: Add new subscriptions
- **CollapsibleStatsSummary.tsx**: Statistics summary
- **EditSubscriptionModal.tsx**: Edit subscriptions
- **StatusFilterTabs.tsx**: Filter by status
- **SubscriptionCard.tsx**: Individual subscription card
- **SubscriptionDetailModal.tsx**: Detailed subscription view
- **SubscriptionListRow.tsx**: List row display

#### Utilities
- **currency-utils.ts**: Currency formatting and conversion

### 4. Shared Components (`src/shared/components/`)

#### Application Components
- **ActivityFeedCard.tsx**: Activity feed display
- **Breadcrumbs.tsx**: Navigation breadcrumbs
- **CollapsibleSummary.tsx**: Collapsible summary sections
- **CompactListRow.tsx**: Compact list item
- **DashboardWidget.tsx**: Dashboard widgets
- **GradientBackground.tsx**: Gradient backgrounds
- **LoadingSpinner.tsx**: Loading indicator
- **MobileBottomNav.tsx**: Mobile navigation
- **ModuleNavigationCard.tsx**: Module navigation
- **NavigationHeader.tsx**: Header navigation
- **QuickStatsGrid.tsx**: Statistics grid
- **RecentlyViewedSection.tsx**: Recently viewed items
- **SearchBar.tsx**: Global search

#### UI Components (`ui/`)
Complete shadcn/ui component library including:
- Accordion, Alert Dialog, Alert, Avatar, Badge
- Breadcrumb, Button, Calendar, Card, Carousel
- Chart, Checkbox, Collapsible, Command, Context Menu
- Dialog, Drawer, Dropdown Menu, Form, Hover Card
- Icon Button, Input, Input OTP, Label, Loading Button
- Menubar, Navigation Menu, Pagination, Popover
- Progress, Radio Group, Resizable, Scroll Area
- Select, Separator, Sheet, Sidebar, Skeleton
- Slider, Sonner, Switch, Table, Tabs
- Textarea, Toast, Toaster, Toggle, Toggle Group
- Tooltip

### 5. Shared Hooks (`src/shared/hooks/`)
- **use-form-field.ts**: Form field utilities
- **use-mobile.tsx**: Mobile detection
- **use-sidebar.ts**: Sidebar state management
- **use-toast.ts**: Toast notifications
- **useDashboardStats.ts**: Dashboard statistics
- **useDebounce.ts**: Debounce utility
- **useGlassIntensity.ts**: Glass morphism effects
- **useProgressiveDisclosure.ts**: Progressive UI disclosure
- **useRecentlyViewed.ts**: Recently viewed items tracking
- **useRipple.ts**: Ripple effects
- **useUnifiedActivity.ts**: Unified activity feed

### 6. Shared Libraries (`src/shared/lib/`)
- **error-messages.ts**: Error message definitions
- **error-utils.ts**: Error handling utilities
- **supabase-utils.ts**: Supabase helper functions
- **ui-utils.ts**: UI utility functions
- **utils.ts**: General utilities

## Supabase Edge Functions

### Available Functions
1. **analyze-file**: Analyze uploaded files (PDFs, DOCX, etc.)
2. **analyze-image**: Process and analyze images
3. **analyze-url**: Extract and analyze URL content
4. **extract-health-data**: Extract structured health data from documents
5. **generate-embedding**: Create vector embeddings for semantic search
6. **generate-tag-icon**: Generate icons for tags
7. **health-chat**: AI-powered health chat assistant

### Shared Utilities
- **metadata-utils.ts**: Common metadata processing functions

## Database Migrations

The application uses Supabase migrations for database schema management:
- 10 migration files tracking database evolution
- Includes embedding support, video support, and unified activity feed
- Located in `supabase/migrations/`

## Configuration Files

### Build & Development
- **vite.config.ts**: Vite build configuration
- **tsconfig.json**: TypeScript compiler base configuration
- **tsconfig.app.json**: App-specific TypeScript settings
- **tsconfig.node.json**: Node-specific TypeScript settings
- **eslint.config.js**: ESLint linting rules

### Styling
- **tailwind.config.ts**: Tailwind CSS configuration
- **postcss.config.js**: PostCSS configuration
- **components.json**: shadcn/ui components configuration

### Other
- **package.json**: npm dependencies and scripts
- **.gitignore**: Git ignore patterns
- **.env**: Environment variables (not tracked)
- **supabase/config.toml**: Supabase project configuration

## Available Scripts

From `package.json`:

- `npm run dev`: Start development server
- `npm run build`: Production build
- `npm run build:dev`: Development build
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build
- `npm run screenshots`: Run Playwright screenshot tests
- `npm run screenshots:ui`: Run Playwright tests with UI
- `npm run playwright:install`: Install Playwright browsers

## Key Features & Technologies

### Document Processing
- PDF viewing with react-pdf
- DOCX viewing with mammoth
- Video playback
- Thumbnail generation with html2canvas

### AI & Search
- Vector embeddings for semantic search
- AI-powered content analysis
- Health data extraction
- Intelligent chat assistant

### UI/UX
- Responsive design with mobile-first approach
- Glass morphism effects
- Dark mode support (next-themes)
- Progressive Web App (PWA) support
- Rich text editing
- Infinite scroll
- Advanced filtering and search

### Data Management
- Real-time data with Supabase
- Optimistic updates
- Caching with TanStack Query
- Form validation with Zod
- Type-safe database queries

## Development Guidelines

### Code Organization
- Feature-based architecture for scalability
- Shared components for reusability
- Custom hooks for logic reuse
- Type-safe with TypeScript
- Consistent component patterns

### Styling Approach
- Tailwind CSS utility-first
- shadcn/ui component system
- Custom gradient backgrounds
- Glass morphism effects
- Responsive design patterns

### State Management
- TanStack Query for server state
- React Hook Form for form state
- Local state with useState/useReducer
- Context for global UI state

## Security & Best Practices
- Environment variables for sensitive data
- Type safety throughout
- Input validation with Zod
- Sanitization with DOMPurify
- ESLint for code quality
- Git ignore for secrets and build artifacts

---

**Last Updated**: January 2026
**Version**: 0.0.0 (Development)
