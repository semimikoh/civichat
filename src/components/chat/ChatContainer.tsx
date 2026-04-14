'use client';

import { useState, useRef, useEffect } from 'react';
import { Container, Stack, Title, Text, ScrollArea } from '@mantine/core';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList, type ChatMessage } from '@/components/chat/MessageList';
import type { SearchResult } from '@/core/search/benefit';

interface SearchResponse {
  results: SearchResult[];
  error?: string;
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
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

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
              : '조건에 맞는 혜택을 찾지 못했습니다.',
            results: data.results,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: '검색 중 오류가 발생했습니다. 다시 시도해주세요.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" h="100vh" py="md">
      <Stack h="100%" gap="md">
        <div>
          <Title order={2}>CiviChat</Title>
          <Text size="sm" c="dimmed">
            자연어로 정부 복지 혜택을 검색하세요
          </Text>
        </div>

        <ScrollArea flex={1} viewportRef={viewportRef}>
          <MessageList messages={messages} />
        </ScrollArea>

        <ChatInput onSubmit={handleSubmit} disabled={loading} />
      </Stack>
    </Container>
  );
}
