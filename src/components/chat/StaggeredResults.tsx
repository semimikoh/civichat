'use client';

import { useState, useEffect, useMemo } from 'react';
import { Stack } from '@mantine/core';
import { BenefitCard } from '@/components/chat/BenefitCard';
import type { SearchResult } from '@/core/search/benefit';

interface StaggeredResultsProps {
  results: SearchResult[];
}

function StaggeredResultsInner({ results }: StaggeredResultsProps) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= results.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 120);

    return () => clearTimeout(timer);
  }, [visibleCount, results.length]);

  return (
    <Stack gap="sm">
      {results.slice(0, visibleCount).map((r, idx) => (
        <div
          key={r.serviceId}
          style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
        >
          <BenefitCard result={r} index={idx} />
        </div>
      ))}
    </Stack>
  );
}

export function StaggeredResults({ results }: StaggeredResultsProps) {
  const key = useMemo(() => results.map((r) => r.serviceId).join(','), [results]);
  return <StaggeredResultsInner key={key} results={results} />;
}
