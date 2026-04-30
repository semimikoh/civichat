'use client';

import { useEffect, useRef } from 'react';
import { Box, Text } from '@mantine/core';
import Markdown from 'react-markdown';
import { LawArticleList } from '@/components/legal/LawArticleList';
import { useTypewriter } from '@/hooks/use-typewriter';
import { TYPEWRITER_INTERVAL_MS } from '@/components/shared/chat-timing';
import type { LawSearchResult } from '@/domains/legal';
import type { BaseChatMessage } from '@/hooks/use-chat-search-stream';
import type { AssistantMessage as BaseAssistantMessage } from '@/hooks/use-chat-messages';

export type LawChatMessage = BaseChatMessage<LawSearchResult>;
export type LawAssistantMessage = BaseAssistantMessage<LawSearchResult>;

interface AssistantMessageProps {
  msg: LawAssistantMessage;
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
    calledRef.current = true;
    onAnimationDone?.();
  }, [summaryDone, contentDone, skipAnimation, onAnimationDone, msg.summary]);

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
        <LawArticleList results={msg.results ?? []} query={msg.query} />
      )}
    </>
  );
}
