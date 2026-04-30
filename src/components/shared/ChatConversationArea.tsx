'use client';

import type { ReactNode } from 'react';
import { Box, Center, Loader } from '@mantine/core';
import { EmptyState } from '@/components/shared/EmptyState';

interface ChatConversationAreaProps {
  isEmpty: boolean;
  isBusy: boolean;
  empty: {
    subtitle: string;
    hints: string[];
  };
  children: ReactNode;
}

export function ChatConversationArea({
  isEmpty,
  isBusy,
  empty,
  children,
}: ChatConversationAreaProps) {
  if (isEmpty) {
    return <EmptyState subtitle={empty.subtitle} hints={empty.hints} />;
  }

  return (
    <Box flex={1} pos="relative" style={{ overflow: 'hidden' }}>
      {children}
      {isBusy && (
        <Center
          pos="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          role="status"
          aria-label="검색 중"
          style={{ backgroundColor: 'var(--mantine-color-body)', opacity: 0.6, zIndex: 10 }}
        >
          <Loader size="lg" />
        </Center>
      )}
    </Box>
  );
}
