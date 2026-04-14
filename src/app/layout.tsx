import type { Metadata, Viewport } from 'next';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from '@/components/providers/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'CiviChat',
  description: '자연어로 정부 복지 혜택을 찾고, 관련 법령까지 연결해주는 RAG 기반 검색',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
