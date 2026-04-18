import type { SearchResult } from '@/core/benefit/search';
import type { BaseChatMessage } from '@/lib/use-chat-search-stream';

export type ChatMessage = BaseChatMessage<SearchResult>;
