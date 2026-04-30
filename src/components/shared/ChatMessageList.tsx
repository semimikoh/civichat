'use client';

import { Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useMessageVirtualizer, type VirtualizableMessage } from '@/hooks/use-message-height';
import { ChatBubble } from '@/components/shared/ChatBubble';

export interface ChatListMessage {
  role: 'user' | 'assistant';
  content?: string;
  summary?: string;
  extraHeight?: number;
  loading?: boolean;
}

interface ChatMessageListProps<TMessage extends ChatListMessage> {
  messages: TMessage[];
  ariaLabel: string;
  renderAssistant: (message: TMessage, visibleIndex: number) => ReactNode;
}

export function ChatMessageList<TMessage extends ChatListMessage>({
  messages,
  ariaLabel,
  renderAssistant,
}: ChatMessageListProps<TMessage>) {
  const visibleMessages = messages.filter(
    (m): m is TMessage & VirtualizableMessage => !m.loading,
  );
  const { virtualizer, scrollRef } = useMessageVirtualizer(visibleMessages);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-label={ariaLabel}
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
              <ChatBubble role={msg.role}>
                {msg.role === 'user' ? (
                  <Text size="sm" c="white" style={{ whiteSpace: 'pre-line' }}>
                    {msg.content ?? ''}
                  </Text>
                ) : (
                  renderAssistant(msg, virtualItem.index)
                )}
              </ChatBubble>
            </div>
          );
        })}
      </div>
    </div>
  );
}
