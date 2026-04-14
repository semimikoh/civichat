import { NextResponse } from 'next/server';
import { searchBenefits, type ConversationMessage } from '@/core/search/benefit';

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const { query, history, count } = body as Record<string, unknown>;

  if (!query || typeof query !== 'string') {
    return NextResponse.json(
      { error: '검색어(query)가 필요합니다.' },
      { status: 400 },
    );
  }

  const response = await searchBenefits({
    query,
    history: Array.isArray(history) ? history as ConversationMessage[] : [],
    matchCount: typeof count === 'number' ? count : 10,
  });

  return NextResponse.json(response);
}
