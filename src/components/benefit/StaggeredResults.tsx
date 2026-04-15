'use client';

import { useState, useEffect, useMemo } from 'react';
import { Stack, Text, Card as MantineCard } from '@mantine/core';
import { BenefitCard } from '@/components/benefit/BenefitCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { SearchResult } from '@/core/benefit/search';

interface StaggeredResultsProps {
  results: SearchResult[];
  condText?: string;
}

interface RegionGroup {
  region: string;
  results: SearchResult[];
}

function groupByRegion(results: SearchResult[]): RegionGroup[] {
  const groups = new Map<string, SearchResult[]>();

  for (const r of results) {
    const parts = (r.managingAgency || '').split(/\s+/);
    const region = parts[0] || '기타';
    const existing = groups.get(region);
    if (existing) {
      existing.push(r);
    } else {
      groups.set(region, [r]);
    }
  }

  return Array.from(groups, ([region, items]) => ({ region, results: items }));
}

function StaggeredResultsInner({ results, condText }: StaggeredResultsProps) {
  const [visibleCount, setVisibleCount] = useState(1);
  const regionGroups = useMemo(() => groupByRegion(results), [results]);

  const flatItems = useMemo(() => {
    const items: { type: 'header'; region: string; key: string }[] | { type: 'card'; result: SearchResult; globalIndex: number; key: string }[] = [];
    let globalIndex = 0;
    for (const group of regionGroups) {
      (items as { type: 'header'; region: string; key: string }[]).push({ type: 'header', region: group.region, key: `header-${group.region}` });
      for (const r of group.results) {
        (items as { type: 'card'; result: SearchResult; globalIndex: number; key: string }[]).push({ type: 'card', result: r, globalIndex, key: r.serviceId });
        globalIndex++;
      }
    }
    return items as ({ type: 'header'; region: string; key: string } | { type: 'card'; result: SearchResult; globalIndex: number; key: string })[];
  }, [regionGroups]);

  useEffect(() => {
    if (visibleCount >= flatItems.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 120);

    return () => clearTimeout(timer);
  }, [visibleCount, flatItems.length]);

  return (
    <Stack gap="sm">
      {flatItems.slice(0, visibleCount).map((item) => {
        if (item.type === 'header') {
          return (
            <Text key={item.key} size="xs" fw={700} c="dimmed" mt="xs">
              {item.region}
            </Text>
          );
        }
        return (
          <div
            key={item.key}
            style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
          >
            <ErrorBoundary
              fallback={
                <MantineCard withBorder padding="md" radius="md">
                  <Text size="sm" c="dimmed">카드를 표시할 수 없습니다.</Text>
                </MantineCard>
              }
            >
              <BenefitCard result={item.result} index={item.globalIndex} condText={condText} />
            </ErrorBoundary>
          </div>
        );
      })}
    </Stack>
  );
}

export function StaggeredResults({ results, condText }: StaggeredResultsProps) {
  const key = useMemo(() => results.map((r) => r.serviceId).join(','), [results]);
  return <StaggeredResultsInner key={key} results={results} condText={condText} />;
}
