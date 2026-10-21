'use client';

import { useCallback } from 'react';
import { Button, Center } from '@mantine/core';
import { AssistantMessage } from '@/components/legal/AssistantMessage';
import { LAW_ACCORDION_COLLAPSED_HEIGHT, CARD_GAP } from '@/lib/text-layout/prepared';
import type { LawSearchResult } from '@/domains/legal';
import { useChatSearchStream, type BaseChatMessage } from '@/hooks/use-chat-search-stream';
import { ChatConversationArea } from '@/components/shared/ChatConversationArea';
import { ChatInput } from '@/components/shared/ChatInput';
import { ChatMessageList } from '@/components/shared/ChatMessageList';
import { ChatPageFrame } from '@/components/shared/ChatPageFrame';

const LAW_HINTS = [
  '구체적 질문: 장애인 의무 고용 비율이 몇 퍼센트야?',
  '키워드 검색: 육아휴직 급여 지급 기준',
  '법령명 검색: 청년기본법',
];

export function ChatContainer() {
  const buildBody = useCallback((query: string, msgs: BaseChatMessage<LawSearchResult>[]) => {
    const history = msgs.flatMap(
      (msg): Array<{ role: string; content: string }> => {
        if (msg.role === 'assistant' && msg.loading) return [];
        return [{ role: msg.role, content: msg.content }];
      },
    );

    return { query, count: 10, history };
  }, []);

  const calcExtraHeight = useCallback((results: LawSearchResult[]) => {
    return results.length * (LAW_ACCORDION_COLLAPSED_HEIGHT + CARD_GAP);
  }, []);

  const { messages, isSearching, isInputDisabled, handleSubmit, markMessageAnimated, resetChat } =
    useChatSearchStream<LawSearchResult>({
      apiUrl: '/api/legal/search',
      buildBody,
      calcExtraHeight,
    });

  const hasCompletedResults =
    !isInputDisabled &&
    messages.some(
      (m) => m.role === 'assistant' && !m.loading && m.results && m.results.length > 0,
    );

  return (
    <ChatPageFrame
      a11y={{ mainLabel: 'CiviChat 법령 검색', skipHref: '#legal-chat-input', busy: isInputDisabled }}
      heading={{ title: 'CiviChat', description: '궁금한 법령, 쉽게 찾아보세요' }}
    >
      <ChatConversationArea
        isEmpty={messages.length === 0}
        isBusy={isSearching}
        empty={{ subtitle: '궁금한 법령을 검색해보세요', hints: LAW_HINTS }}
      >
        <ChatMessageList
          messages={messages}
          ariaLabel="법령 검색 내역"
          renderAssistant={(msg) => (
            <AssistantMessage msg={msg} onAnimationDone={() => markMessageAnimated(msg.id)} />
          )}
        />
      </ChatConversationArea>

      {hasCompletedResults && (
        <Center>
          <Button variant="subtle" size="xs" onClick={resetChat}>
            새 대화 하기
          </Button>
        </Center>
      )}

      <ChatInput
        onSubmit={handleSubmit}
        disabled={isInputDisabled}
        placeholder="어떤 법령을 찾고 계신가요?"
        formId="legal-chat-input"
        formAriaLabel="법령 검색"
      />
    </ChatPageFrame>
  );
}
