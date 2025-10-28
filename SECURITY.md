# Security Notes

## Known Issues

### Development Dependencies (Non-Critical)

- **esbuild** (moderate): Development-only vulnerability that affects the Vite dev server. This is a development dependency and does not affect production builds.
  - Impact: Only affects local development environment
  - Mitigation: Do not expose dev server to untrusted networks
  - Resolution: Will be resolved in future dependency updates

## Reporting Security Issues

If you discover a security vulnerability, please email the repository maintainers.

## Best Practices

1. Never commit `.env` files with real credentials
2. Use `.env.example` as a template for environment variables
3. Keep dependencies updated regularly with `npm audit`
4. Review security advisories before deploying to production
