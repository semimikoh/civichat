'use client';

import { Box, Paper } from '@mantine/core';
import { USER_BUBBLE_WIDTH_RATIO, ASSISTANT_BUBBLE_WIDTH_RATIO } from '@/features/chat/lib/message-height';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
}

export function ChatBubble({ role, children }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <Box
      display="flex"
      pb={12}
      style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}
    >
      <Paper
        p="sm"
        radius="lg"
        bg={isUser ? 'blue.6' : 'var(--mantine-color-default-hover)'}
        style={{
          maxWidth: isUser
            ? `${USER_BUBBLE_WIDTH_RATIO * 100}%`
            : `${ASSISTANT_BUBBLE_WIDTH_RATIO * 100}%`,
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}
