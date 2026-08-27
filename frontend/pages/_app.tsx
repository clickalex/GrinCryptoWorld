import type { AppProps } from 'next/app';
import Head from 'next/head';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { CurrencyProvider } from '@/lib/currency';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <CurrencyProvider>
            <Head>
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta name="description" content="GrinCryptoWorld — live crypto prices, news, glossary, faucets, tools and a crypto marketplace." />
            </Head>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
          </CurrencyProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
