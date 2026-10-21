'use client';

import { AssistantText } from '@/features/chat/components/AssistantText';
import { LawArticleList } from '@/features/legal/components/LawArticleList';
import type { AssistantMessage as BaseAssistantMessage } from '@/features/chat/hooks/use-chat-messages';
import type { LawSearchResult } from '@/features/legal/types';

export type LawAssistantMessage = BaseAssistantMessage<LawSearchResult>;

interface AssistantMessageProps {
  msg: LawAssistantMessage;
  onAnimationDone?: () => void;
}

/** 조문 목록은 접힌 아코디언이라 등장 애니메이션이 없어, 텍스트 타이핑이 끝나면 완료로 본다. */
export function AssistantMessage({ msg, onAnimationDone }: AssistantMessageProps) {
  const results = msg.results ?? [];

  return (
    <>
      <AssistantText msg={msg} hasResultsBelow={results.length > 0} onTextDone={onAnimationDone} />
      {results.length > 0 && <LawArticleList results={results} query={msg.query} />}
    </>
  );
}
