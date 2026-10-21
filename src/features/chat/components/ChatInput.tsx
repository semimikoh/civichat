'use client';

import { TextInput, ActionIcon, Group } from '@mantine/core';
import { useRef, useState, useEffect } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  formId?: string;
  formAriaLabel?: string;
}

export function ChatInput({
  onSubmit,
  disabled,
  placeholder = '어떤 혜택을 찾고 계신가요?',
  formId = 'chat-input',
  formAriaLabel = '검색',
}: ChatInputProps) {
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
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      id={formId}
      role="search"
      aria-label={formAriaLabel}
    >
      <Group gap="xs">
        <TextInput
          ref={inputRef}
          flex={1}
          placeholder={placeholder}
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
