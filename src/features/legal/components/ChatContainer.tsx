'use client';

import { useCallback } from 'react';
import { Button, Center } from '@mantine/core';
import { AssistantMessage } from '@/features/legal/components/AssistantMessage';
import { getLawResultsExtraHeight } from '@/features/legal/components/LawArticleList';
import type { LawSearchResult } from '@/features/legal/types';
import { useChatSearchStream, type BaseChatMessage } from '@/features/chat/hooks/use-chat-search-stream';
import { ChatConversationArea } from '@/features/chat/components/ChatConversationArea';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { ChatMessageList } from '@/features/chat/components/ChatMessageList';
import { ChatPageFrame } from '@/features/chat/components/ChatPageFrame';

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
    return getLawResultsExtraHeight(results.length);
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
