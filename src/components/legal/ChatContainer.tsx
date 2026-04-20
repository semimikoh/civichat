'use client';

import { useCallback } from 'react';
import { Box, Button, Container, Stack, Group, Title, Text, Center, Loader, Paper } from '@mantine/core';
import Markdown from 'react-markdown';
import { LawArticleList } from '@/components/legal/LawArticleCard';
import { useTypewriter } from '@/lib/use-typewriter';
import { useMessageVirtualizer } from '@/lib/text-layout/use-message-height';
import { USER_BUBBLE_WIDTH_RATIO, ASSISTANT_BUBBLE_WIDTH_RATIO, LAW_ACCORDION_COLLAPSED_HEIGHT, CARD_GAP } from '@/lib/text-layout/prepared';
import type { LawSearchResult } from '@/core/legal/search';
import { useChatSearchStream, type BaseChatMessage } from '@/lib/use-chat-search-stream';
import { ChatInput } from '@/components/shared/ChatInput';
import { SkipLink } from '@/components/shared/SkipLink';

function EmptyState() {
  return (
    <Center flex={1}>
      <Stack align="center" gap="xs">
        <Title order={3} c="dimmed">CiviChat</Title>
        <Text size="sm" c="dimmed" ta="center">
          궁금한 법령을 검색해보세요
        </Text>
        <Stack gap={4} mt="sm">
          <Text size="xs" c="dimmed">구체적 질문: &quot;장애인 의무 고용 비율이 몇 퍼센트야?&quot;</Text>
          <Text size="xs" c="dimmed">키워드 검색: &quot;육아휴직 급여 지급 기준&quot;</Text>
          <Text size="xs" c="dimmed">법령명 검색: &quot;청년기본법&quot;</Text>
        </Stack>
      </Stack>
    </Center>
  );
}

type LawChatMessage = BaseChatMessage<LawSearchResult>;

function AssistantMessage({ msg }: { msg: LawChatMessage }) {
  const hasResults = msg.results && msg.results.length > 0;
  const { visibleText: visibleSummary } = useTypewriter(msg.summary ?? '', {
    interval: 40,
    enabled: Boolean(msg.summary),
  });
  const { visibleText: visibleContent } = useTypewriter(
    !msg.summary ? msg.content : '',
    { interval: 40, enabled: Boolean(!msg.summary && msg.content) },
  );

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
        <LawArticleList results={msg.results!} query={msg.query} />
      )}
    </>
  );
}

export function ChatContainer() {
  const buildBody = useCallback((query: string) => {
    return { query, count: 10 };
  }, []);

  const calcExtraHeight = useCallback((results: LawSearchResult[]) => {
    return results.length * (LAW_ACCORDION_COLLAPSED_HEIGHT + CARD_GAP);
  }, []);

  const {
    messages,
    isInputDisabled,
    handleSubmit,
    resetChat,
  } = useChatSearchStream<LawSearchResult>({
    apiUrl: '/api/legal/search',
    buildBody,
    calcExtraHeight,
  });

  const visibleMessages = messages.filter((m) => !m.loading);
  const { virtualizer, scrollRef } = useMessageVirtualizer(visibleMessages);

  return (
    <Container size="xs" h="100%" py="md" role="main" aria-label="CiviChat 법령 검색" aria-busy={isInputDisabled}>
      <SkipLink href="#legal-chat-input" />
      <Stack h="100%" gap="md">
        <header>
          <Group gap="xs" align="baseline">
            <Title order={1} size="h2">CiviChat</Title>
            <Text size="sm" c="dimmed">궁금한 법령, 쉽게 찾아보세요</Text>
          </Group>
        </header>

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <Box flex={1} pos="relative" style={{ overflow: 'hidden' }}>
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-label="법령 검색 내역"
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
                            <AssistantMessage msg={msg} />
                          )}
                        </Paper>
                      </Box>
                    </div>
                  );
                })}
              </div>
            </div>
            {isInputDisabled && (
              <Center
                pos="absolute"
                top={0} left={0} right={0} bottom={0}
                role="status"
                aria-label="검색 중"
                style={{ backgroundColor: 'var(--mantine-color-body)', opacity: 0.6, zIndex: 10 }}
              >
                <Loader size="lg" />
              </Center>
            )}
          </Box>
        )}

        {!isInputDisabled && messages.some((m) => m.results && m.results.length > 0) && (
          <Center>
            <Button
              variant="subtle"
              size="xs"
              onClick={resetChat}
            >
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
      </Stack>
    </Container>
  );
}
