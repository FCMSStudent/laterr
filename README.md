# Laterr Garden

A beautiful, modern digital garden application for organizing and discovering your content with AI-powered semantic search.

## ✨ Features

- 📝 **Content Management**: Save URLs, notes, images, videos, and documents
- 🔍 **Semantic Search**: AI-powered search to find related content by meaning
- 🎨 **Beautiful UI**: Apple-inspired glassmorphism design with dark mode
- 🤖 **Smart Recommendations**: Personalized content suggestions
- 📱 **Responsive**: Works great on desktop, tablet, and mobile

## 🚀 Quick Start

### Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for backend)
- OpenAI API key (for embeddings)

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```

2. Configure the following required environment variables in `.env`:
   - `VITE_SUPABASE_URL` - Your Supabase project URL (from Supabase Dashboard > Settings > API)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key (from Supabase Dashboard > Settings > API)
   - `LOVABLE_API_KEY` - Your OpenAI API key (required for edge functions that generate embeddings and analyze content)

**Important**: All three variables are required for the application to function properly. Without them, you will see errors when trying to add items to your collection.

## 🛠 Technologies

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI Embeddings, pgvector
- **State Management**: TanStack Query
- **Hosting**: Lovable AI platform

See [Architecture Documentation](docs/ARCHITECTURE.md) for detailed component breakdown.

## 📚 Documentation

All documentation has been organized in the [`/docs`](docs/) folder by category:

- **[Documentation Index](docs/README.md)** - Complete navigation guide

### Quick Links by Role
- **New Users:** [Troubleshooting Guide](docs/getting-started/TROUBLESHOOTING.md)
- **Developers:** [Architecture](docs/architecture/ARCHITECTURE.md) • [Testing](docs/development/TESTING.md) • [Roadmap](docs/development/ROADMAP.md)
- **Designers:** [Design System](docs/architecture/DESIGN_SYSTEM.md) • [UI/UX Feedback](docs/design/UI_UX_FEEDBACK.md)

## 🎨 Design System

The application uses a comprehensive design system with:
- WCAG AA compliant color palette
- Responsive typography with Inter font
- Consistent 4px spacing scale
- Accessible focus indicators

See [Design System Documentation](docs/DESIGN_SYSTEM.md) for details.

## 🔧 Project Structure

```
├── docs/               # All documentation
├── public/             # Static assets
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # External service integrations
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   ├── styles/         # Global styles
│   └── types/          # TypeScript types
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # Database migrations
└── ...
```

## 🌐 Deployment

### Current Setup (Lovable + Supabase)

This project is designed to work with [Lovable](https://lovable.dev):

1. Visit [Lovable Project](https://lovable.dev/projects/28683ca3-713b-4aac-a657-44ab3b98e337)
2. Click Share → Publish
3. Configure custom domain in Project > Settings > Domains



## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes following the design system guidelines
3. Test your changes thoroughly
4. Submit a pull request

## 📄 License

Private project - All rights reserved

## 🔗 Links

- **Project**: https://lovable.dev/projects/28683ca3-713b-4aac-a657-44ab3b98e337
- **Documentation**: [/docs](docs/) - Complete documentation index
- **Design System**: [Design System Guide](docs/architecture/DESIGN_SYSTEM.md)

