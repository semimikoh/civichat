'use client';

import { Stack, Paper, Text, Box } from '@mantine/core';
import { StaggeredResults } from '@/components/chat/StaggeredResults';
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
      {messages
        .filter((msg) => !msg.loading)
        .map((msg, i) => {
          const isUser = msg.role === 'user';

          return (
            <Box
              key={`msg-${msg.role}-${i}`}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper
                p="sm"
                radius="lg"
                bg={isUser ? 'blue.6' : 'gray.0'}
                style={{
                  maxWidth: isUser ? '75%' : '90%',
                }}
              >
                <Text
                  size="sm"
                  c={isUser ? 'white' : undefined}
                  mb={msg.results ? 'sm' : 0}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {msg.content}
                </Text>
                {msg.results && msg.results.length > 0 && (
                  <StaggeredResults results={msg.results} />
                )}
              </Paper>
            </Box>
          );
        })}
    </Stack>
  );
}
