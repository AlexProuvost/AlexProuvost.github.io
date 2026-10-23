import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { projects } from '@/content/projects';
import { CaseStudy } from '@/components/case/CaseStudy';
import { Footer } from '@/components/ui/Footer';

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Une étude de cas par projet et par langue, pré-générées au build (site statique). */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  const t = await getTranslations({ locale, namespace: 'projects' });
  const tc = await getTranslations({ locale, namespace: 'project' });
  return {
    title: `${t(`${project.id}.title`)} — ${tc('caseLabel')} · Alex`,
    description: t(`${project.id}.tagline`),
    alternates: {
      canonical: `/${locale}/projets/${slug}`,
      languages: { fr: `/fr/projets/${slug}`, en: `/en/projets/${slug}` },
    },
  };
}

export default async function CasePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const index = projects.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();
  const next = projects[(index + 1) % projects.length];

  return (
    <>
      <main>
        <CaseStudy project={projects[index]} next={next} locale={locale} />
      </main>
      <Footer />
    </>
  );
}
