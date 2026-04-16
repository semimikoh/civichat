'use client';

import { useState, useCallback, useRef } from 'react';
import { Box, Button, Container, Stack, Group, Title, Text, Center, Loader } from '@mantine/core';
import { ChatInput } from '@/components/benefit/ChatInput';
import { MessageList } from '@/components/benefit/MessageList';
import type { ChatMessage } from '@/components/benefit/types';
import type { SearchResult } from '@/core/benefit/search';
import type { SSEEvent } from '@/core/types/sse';
import { parseSSEStream } from '@/lib/use-sse-stream';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** 전체 입력 비활성화 (fetch 진행 중) */
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  /** 마지막 어시스턴트 메시지 애니메이션 진행 중 */
  const [isAnimating, setIsAnimating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const updateLastAssistant = useCallback((updater: (msg: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const updated = [...prev];
      const idx = updated.findLastIndex((m) => m.role === 'assistant');
      if (idx !== -1) {
        updated[idx] = updater(updated[idx]);
      }
      return updated;
    });
  }, []);

  const handleMessageAnimated = useCallback((index: number) => {
    setMessages((prev) => {
      const visibleMessages = prev.filter((m) => !m.loading);
      const msg = visibleMessages[index];
      if (!msg || msg.animated) return prev;
      // prev 배열에서 해당 메시지의 실제 인덱스 찾기
      const realIdx = prev.indexOf(msg);
      if (realIdx === -1) return prev;
      const updated = [...prev];
      updated[realIdx] = { ...updated[realIdx], animated: true };
      return updated;
    });
    setIsAnimating(false);
  }, []);

  const handleSubmit = async (query: string) => {
    readerRef.current?.cancel();
    readerRef.current = null;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = { role: 'user', content: query };
    const loadingMsg: ChatMessage = { role: 'assistant', content: '', loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsInputDisabled(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => !m.loading)
        .map((m) => ({
          role: m.role,
          content: m.summary
            ? `${m.summary}\n\n[검색 조건: ${m.content}]`
            : m.content,
        }));

      const res = await fetch('/api/benefit/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      });

      if (!res.ok) {
        throw new Error(`서버 오류 (${res.status})`);
      }

      const contentType = res.headers.get('content-type') ?? '';

      // JSON 응답 (질문 모드)
      if (contentType.includes('application/json')) {
        const data = await res.json() as SSEEvent<SearchResult>;
        setIsAnimating(true);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.message ?? data.error ?? '' },
        ]);
        return;
      }

      // SSE 스트리밍 (검색 결과 + 요약)
      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.');
      readerRef.current = reader;

      await parseSSEStream<SearchResult>(reader, {
        onSummaryChunk(_chunk, accumulated) {
          setIsInputDisabled(false);
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findLastIndex((m) => m.role === 'assistant');
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], loading: false, summary: accumulated };
            }
            return updated;
          });
        },
        onResults(message, results, condText) {
          setIsInputDisabled(false);
          setIsAnimating(true);
          updateLastAssistant((msg) => ({
            ...msg,
            loading: false,
            content: message,
            results,
            condText: condText ?? '',
            extraHeight: results.length * (BENEFIT_CARD_HEIGHT + CARD_GAP),
          }));
        },
        onError(message) {
          updateLastAssistant((msg) => ({ ...msg, loading: false, content: message }));
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `오류가 발생했습니다: ${errMsg}` },
      ]);
    } finally {
      readerRef.current = null;
      setIsInputDisabled(false);
    }
  };

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
              onClick={() => { abortRef.current?.abort(); readerRef.current?.cancel(); setMessages([]); setIsInputDisabled(false); setIsAnimating(false); }}
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
