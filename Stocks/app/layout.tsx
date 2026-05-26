import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';
import { StockStreamProvider } from '@/providers/stock-stream-provider';

/* ── Fonts via next/font (zero FOUT, self-hosted at build time) ── */
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  // Fraunces is a variable font: optical-size & weight axes
  // weight: '100..900', style: italic supported
  axes: ['SOFT', 'WONK', 'opsz'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Stock Thesis Generator',
  description: 'AI-grounded stock thesis generator for Indian markets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(geist.variable, geistMono.variable, fraunces.variable)}>
      <body className="min-h-screen">
        <StockStreamProvider>
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          {children}
        </StockStreamProvider>
      </body>
    </html>
  );
}

