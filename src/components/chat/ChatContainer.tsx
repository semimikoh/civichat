'use client';

import { useState, useRef, useEffect } from 'react';
import { Container, Stack, Title, Text, ScrollArea, Center } from '@mantine/core';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList, type ChatMessage } from '@/components/chat/MessageList';
import type { SearchResult } from '@/core/search/benefit';

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

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
  const [loading, setLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (query: string) => {
    const userMsg: ChatMessage = { role: 'user', content: query };
    const loadingMsg: ChatMessage = { role: 'assistant', content: '검색 중...', loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`서버 오류 (${res.status})`);
      }

      const data: SearchResponse = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.error ?? '검색 중 오류가 발생했습니다.' },
        ]);
      } else {
        const count = data.results.length;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: count > 0
              ? `${count}건의 혜택을 찾았습니다.`
              : '조건에 맞는 혜택을 찾지 못했습니다. 다른 키워드로 검색해보세요.',
            results: data.results,
          },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `검색 중 오류가 발생했습니다: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" h="100dvh" py="md" role="main" aria-label="CiviChat 복지 혜택 검색">
      <Stack h="100%" gap="md">
        <header>
          <Title order={2}>CiviChat</Title>
          <Text size="sm" c="dimmed">
            자연어로 정부 복지 혜택을 검색하세요
          </Text>
        </header>

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea flex={1} viewportRef={viewportRef}>
            <MessageList messages={messages} />
          </ScrollArea>
        )}

        <ChatInput onSubmit={handleSubmit} disabled={loading} />
      </Stack>
    </Container>
  );
}
