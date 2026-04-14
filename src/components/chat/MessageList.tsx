'use client';

import { Stack, Paper, Text, Loader } from '@mantine/core';
import { BenefitCard } from '@/components/chat/BenefitCard';
import type { SearchResult } from '@/core/search/benefit';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  results?: SearchResult[];
  loading?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <Stack gap="md">
      {messages.map((msg, i) => (
        <Paper
          key={`msg-${msg.role}-${i}`}
          p="md"
          radius="md"
          bg={msg.role === 'user' ? 'blue.0' : undefined}
          withBorder={msg.role === 'assistant'}
        >
          {msg.loading ? (
            <Loader size="sm" />
          ) : (
            <>
              <Text size="sm" mb={msg.results ? 'sm' : 0}>
                {msg.content}
              </Text>
              {msg.results && (
                <Stack gap="sm">
                  {msg.results.map((r, idx) => (
                    <BenefitCard key={r.serviceId} result={r} index={idx} />
                  ))}
                </Stack>
              )}
            </>
          )}
        </Paper>
      ))}
    </Stack>
  );
}
