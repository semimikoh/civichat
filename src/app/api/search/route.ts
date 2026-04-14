import { NextResponse } from 'next/server';
import { searchBenefits, type SearchOptions } from '@/core/search/benefit';

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const { query, count, age, gender } = body as Record<string, unknown>;

  if (!query || typeof query !== 'string') {
    return NextResponse.json(
      { error: '검색어(query)가 필요합니다.' },
      { status: 400 },
    );
  }

  const options: SearchOptions = {
    query,
    matchCount: typeof count === 'number' ? count : 10,
    ageFilter: typeof age === 'number' ? age : undefined,
    genderFilter: typeof gender === 'string' ? gender : undefined,
  };

  const results = await searchBenefits(options);

  return NextResponse.json({ results });
}
