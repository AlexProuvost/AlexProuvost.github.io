import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * STATIC_EXPORT=1 → site 100 % statique dans out/ (GitHub Pages, tout hébergeur de fichiers).
 * Utilisé par `npm run export:pages` (scripts/export-pages.mjs).
 */
const isExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Médias du dossier /contenu servis en AVIF / WebP (sans serveur d'images en export statique)
    formats: ['image/avif', 'image/webp'],
    unoptimized: isExport,
  },
  ...(isExport ? { output: 'export', trailingSlash: true } : {}),
};

export default withNextIntl(nextConfig);
