'use client';

import { Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useMessageVirtualizer } from '@/features/chat/hooks/use-message-virtualizer';
import { ChatBubble } from '@/features/chat/components/ChatBubble';
import type { AssistantMessage, BaseChatMessage, UserMessage } from '@/features/chat/hooks/use-chat-messages';

type VisibleMessage<TResult> = UserMessage | AssistantMessage<TResult>;

interface ChatMessageListProps<TResult> {
  messages: BaseChatMessage<TResult>[];
  ariaLabel: string;
  renderAssistant: (message: AssistantMessage<TResult>) => ReactNode;
}

function isVisible<TResult>(msg: BaseChatMessage<TResult>): msg is VisibleMessage<TResult> {
  return !(msg.role === 'assistant' && msg.loading);
}

export function ChatMessageList<TResult>({
  messages,
  ariaLabel,
  renderAssistant,
}: ChatMessageListProps<TResult>) {
  const visibleMessages = messages.filter(isVisible);
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
                    {msg.content}
                  </Text>
                ) : (
                  renderAssistant(msg)
                )}
              </ChatBubble>
            </div>
          );
        })}
      </div>
    </div>
  );
}
