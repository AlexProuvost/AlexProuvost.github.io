/**
 * Layout racine minimal : le vrai layout (html, polices, providers) est dans app/[locale].
 * Il existe pour que not-found.tsx fonctionne hors des routes /fr et /en.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
