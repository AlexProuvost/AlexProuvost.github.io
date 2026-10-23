import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { site } from '@/content/site';
import { fontVariables } from '../fonts';
import { Grain } from '@/components/ui/Grain';
import { Nav } from '@/components/ui/Nav';
import { DebugPanel } from '@/debug/DebugPanel';
import { SmoothScroll } from '@/motion/SmoothScroll';
import { Reveals } from '@/motion/Reveals';
import { Preloader } from '@/components/ui/Preloader';
import { Cursor } from '@/components/ui/Cursor';
import { StackLabels } from '@/components/ui/StackLabels';
import { ScrollRail } from '@/components/ui/ScrollRail';
import { Interface } from '@/components/Interface';
import { GLRoot } from '@/gl/GLRoot';
import '@/styles/globals.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/** Pré-génère /fr et /en au build (site 100 % statique). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    ...(site.url ? { metadataBase: new URL(site.url) } : {}),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { fr: '/fr', en: '/en' },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: locale === 'fr' ? 'fr_BE' : 'en_GB',
      type: 'website',
      // Image de partage (public/og.png) : il faut une URL absolue, donc seulement quand site.url est renseignée
      ...(site.url ? { images: [{ url: '/og.png', width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: 'summary_large_image' },
  };
}

const jsFlag =
  "document.documentElement.classList.add('js');setTimeout(function(){document.documentElement.classList.add('js-timeout')},4000);" +
  // Arrivée par une transition de page : le rideau couvre l'écran dès le premier rendu (interactions/transitions.ts)
  "try{if(sessionStorage.getItem('alex-transition')==='1'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('pt-in')}catch(e){}" +
  // Première visite de la session : écran de chargement (interactions/preloader.ts)
  "try{if(!sessionStorage.getItem('alex-visited')&&!sessionStorage.getItem('alex-transition')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('pl-on');sessionStorage.setItem('alex-visited','1')}}catch(e){}";

export const viewport: Viewport = {
  themeColor: '#0f0e0d',
  colorScheme: 'dark',
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Avant tout rendu : signale que le JS est là (anti-flash de l'ouverture, cf. motion.css) */}
        <script dangerouslySetInnerHTML={{ __html: jsFlag }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <Preloader locale={locale} />
          <Nav />
          {children}
          <Grain />
          <GLRoot />
          <StackLabels />
          <ScrollRail />
          <Cursor />
          <SmoothScroll />
          <Reveals />
          <Interface />
          <DebugPanel />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
