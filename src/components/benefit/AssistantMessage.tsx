'use client';

import { useCallback, useRef } from 'react';
import { AssistantText } from '@/components/shared/AssistantText';
import { StaggeredResults } from '@/components/benefit/StaggeredResults';
import type { AssistantMessage as BaseAssistantMessage } from '@/hooks/use-chat-messages';
import type { SearchResult } from '@/domains/benefit';

export type BenefitAssistantMessage = BaseAssistantMessage<SearchResult>;

interface AssistantMessageProps {
  msg: BenefitAssistantMessage;
  onAnimationDone?: () => void;
}

/** 텍스트 타이핑 후 결과 카드가 순차 등장하고, 둘 다 끝나야 애니메이션 완료로 본다. */
export function AssistantMessage({ msg, onAnimationDone }: AssistantMessageProps) {
  const results = msg.results ?? [];
  const hasResults = results.length > 0;
  const skipAnimation = Boolean(msg.animated);

  const calledRef = useRef(false);
  const finishAnimation = useCallback(() => {
    if (calledRef.current || skipAnimation) return;
    calledRef.current = true;
    onAnimationDone?.();
  }, [skipAnimation, onAnimationDone]);

  return (
    <>
      <AssistantText
        msg={msg}
        hasResultsBelow={hasResults}
        onTextDone={hasResults ? undefined : finishAnimation}
      />
      {hasResults && (
        <StaggeredResults
          results={results}
          condText={msg.condText}
          skipAnimation={skipAnimation}
          onDone={finishAnimation}
        />
      )}
    </>
  );
}
