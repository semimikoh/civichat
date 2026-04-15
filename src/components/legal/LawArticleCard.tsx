'use client';

import { Accordion, Text, Badge, Group, Stack, ActionIcon, Box } from '@mantine/core';
import type { LawSearchResult } from '@/core/legal/search';

interface LawArticleListProps {
  results: LawSearchResult[];
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function LawArticleList({ results }: LawArticleListProps) {
  return (
    <Accordion variant="separated" radius="md">
      {results.map((r, i) => (
        <Accordion.Item key={r.id} value={String(r.id)}>
          <Accordion.Control>
            <Stack gap={2}>
              <Group gap="xs" wrap="nowrap">
                <Text fw={700} size="sm" flex={1} lineClamp={1}>
                  {i + 1}. {r.lawTitle}
                </Text>
                <Badge size="xs" variant="outline" color="gray" flex="none">{r.lawType}</Badge>
              </Group>
              {r.chapter && (
                <Text size="xs" c="dimmed">{r.chapter}</Text>
              )}
              <Text size="sm" fw={600} c="blue.7">
                {r.articleNumber} ({r.articleTitle})
              </Text>
            </Stack>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Box
                p="sm"
                style={{
                  backgroundColor: 'var(--mantine-color-default-hover)',
                  borderRadius: 'var(--mantine-radius-sm)',
                  borderLeft: '3px solid var(--mantine-color-blue-4)',
                }}
              >
                <Text size="sm" style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {r.articleContent}
                </Text>
              </Box>
              {r.sourceUrl && (
                <Group gap="xs">
                  <ActionIcon
                    component="a"
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="subtle"
                    size="sm"
                    aria-label={`${r.lawTitle} 법령 원문 보기 (새 창)`}
                  >
                    <LinkIcon />
                  </ActionIcon>
                  <Text
                    component="a"
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                    c="blue"
                    style={{ textDecoration: 'none' }}
                  >
                    법령 원문 보기
                  </Text>
                </Group>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
