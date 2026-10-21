'use client';

import { useCallback } from 'react';
import { Button, Center } from '@mantine/core';
import { AssistantMessage } from '@/components/benefit/AssistantMessage';
import { ChatConversationArea } from '@/components/shared/ChatConversationArea';
import { ChatInput } from '@/components/shared/ChatInput';
import { ChatMessageList } from '@/components/shared/ChatMessageList';
import { ChatPageFrame } from '@/components/shared/ChatPageFrame';
import type { SearchResult } from '@/domains/benefit';
import { useChatSearchStream, type BaseChatMessage } from '@/hooks/use-chat-search-stream';
import { getBenefitResultsExtraHeight } from '@/components/benefit/BenefitCard';

const BENEFIT_HINTS = [
  '26살 무직인데 받을 수 있는 지원금',
  '임산부 혜택 알려줘',
  '청년 주거 지원',
];

export function ChatContainer() {
  const buildBody = useCallback((query: string, msgs: BaseChatMessage<SearchResult>[]) => {
    const history = msgs.flatMap((m): Array<{ role: string; content: string }> => {
      if (m.role === 'assistant' && m.loading) return [];
      if (m.role === 'user') return [{ role: m.role, content: m.content }];
      return [{
        role: m.role,
        content: m.summary
          ? `${m.summary}\n\n[검색 조건: ${m.content}]`
          : m.content,
      }];
    });
    return { query, history };
  }, []);

  const calcExtraHeight = useCallback((results: SearchResult[]) => {
    return getBenefitResultsExtraHeight(results.length);
  }, []);

  const { messages, isSearching, isInputDisabled, handleSubmit, markMessageAnimated, resetChat } =
    useChatSearchStream<SearchResult>({
      apiUrl: '/api/benefit/search',
      buildBody,
      calcExtraHeight,
    });

  const hasCompletedResults = !isInputDisabled && messages.some(
    (m) => m.role === 'assistant' && !m.loading && m.results && m.results.length > 0,
  );

  return (
    <ChatPageFrame
      a11y={{ mainLabel: 'CiviChat 복지 혜택 검색', skipHref: '#chat-input', busy: isInputDisabled }}
      heading={{ title: 'CiviChat', description: '나에게 맞는 복지 혜택을 찾아보세요' }}
    >
      <ChatConversationArea
        isEmpty={messages.length === 0}
        isBusy={isSearching}
        empty={{ subtitle: '어떤 혜택을 찾고 계신가요?', hints: BENEFIT_HINTS }}
      >
        <ChatMessageList
          messages={messages}
          ariaLabel="대화 내역"
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

      <ChatInput onSubmit={handleSubmit} disabled={isInputDisabled} />
    </ChatPageFrame>
  );
}
