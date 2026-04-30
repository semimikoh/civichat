'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Text, Box } from '@mantine/core';
import Markdown from 'react-markdown';
import { useTypewriter } from '@/hooks/use-typewriter';
import { StaggeredResults } from '@/components/benefit/StaggeredResults';
import { TYPEWRITER_INTERVAL_MS } from '@/components/shared/chat-timing';
import type { BaseChatMessage } from '@/hooks/use-chat-search-stream';
import type { AssistantMessage as BaseAssistantMessage } from '@/hooks/use-chat-messages';
import type { SearchResult } from '@/domains/benefit';

export type BenefitChatMessage = BaseChatMessage<SearchResult>;
export type BenefitAssistantMessage = BaseAssistantMessage<SearchResult>;

interface AssistantMessageProps {
  msg: BenefitAssistantMessage;
  onAnimationDone?: () => void;
}

export function AssistantMessage({ msg, onAnimationDone }: AssistantMessageProps) {
  const hasResults = msg.results && msg.results.length > 0;
  const skipAnimation = Boolean(msg.animated);

  const { visibleText: visibleSummary, isDone: summaryDone } = useTypewriter(msg.summary ?? '', {
    interval: TYPEWRITER_INTERVAL_MS,
    enabled: Boolean(msg.summary) && !skipAnimation,
  });
  const { visibleText: visibleContent, isDone: contentDone } = useTypewriter(
    !msg.summary ? msg.content : '',
    { interval: TYPEWRITER_INTERVAL_MS, enabled: Boolean(!msg.summary && msg.content) && !skipAnimation },
  );

  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current || skipAnimation) return;
    const textDone = msg.summary ? summaryDone : contentDone;
    if (!textDone) return;
    if (!hasResults) {
      calledRef.current = true;
      onAnimationDone?.();
    }
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
          results={msg.results ?? []}
          condText={msg.condText}
          skipAnimation={skipAnimation}
          onDone={handleStaggerDone}
        />
      )}
    </>
  );
}
