'use client';

import { TextInput, ActionIcon, Group } from '@mantine/core';
import { useState } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <Group gap="xs">
      <TextInput
        flex={1}
        placeholder="어떤 혜택을 찾고 계신가요?"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            handleSubmit();
          }
        }}
        disabled={disabled}
        size="md"
      />
      <ActionIcon
        size="lg"
        variant="filled"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="검색"
      >
        &rarr;
      </ActionIcon>
    </Group>
  );
}
