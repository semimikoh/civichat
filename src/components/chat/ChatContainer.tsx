'use client';

import { useState, useRef, useEffect } from 'react';
import { Container, Stack, Title, Text, ScrollArea, Center, Loader } from '@mantine/core';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList, type ChatMessage } from '@/components/chat/MessageList';
import type { SearchResult } from '@/core/search/benefit';

interface ApiResponse {
  type: 'results' | 'question';
  message: string;
  results?: SearchResult[];
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
    const loadingMsg: ChatMessage = { role: 'assistant', content: '', loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // 대화 히스토리 구성 (결과 제외, 텍스트만)
      const history = [...messages, userMsg]
        .filter((m) => !m.loading)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history }),
      });

      if (!res.ok) {
        throw new Error(`서버 오류 (${res.status})`);
      }

      const data: ApiResponse = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.error ?? '오류가 발생했습니다.' },
        ]);
      } else if (data.type === 'question') {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.message },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.message, results: data.results },
        ]);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `오류가 발생했습니다: ${errMsg}` },
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
          <ScrollArea flex={1} viewportRef={viewportRef} pos="relative">
            <MessageList messages={messages} />
            {loading && (
              <Center
                pos="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                style={{ backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 10 }}
              >
                <Loader size="lg" />
              </Center>
            )}
          </ScrollArea>
        )}

        <ChatInput onSubmit={handleSubmit} disabled={loading} />
      </Stack>
    </Container>
  );
}
