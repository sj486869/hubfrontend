import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AgeVerificationModal from '../components/AgeVerificationModal';
import BottomNav from '../components/BottomNav';
import LegalNotice from '../components/LegalNotice';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'VibeStream',
  description: 'Dark modern video streaming platform',
  other: {
    '46e0465d4dbde309b0c53d9c02381e5af1b8aac1': '46e0465d4dbde309b0c53d9c02381e5af1b8aac1',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-surface text-text ${inter.variable}`}>
      <body className="pb-safe">
        {children}
        <LegalNotice />
        <BottomNav />
        <AgeVerificationModal />
      </body>
    </html>
  );
}
