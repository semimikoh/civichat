'use client';

import { TextInput, ActionIcon, Group } from '@mantine/core';
import { useRef, useState } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
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
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      id="chat-input"
      role="search"
      aria-label="복지 혜택 검색"
    >
      <Group gap="xs">
        <TextInput
          ref={inputRef}
          flex={1}
          placeholder="어떤 혜택을 찾고 계신가요?"
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
