'use client';

import { Stack, Paper, Text, Loader, Card, Group, Badge } from '@mantine/core';
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

function BenefitItem({ result, index }: { result: SearchResult; index: number }) {
  return (
    <Card withBorder padding="sm" radius="sm">
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="sm">
          {index + 1}. {result.serviceName}
        </Text>
        <Badge size="xs" variant="light">
          {(result.similarity * 100).toFixed(0)}%
        </Badge>
      </Group>
      {result.supportType && (
        <Badge size="xs" variant="outline" mb="xs">
          {result.supportType}
        </Badge>
      )}
      <Text size="xs" c="dimmed" lineClamp={2}>
        {result.targetAudience || '-'}
      </Text>
      <Text size="xs" mt={4} lineClamp={2}>
        {result.supportContent || '-'}
      </Text>
      {result.contactPhone && (
        <Text size="xs" c="dimmed" mt={4}>
          문의: {result.contactPhone}
        </Text>
      )}
    </Card>
  );
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
                <Stack gap="xs">
                  {msg.results.map((r, idx) => (
                    <BenefitItem key={r.serviceId} result={r} index={idx} />
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
