import { defineRouting } from 'next-intl/routing';

/** Langues du site : français par défaut, anglais en /en. */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
});

export type Locale = (typeof routing.locales)[number];
