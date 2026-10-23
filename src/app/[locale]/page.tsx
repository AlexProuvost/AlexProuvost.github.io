import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/sections/Hero';
import { Approach } from '@/components/sections/Approach';
import { Work } from '@/components/sections/Work';
import { Services } from '@/components/sections/Services';
import { About } from '@/components/sections/About';
import { Contact } from '@/components/sections/Contact';
import { Footer } from '@/components/ui/Footer';
import { Marquee } from '@/components/ui/Marquee';

type Props = { params: Promise<{ locale: string }> };

/**
 * 01 Ouverture → 02 Méthode → 03 Projets → 04 Services → 05 À propos → 06 Contact
 */
export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('marquee');

  return (
    <>
      <main>
        <Hero />
        <Marquee a={t.raw('a') as string[]} b={t.raw('b') as string[]} />
        <Approach />
        <Work />
        <Services />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
