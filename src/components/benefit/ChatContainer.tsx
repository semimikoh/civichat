'use client';

import { useState, useCallback } from 'react';
import { Box, Button, Container, Stack, Group, Title, Text, Center, Loader } from '@mantine/core';
import { ChatInput } from '@/components/benefit/ChatInput';
import { MessageList } from '@/components/benefit/MessageList';
import type { SearchResult } from '@/core/benefit/search';
import { useChatSearchStream } from '@/lib/use-chat-search-stream';
import { BENEFIT_CARD_HEIGHT, CARD_GAP } from '@/lib/text-layout/prepared';

function EmptyState() {
  return (
    <Center flex={1}>
      <Stack align="center" gap="xs">
        <Title order={3} c="dimmed">CiviChat</Title>
        <Text size="sm" c="dimmed" ta="center">
          어떤 혜택을 찾고 계신가요?
        </Text>
        <Stack gap={4} mt="sm">
          <Text size="xs" c="dimmed">&quot;26살 무직인데 받을 수 있는 지원금&quot;</Text>
          <Text size="xs" c="dimmed">&quot;임산부 혜택 알려줘&quot;</Text>
          <Text size="xs" c="dimmed">&quot;청년 주거 지원&quot;</Text>
        </Stack>
      </Stack>
    </Center>
  );
}

export function ChatContainer() {
  const [isAnimating, setIsAnimating] = useState(false);

  const buildBody = useCallback((query: string, msgs: { role: string; content: string; summary?: string; loading?: boolean }[]) => {
    const history = msgs
      .filter((m) => !m.loading)
      .map((m) => ({
        role: m.role,
        content: m.summary
          ? `${m.summary}\n\n[검색 조건: ${m.content}]`
          : m.content,
      }));
    return { query, history };
  }, []);

  const calcExtraHeight = useCallback((results: SearchResult[]) => {
    return results.length * (BENEFIT_CARD_HEIGHT + CARD_GAP);
  }, []);

  const onResultsReceived = useCallback(() => {
    setIsAnimating(true);
  }, []);

  const {
    messages,
    isInputDisabled,
    handleSubmit,
    markMessageAnimated,
    resetChat: resetStream,
  } = useChatSearchStream<SearchResult>({
    apiUrl: '/api/benefit/search',
    buildBody,
    calcExtraHeight,
    onResultsReceived,
  });

  const handleMessageAnimated = useCallback((index: number) => {
    markMessageAnimated(index);
    setIsAnimating(false);
  }, [markMessageAnimated]);

  const resetChat = useCallback(() => {
    resetStream();
    setIsAnimating(false);
  }, [resetStream]);

  return (
    <Container size="xs" h="100%" py="md" role="main" aria-label="CiviChat 복지 혜택 검색" aria-busy={isInputDisabled}>
      <a href="#chat-input" style={{
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
            <Text size="sm" c="dimmed">나에게 맞는 복지 혜택을 찾아보세요</Text>
          </Group>
        </header>

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <Box flex={1} pos="relative" style={{ overflow: 'hidden' }}>
            <MessageList messages={messages} onMessageAnimated={handleMessageAnimated} />
            {isInputDisabled && (
              <Center
                pos="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                role="status"
                aria-label="검색 중"
                style={{ backgroundColor: 'var(--mantine-color-body)', opacity: 0.6, zIndex: 10 }}
              >
                <Loader size="lg" />
              </Center>
            )}
          </Box>
        )}

        {!isInputDisabled && !isAnimating && messages.some((m) => m.results && m.results.length > 0) && (
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
        <ChatInput onSubmit={handleSubmit} disabled={isInputDisabled || isAnimating} />
      </Stack>
    </Container>
  );
}
