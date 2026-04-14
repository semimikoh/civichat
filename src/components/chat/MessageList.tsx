'use client';

import { useState } from 'react';
import { Stack, Paper, Text, Box } from '@mantine/core';
import { useMessageVirtualizer } from '@/lib/text-layout/use-message-height';
import { StaggeredResults } from '@/components/chat/StaggeredResults';
import type { SearchResult } from '@/core/search/benefit';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  results?: SearchResult[];
  loading?: boolean;
}

interface MessageListProps {
  messages: ChatMessage[];
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const hasResults = msg.results && msg.results.length > 0;

  return (
    <>
      {msg.summary && (
        <Text
          size="sm"
          mb={hasResults ? 'sm' : 0}
          style={{ whiteSpace: 'pre-line' }}
          dangerouslySetInnerHTML={{
            __html: msg.summary
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
          }}
        />
      )}
      {!msg.summary && msg.content && (
        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
          {msg.content}
        </Text>
      )}
      {hasResults && (
        <StaggeredResults results={msg.results!} />
      )}
    </>
  );
}

export function MessageList({ messages }: MessageListProps) {
  const visibleMessages = messages.filter((m) => !m.loading);
  const { virtualizer, scrollRef } = useMessageVirtualizer(visibleMessages);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-label="대화 내역"
      style={{ height: '100%', overflow: 'auto' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const msg = visibleMessages[virtualItem.index];
          if (!msg) return null;
          const isUser = msg.role === 'user';

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <Box
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  paddingBottom: 12,
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
                  {isUser ? (
                    <Text size="sm" c="white" style={{ whiteSpace: 'pre-line' }}>
                      {msg.content}
                    </Text>
                  ) : (
                    <AssistantMessage msg={msg} />
                  )}
                </Paper>
              </Box>
            </div>
          );
        })}
      </div>
    </div>
  );
}
