import type { Metadata } from 'next';
import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <nav className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              Stocks
            </Link>
            <Link href="/compare" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Compare
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
