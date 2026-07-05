import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { ThemeProvider } from '@/components/theme-provider';
import { StockStreamProvider } from '@/providers/stock-stream-provider';
import { NotificationsProvider } from '@/providers/notifications-provider';

// Runs before first paint to set <html data-theme> from the stored choice
// (or the OS preference), so light-mode users never see a dark flash.
const NO_FLASH_THEME = `(function(){try{var c=localStorage.getItem('theme')||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',c==='system'?(d?'dark':'light'):c);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://stock-thesis-generator-mae5.vercel.app'),
  title: {
    default: 'Editorial Quant — AI-Grounded Stock Thesis Engine',
    template: '%s · Editorial Quant',
  },
  description:
    'AI-generated investment theses for Nifty 50 stocks with two-pass grounding: Gemini Pro writes the thesis, Gemini Flash verifies every numeric claim against live market data. Monte Carlo portfolio simulation included.',
  keywords: ['Nifty 50', 'stock analysis', 'AI thesis', 'Monte Carlo simulation', 'Indian markets', 'grounded AI'],
  openGraph: {
    title: 'Editorial Quant — AI-Grounded Stock Thesis Engine',
    description:
      'Every claim verified. AI theses for Nifty 50 stocks, grounded against live market data, with Monte Carlo portfolio simulation.',
    type: 'website',
    siteName: 'Editorial Quant',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Editorial Quant — AI-Grounded Stock Thesis Engine',
    description: 'Every claim verified. AI theses for Nifty 50 stocks, grounded against live market data.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(geist.variable, geistMono.variable, fraunces.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <StockStreamProvider>
            <NotificationsProvider>
              <Suspense fallback={null}>
                <Header />
              </Suspense>
              <Suspense fallback={null}>
                <AnalyticsTracker />
              </Suspense>
              {children}
            </NotificationsProvider>
          </StockStreamProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

