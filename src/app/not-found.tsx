import Link from 'next/link';
import { fontVariables } from './fonts';
import '@/styles/globals.css';

export default function NotFound() {
  return (
    <html lang="fr" className={fontVariables}>
      <body style={{ display: 'grid', placeItems: 'center', minHeight: '100svh', textAlign: 'center', margin: 0 }}>
        <div style={{ display: 'grid', gap: 24 }}>
          <p className="label">Piste 404</p>
          <h1 className="headline" style={{ fontSize: 'clamp(4rem, 18vw, 16rem)' }}>
            404
          </h1>
          <Link className="label link-underline" href="/">
            ← Alex
          </Link>
        </div>
      </body>
    </html>
  );
}
