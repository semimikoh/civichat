'use client';

import { Card, Text, Badge, Group, Stack, Anchor, Divider } from '@mantine/core';
import type { SearchResult } from '@/core/search/benefit';

interface BenefitCardProps {
  result: SearchResult;
  index: number;
}

export function BenefitCard({ result, index }: BenefitCardProps) {
  return (
    <Card withBorder padding="md" radius="md" role="article" aria-label={result.serviceName}>
      <Group justify="space-between" mb="xs">
        <Text fw={700} size="sm" lineClamp={1} flex={1}>
          {index + 1}. {result.serviceName}
        </Text>
        <Badge size="sm" variant="light" color="blue" flex="none">
          {(result.similarity * 100).toFixed(0)}% 일치
        </Badge>
      </Group>

      {result.supportType && (
        <Group gap="xs" mb="xs">
          {result.supportType.split('||').map((type) => (
            <Badge key={type} size="xs" variant="outline">
              {type.trim()}
            </Badge>
          ))}
        </Group>
      )}

      <Stack gap="xs">
        <div>
          <Text size="xs" fw={600} c="dimmed">지원대상</Text>
          <Text size="sm" lineClamp={3}>{result.targetAudience || '-'}</Text>
        </div>

        <div>
          <Text size="xs" fw={600} c="dimmed">지원내용</Text>
          <Text size="sm" lineClamp={3}>{result.supportContent || '-'}</Text>
        </div>

        <Divider />

        <Group gap="lg">
          <div>
            <Text size="xs" fw={600} c="dimmed">신청방법</Text>
            <Text size="xs">{result.applicationMethod || '-'}</Text>
          </div>
          <div>
            <Text size="xs" fw={600} c="dimmed">소관기관</Text>
            <Text size="xs">{result.managingAgency || '-'}</Text>
          </div>
        </Group>

        {result.contactPhone && (
          <div>
            <Text size="xs" fw={600} c="dimmed">문의</Text>
            <Text size="xs">{result.contactPhone}</Text>
          </div>
        )}

        <Group gap="md">
          {result.detailUrl && (
            <Anchor
              href={result.detailUrl}
              target="_blank"
              size="xs"
            >
              상세 정보
            </Anchor>
          )}
          {result.onlineApplicationUrl && (
            <Anchor
              href={result.onlineApplicationUrl}
              target="_blank"
              size="xs"
            >
              온라인 신청
            </Anchor>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
