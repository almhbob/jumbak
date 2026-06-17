import type { ReactNode } from 'react';
import './style.css';
import './pro-admin.css';
import './admin-page-polish.css';

export const metadata = {
  title: 'Jnbk جنبك — Admin Portal',
  description: 'Jnbk Rickshaw Near You — Unified staff and operations portal',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#063B63" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
