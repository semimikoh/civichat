import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Box, Container , ColorSchemeScript } from '@mantine/core';
import { Providers } from '@/components/providers/Providers';
import { TabNav } from '@/components/home/TabNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'CiviChat',
  description: '자연어로 정부 복지 혜택을 찾고, 관련 법령까지 연결해주는 RAG 기반 검색',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <Providers>
          <Box h="100dvh" style={{ display: 'flex', flexDirection: 'column' }}>
            <Container size="xs" pt="sm">
              <TabNav />
            </Container>
            <Box flex={1} style={{ overflow: 'hidden' }}>
              {children}
            </Box>
          </Box>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
