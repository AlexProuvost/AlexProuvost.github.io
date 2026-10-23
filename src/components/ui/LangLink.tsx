'use client';

import { usePathname } from '@/i18n/navigation';

type Props = { lang: string; title: string; className?: string };

/**
 * Lien vers la même page dans l'autre langue (/fr/projets/x → /en/projets/x).
 * Lien HTML simple (rechargement complet) : les animations repartent proprement dans la nouvelle langue.
 */
export function LangLink({ lang, title, className }: Props) {
  const pathname = usePathname();
  const rest = pathname === '/' ? '' : pathname;
  return (
    <a href={`/${lang}${rest}`} hrefLang={lang} className={className} title={title} data-scramble>
      {lang}
    </a>
  );
}
