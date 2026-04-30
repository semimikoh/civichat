'use client';

import { ChatMessageList } from '@/components/shared/ChatMessageList';
import {
  AssistantMessage,
  type BenefitAssistantMessage,
  type BenefitChatMessage,
} from '@/components/benefit/AssistantMessage';

export type ChatMessage = BenefitChatMessage;

interface MessageListProps {
  messages: BenefitChatMessage[];
  onMessageAnimated?: (index: number) => void;
}

export function MessageList({ messages, onMessageAnimated }: MessageListProps) {
  return (
    <ChatMessageList
      messages={messages}
      ariaLabel="대화 내역"
      renderAssistant={(msg, visibleIndex) => (
        <AssistantMessage
          msg={msg as BenefitAssistantMessage}
          onAnimationDone={() => onMessageAnimated?.(visibleIndex)}
        />
      )}
    />
  );
}
