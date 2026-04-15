'use client';

import { useState, useCallback, useRef } from 'react';
import { Box, Container, Stack, Group, Title, Text, Center, Loader } from '@mantine/core';
import { ChatInput } from '@/components/benefit/ChatInput';
import { MessageList } from '@/components/benefit/MessageList';
import type { ChatMessage, SSEEvent } from '@/components/benefit/types';
import { SSE_EVENT } from '@/core/types/sse';

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
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`서버 오류 (${res.status})`);
      }

      const contentType = res.headers.get('content-type') ?? '';

      // JSON 응답 (질문 모드)
      if (contentType.includes('application/json')) {
        const data = await res.json() as SSEEvent;
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

      const decoder = new TextDecoder();
      let buffer = '';
      let summaryText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);
          if (!json) continue;

          let event: SSEEvent;
          try {
            event = JSON.parse(json) as SSEEvent;
          } catch {
            console.error('SSE JSON 파싱 실패:', json);
            continue;
          }

          if (event.type === SSE_EVENT.SUMMARY_CHUNK && event.text) {
            summaryText += event.text;
            // 요약 스트리밍 시작 시 로딩 해제 + 요약 텍스트 표시
            setIsInputDisabled(false);
            setMessages((prev) => {
              const updated = [...prev];
              const idx = updated.findLastIndex((m) => m.role === 'assistant');
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], loading: false, summary: summaryText };
              }
              return updated;
            });
          }

          if (event.type === SSE_EVENT.RESULTS) {
            setIsInputDisabled(false);
            updateLastAssistant((msg) => ({
              ...msg,
              loading: false,
              content: event.message ?? '',
              results: event.results,
            }));
          }
        }
      }
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
      <a href="#chat-input" className="sr-only" style={{
        position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden',
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
            <MessageList messages={messages} />
            {isInputDisabled && (
              <Center
                pos="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                role="status"
                aria-label="검색 중"
                style={{ backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 10 }}
              >
                <Loader size="lg" />
              </Center>
            )}
          </Box>
        )}

        <ChatInput onSubmit={handleSubmit} disabled={isInputDisabled} />
      </Stack>
    </Container>
  );
}
