import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project slugs (set via SENTRY_ORG / SENTRY_PROJECT env vars)
  silent: true,
  // Disable server-side features — this is a static export
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
  // Source map uploads to Sentry (requires SENTRY_AUTH_TOKEN env var)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
