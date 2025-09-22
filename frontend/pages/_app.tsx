import type { AppProps } from 'next/app';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import '@xyflow/react/dist/style.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <>
          <Head>
            <title>CrewAI Studio</title>
            <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
          </Head>
          <Component {...pageProps} />
        </>
      </AuthProvider>
    </QueryClientProvider>
  );
}
