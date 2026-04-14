'use client';

import { useState, useEffect, useRef } from 'react';
import { Stack } from '@mantine/core';
import { BenefitCard } from '@/components/chat/BenefitCard';
import type { SearchResult } from '@/core/search/benefit';

interface StaggeredResultsProps {
  results: SearchResult[];
}

export function StaggeredResults({ results }: StaggeredResultsProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const resultsRef = useRef(results);

  useEffect(() => {
    resultsRef.current = results;
    setVisibleCount(0);
    if (results.length === 0) return;

    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      // results가 변경되었으면 이전 interval 무시
      if (resultsRef.current !== results) {
        clearInterval(interval);
        return;
      }
      setVisibleCount(count);
      if (count >= results.length) {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [results]);

  return (
    <Stack gap="sm">
      {results.slice(0, visibleCount).map((r, idx) => (
        <div
          key={r.serviceId}
          style={{
            animation: 'fadeSlideIn 0.3s ease-out',
          }}
        >
          <BenefitCard result={r} index={idx} />
        </div>
      ))}
    </Stack>
  );
}
