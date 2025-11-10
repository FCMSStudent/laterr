# Contributing to Laterr Garden

Thank you for your interest in contributing to Laterr Garden! This guide will help you understand the project structure and development workflow.

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- A Supabase account
- OpenAI API key (for embeddings)

### Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Run `npm install`
4. Run `npm run dev`

## Project Structure

```
├── docs/                    # All project documentation
│   ├── README.md           # Documentation index
│   ├── DESIGN_SYSTEM.md    # Design guidelines
│   └── ...                 # Other technical docs
├── public/                  # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui base components
│   │   └── *.tsx          # Custom feature components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components
│   ├── styles/            # Global styles
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
└── ...config files
```

## Development Workflow

### 1. Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes following our guidelines below
3. Test your changes: `npm run build` and `npm run lint`
4. Commit your changes with clear messages

### 2. Code Style

#### Design System
Follow the [Design System](docs/DESIGN_SYSTEM.md) guidelines for:
- **Colors**: Use defined CSS variables from the color system
- **Typography**: Use the established type scale
- **Spacing**: Follow the 4px base unit system
- **Components**: Follow button guidelines and component patterns

#### TypeScript
- Avoid using `any` types
- Define proper interfaces and types
- Use type inference where possible
- Document complex types

#### React
- Use functional components with hooks
- Follow React best practices
- Keep components focused and single-responsibility
- Use proper prop typing

#### Tailwind CSS
- Use utility classes consistently
- Follow spacing conventions (gap-6 for cards, gap-3 for tags, etc.)
- Use responsive design classes
- Leverage the design system variables

### 3. Adding New Features

#### New Components
1. Place UI components in `src/components/ui/` (if shadcn-based)
2. Place feature components in `src/components/`
3. Add proper TypeScript types
4. Follow the design system guidelines
5. Test on desktop and mobile

#### New Pages
1. Add page components to `src/pages/`
2. Update routing in the App component
3. Follow existing page patterns
4. Test navigation flow

#### New API Integrations
1. Add to `src/integrations/` or `src/lib/`
2. Handle errors gracefully
3. Add loading states
4. Document API usage

### 4. Documentation

When adding features:
- Update relevant docs in `/docs` folder
- Add examples and usage guidelines
- Update `docs/README.md` if adding new docs
- Keep the main README.md focused and concise

### 5. Testing

Before submitting:
- [ ] Build succeeds: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Manual testing in dev mode
- [ ] Test on different screen sizes
- [ ] Check accessibility (keyboard navigation, focus states)
- [ ] Verify no console errors

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add semantic search to homepage`
- `fix: Resolve modal closing issue`
- `docs: Update design system guidelines`
- `refactor: Simplify authentication flow`
- `style: Improve button focus states`
- `test: Add tests for embeddings hook`

## Pull Request Process

1. Ensure your code follows all guidelines above
2. Update documentation if needed
3. Test thoroughly
4. Create a PR with a clear description
5. Link any related issues
6. Request review from maintainers

## Design System Guidelines

### Colors
- Use semantic color variables (primary, secondary, etc.)
- Ensure WCAG AA compliance (4.5:1 contrast minimum)
- Test in both light and dark modes

### Spacing
- Use the 4px base unit (Tailwind's spacing scale)
- Standard spacing: gap-4 (16px)
- Card grids: gap-6 (24px)
- Tags/badges: gap-3 (12px)

### Typography
- Use semantic HTML headings (h1-h6)
- Follow the defined type scale
- Apply proper line heights
- Test mobile responsiveness

### Components
- Use shadcn/ui components as base
- Follow button size guidelines
- Ensure 44x44px minimum touch targets on mobile
- Add proper focus indicators

## Questions?

- Check [docs/README.md](docs/README.md) for documentation
- Review [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for design guidelines
- Open an issue for questions or clarifications

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Keep discussions professional

Thank you for contributing to Laterr Garden! 🌱
