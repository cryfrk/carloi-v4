import type { Metadata } from 'next';
import { Newsreader, Space_Grotesk } from 'next/font/google';
import { Providers } from '../components/providers';
import './globals.css';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const serifFont = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Carloi V4',
  description: 'Vehicle marketplace and social platform foundation',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${displayFont.variable} ${serifFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
