'use client';

import { useState, useRef } from 'react';
import { Box, Container, Stack, Group, Title, Text, Center, Loader, Paper } from '@mantine/core';
import Markdown from 'react-markdown';
import { LawArticleList } from '@/components/legal/LawArticleCard';
import { useTypewriter } from '@/lib/use-typewriter';
import { useMessageVirtualizer } from '@/lib/text-layout/use-message-height';
import { USER_BUBBLE_WIDTH_RATIO } from '@/lib/text-layout/prepared';
import type { LawSearchResult } from '@/core/legal/search';
import { SSE_EVENT } from '@/core/types/sse';

interface LawChatMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  results?: LawSearchResult[];
  /** 가상 스크롤 높이 계산용 (results를 lawResults로 매핑) */
  lawResults?: { id: number }[];
  loading?: boolean;
}

interface SSEEvent {
  type: string;
  message?: string;
  results?: LawSearchResult[];
  text?: string;
  error?: string;
}

const SAMPLE_RESULTS: LawSearchResult[] = [
  {
    id: 0,
    lawTitle: '청년기본법',
    lawType: '법률',
    chapter: '제4장 청년의 권익증진을 위한 시책',
    articleNumber: '제20조',
    articleTitle: '청년 주거지원',
    articleContent: '국가와 지방자치단체는 청년의 주거 안정 및 주거 수준 향상을 위한 대책을 마련하여야 한다.',
    sourceUrl: 'https://www.law.go.kr/법령/청년기본법',
    similarity: 0.56,
  },
  {
    id: 1,
    lawTitle: '장애인고용촉진 및 직업재활법',
    lawType: '법률',
    chapter: '제3장 장애인 고용 의무 및 부담금',
    articleNumber: '제27조',
    articleTitle: '국가와 지방자치단체의 장애인 고용 의무',
    articleContent: '① 국가와 지방자치단체의 장은 장애인을 소속 공무원 정원에 대하여 다음 각 호의 구분에 해당하는 비율 이상 고용하여야 한다.\n1. 2021년 1월 1일부터 2021년 12월 31일까지: 1천분의 34\n2. 2022년 1월 1일부터 2023년 12월 31일까지: 1천분의 36\n3. 2024년 이후: 1천분의 38\n② 국가와 지방자치단체의 각 시험 실시 기관의 장은 신규채용시험을 실시할 때 장애인이 제1항 각 호의 비율 이상 채용하도록 하여야 한다.',
    sourceUrl: 'https://www.law.go.kr/법령/장애인고용촉진및직업재활법',
    similarity: 0.65,
  },
];

function EmptyState() {
  return (
    <Stack flex={1} gap="md" justify="center">
      <Stack align="center" gap="xs">
        <Title order={3} c="dimmed">CiviChat</Title>
        <Text size="sm" c="dimmed" ta="center">
          궁금한 법령을 검색해보세요
        </Text>
        <Stack gap={4} mt="sm">
          <Text size="xs" c="dimmed">&quot;장애인 고용 의무&quot;</Text>
          <Text size="xs" c="dimmed">&quot;청년 주거 지원 법령&quot;</Text>
          <Text size="xs" c="dimmed">&quot;아동학대 처벌 규정&quot;</Text>
        </Stack>
      </Stack>
      <Box>
        <Text size="xs" c="dimmed" mb="xs">검색 결과 예시</Text>
        <LawArticleList results={SAMPLE_RESULTS} />
      </Box>
    </Stack>
  );
}

function AssistantMessage({ msg }: { msg: LawChatMessage }) {
  const hasResults = msg.results && msg.results.length > 0;
  const { visibleText: visibleSummary, isDone: summaryDone } = useTypewriter(msg.summary ?? '', {
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
      {hasResults && summaryDone && (
        <LawArticleList results={msg.results!} />
      )}
    </>
  );
}

function ChatInput({ onSubmit, disabled }: { onSubmit: (msg: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
        <input
          ref={inputRef}
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '16px',
            border: '1px solid var(--mantine-color-gray-4)',
            borderRadius: 'var(--mantine-radius-md)',
            outline: 'none',
          }}
          placeholder="어떤 법령을 찾고 계신가요?"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          disabled={disabled}
          aria-label="검색어 입력"
          autoFocus
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="검색"
          style={{
            padding: '10px 16px',
            fontSize: '16px',
            border: 'none',
            borderRadius: 'var(--mantine-radius-md)',
            backgroundColor: 'var(--mantine-color-blue-6)',
            color: 'white',
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            opacity: disabled || !value.trim() ? 0.5 : 1,
          }}
        >
          &rarr;
        </button>
      </Group>
    </form>
  );
}

export function ChatContainer() {
  const [messages, setMessages] = useState<LawChatMessage[]>([]);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const visibleMessages = messages.filter((m) => !m.loading);
  const { virtualizer, scrollRef } = useMessageVirtualizer(visibleMessages);

  const handleSubmit = async (query: string) => {
    readerRef.current?.cancel();
    readerRef.current = null;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: LawChatMessage = { role: 'user', content: query };
    const loadingMsg: LawChatMessage = { role: 'assistant', content: '', loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsInputDisabled(true);

    try {
      const res = await fetch('/api/legal/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, count: 10 }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);

      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const data = await res.json() as SSEEvent;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.message ?? data.error ?? '' },
        ]);
        return;
      }

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
            continue;
          }

          if (event.type === SSE_EVENT.SUMMARY_CHUNK && event.text) {
            summaryText += event.text;
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
            const lawResults = (event.results as LawSearchResult[]) ?? [];
            setMessages((prev) => {
              const updated = [...prev];
              const idx = updated.findLastIndex((m) => m.role === 'assistant');
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  loading: false,
                  content: event.message ?? '',
                  results: lawResults,
                  lawResults: lawResults.map((r) => ({ id: r.id })),
                };
              }
              return updated;
            });
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
    <Container size="xs" h="100%" py="md" role="main" aria-label="CiviChat 법령 검색" aria-busy={isInputDisabled}>
      <a href="#legal-chat-input" className="sr-only" style={{
        position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden',
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
                          bg={isUser ? 'blue.6' : 'gray.0'}
                          style={{
                            maxWidth: isUser
                              ? `${USER_BUBBLE_WIDTH_RATIO * 100}%`
                              : '95%',
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
