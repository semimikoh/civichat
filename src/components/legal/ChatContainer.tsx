'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ActionIcon, Box, Button, Container, Stack, Group, TextInput, Title, Text, Center, Loader, Paper } from '@mantine/core';
import Markdown from 'react-markdown';
import { LawArticleList } from '@/components/legal/LawArticleCard';
import { useTypewriter } from '@/lib/use-typewriter';
import { useMessageVirtualizer } from '@/lib/text-layout/use-message-height';
import { USER_BUBBLE_WIDTH_RATIO, ASSISTANT_BUBBLE_WIDTH_RATIO, LAW_ACCORDION_COLLAPSED_HEIGHT, CARD_GAP } from '@/lib/text-layout/prepared';
import type { LawSearchResult } from '@/core/legal/search';
import { useChatSearchStream, type BaseChatMessage } from '@/lib/use-chat-search-stream';

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

function ChatInput({ onSubmit, disabled }: { onSubmit: (msg: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      id="legal-chat-input"
      role="search"
      aria-label="법령 검색"
    >
      <Group gap="xs">
        <TextInput
          ref={inputRef}
          flex={1}
          placeholder="어떤 법령을 찾고 계신가요?"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          disabled={disabled}
          size="md"
          aria-label="검색어 입력"
          autoFocus
        />
        <ActionIcon
          type="submit"
          size="input-md"
          variant="filled"
          disabled={disabled || !value.trim()}
          aria-label="검색"
        >
          &rarr;
        </ActionIcon>
      </Group>
    </form>
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
      <a href="#legal-chat-input" style={{
        position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden',
        zIndex: 100,
      }} onFocus={(e) => {
        e.currentTarget.style.left = '16px';
        e.currentTarget.style.top = '16px';
        e.currentTarget.style.width = 'auto';
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.padding = '8px 16px';
        e.currentTarget.style.background = 'var(--mantine-color-blue-6)';
        e.currentTarget.style.color = '#fff';
        e.currentTarget.style.borderRadius = '4px';
        e.currentTarget.style.fontSize = '14px';
        e.currentTarget.style.textDecoration = 'none';
      }} onBlur={(e) => {
        e.currentTarget.style.left = '-9999px';
        e.currentTarget.style.width = '1px';
        e.currentTarget.style.height = '1px';
        e.currentTarget.style.padding = '0';
      }}>검색 입력으로 건너뛰기</a>
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
        <ChatInput onSubmit={handleSubmit} disabled={isInputDisabled} />
      </Stack>
    </Container>
  );
}
