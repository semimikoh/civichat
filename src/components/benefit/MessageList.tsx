'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Paper, Text, Box } from '@mantine/core';
import Markdown from 'react-markdown';
import { useMessageVirtualizer } from '@/lib/text-layout/use-message-height';
import { USER_BUBBLE_WIDTH_RATIO, ASSISTANT_BUBBLE_WIDTH_RATIO } from '@/lib/text-layout/prepared';
import { useTypewriter } from '@/lib/use-typewriter';
import { StaggeredResults } from '@/components/benefit/StaggeredResults';
import type { ChatMessage } from '@/components/benefit/types';

export type { ChatMessage } from '@/components/benefit/types';

interface MessageListProps {
  messages: ChatMessage[];
  onMessageAnimated?: (index: number) => void;
}

interface AssistantMessageProps {
  msg: ChatMessage;
  onAnimationDone?: () => void;
}

function AssistantMessage({ msg, onAnimationDone }: AssistantMessageProps) {
  const hasResults = msg.results && msg.results.length > 0;
  const skipAnimation = Boolean(msg.animated);

  const { visibleText: visibleSummary, isDone: summaryDone } = useTypewriter(msg.summary ?? '', {
    interval: 40,
    enabled: Boolean(msg.summary) && !skipAnimation,
  });
  const { visibleText: visibleContent, isDone: contentDone } = useTypewriter(
    !msg.summary ? msg.content : '',
    { interval: 40, enabled: Boolean(!msg.summary && msg.content) && !skipAnimation },
  );

  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current || skipAnimation) return;
    const textDone = msg.summary ? summaryDone : contentDone;
    if (!textDone) return;
    // 결과 카드가 없으면 텍스트 완료 시점에 완료
    if (!hasResults) {
      calledRef.current = true;
      onAnimationDone?.();
    }
    // 카드가 있으면 StaggeredResults의 onDone에서 처리
  }, [summaryDone, contentDone, hasResults, skipAnimation, onAnimationDone, msg.summary]);

  const handleStaggerDone = useCallback(() => {
    if (calledRef.current || skipAnimation) return;
    calledRef.current = true;
    onAnimationDone?.();
  }, [skipAnimation, onAnimationDone]);

  return (
    <>
      {msg.summary && (
        <Box mb={hasResults ? 'sm' : 0} fz="sm">
          <Markdown
            allowedElements={['p', 'strong', 'em', 'br', 'ol', 'ul', 'li']}
            unwrapDisallowed
          >
            {visibleSummary}
          </Markdown>
        </Box>
      )}
      {!msg.summary && msg.content && (
        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
          {visibleContent}
        </Text>
      )}
      {hasResults && (
        <StaggeredResults
          results={msg.results!}
          condText={msg.condText}
          skipAnimation={skipAnimation}
          onDone={handleStaggerDone}
        />
      )}
    </>
  );
}

export function MessageList({ messages, onMessageAnimated }: MessageListProps) {
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
          const msgIndex = virtualItem.index;

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
                  bg={isUser ? 'blue.6' : 'var(--mantine-color-default-hover)'}
                  style={{
                    maxWidth: isUser
                      ? `${USER_BUBBLE_WIDTH_RATIO * 100}%`
                      : `${ASSISTANT_BUBBLE_WIDTH_RATIO * 100}%`,
                  }}
                >
                  {isUser ? (
                    <Text size="sm" c="white" style={{ whiteSpace: 'pre-line' }}>
                      {msg.content}
                    </Text>
                  ) : (
                    <AssistantMessage
                      msg={msg}
                      onAnimationDone={() => onMessageAnimated?.(msgIndex)}
                    />
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
