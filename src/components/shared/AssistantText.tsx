'use client';

import { useEffect, useRef } from 'react';
import { Box, Text, VisuallyHidden } from '@mantine/core';
import Markdown from 'react-markdown';
import { useTypewriter } from '@/hooks/use-typewriter';
import { TYPEWRITER_INTERVAL_MS } from '@/components/shared/chat-timing';
import type { AssistantMessage } from '@/hooks/use-chat-messages';

const SUMMARY_ALLOWED_ELEMENTS = ['p', 'strong', 'em', 'br', 'ol', 'ul', 'li'];

interface AssistantTextProps {
  msg: AssistantMessage<unknown>;
  /** 아래에 결과 목록이 이어지는지 (여백 조정용) */
  hasResultsBelow: boolean;
  /** 텍스트 타이핑이 끝났을 때 한 번 호출된다. 이미 애니메이션을 마친 메시지면 호출하지 않는다. */
  onTextDone?: () => void;
}

/**
 * 어시스턴트 응답 텍스트(요약 마크다운 또는 일반 문구)를 타이프라이터로 보여준다.
 * 스크린리더에는 글자 단위 변화 대신 완성된 문장을 한 번만 읽힌다.
 */
export function AssistantText({ msg, hasResultsBelow, onTextDone }: AssistantTextProps) {
  const skipAnimation = Boolean(msg.animated);
  const text = msg.summary ?? msg.content;

  const { visibleText, isDone } = useTypewriter(text, {
    interval: TYPEWRITER_INTERVAL_MS,
    enabled: Boolean(text) && !skipAnimation,
  });

  const calledRef = useRef(false);
  useEffect(() => {
    if (calledRef.current || skipAnimation || !isDone) return;
    calledRef.current = true;
    onTextDone?.();
  }, [isDone, skipAnimation, onTextDone]);

  return (
    <>
      {msg.summary && (
        <Box mb={hasResultsBelow ? 'sm' : 0} fz="sm" aria-hidden>
          <Markdown allowedElements={SUMMARY_ALLOWED_ELEMENTS} unwrapDisallowed>
            {visibleText}
          </Markdown>
        </Box>
      )}
      {!msg.summary && msg.content && (
        <Text size="sm" style={{ whiteSpace: 'pre-line' }} aria-hidden>
          {visibleText}
        </Text>
      )}
      {isDone && text && <VisuallyHidden>{text}</VisuallyHidden>}
      {msg.summaryError && (
        <Text size="xs" c="dimmed" mb={hasResultsBelow ? 'sm' : 0}>
          {msg.summaryError}
        </Text>
      )}
    </>
  );
}
