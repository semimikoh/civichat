'use client';

import { Card, Text, Badge, Group, Stack, ActionIcon, Divider } from '@mantine/core';
import { ExternalLinkIcon } from '@/components/ExternalLinkIcon';
import type { SearchResult } from '@/features/benefit/types';
import { getSafeUrl } from '@/lib/safe-url';
import { CARD_GAP } from '@/features/chat/lib/message-height';

interface BenefitCardProps {
  result: SearchResult;
  index: number;
  condText?: string;
}

/** 복지 카드 추정 높이 — extraHeight 계산과 반드시 일치시킬 것 */
export const BENEFIT_CARD_HEIGHT = 200;

/** 결과 목록의 전체 추가 높이. ChatContainer의 calcExtraHeight에서 사용. */
export function getBenefitResultsExtraHeight(count: number): number {
  return count * (BENEFIT_CARD_HEIGHT + CARD_GAP);
}

export function BenefitCard({ result, index, condText }: BenefitCardProps) {
  const linkUrl = getSafeUrl(result.detailUrl) ?? getSafeUrl(result.onlineApplicationUrl);
  const matchTags = condText ? condText.split(' / ').filter(Boolean) : [];

  return (
    <Card withBorder padding="md" radius="md" role="article" aria-label={result.serviceName}>
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" flex={1} style={{ minWidth: 0 }}>
          <Text fw={700} size="sm" lineClamp={1} flex={1}>
            {index + 1}. {result.serviceName}
          </Text>
          <Badge size="xs" variant="light" color="blue" flex="none">
            {(result.similarity * 100).toFixed(0)}%
          </Badge>
        </Group>
        {linkUrl && (
          <ActionIcon
            component="a"
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            size="sm"
            aria-label={`${result.serviceName} 상세 페이지 열기 (새 창)`}
            flex="none"
          >
            <ExternalLinkIcon />
          </ActionIcon>
        )}
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

      {matchTags.length > 0 && (
        <Group gap={4} mb="xs">
          {matchTags.map((tag) => (
            <Badge key={tag} size="xs" variant="light" color="teal">
              {tag}
            </Badge>
          ))}
          <Text size="xs" c="dimmed">조건 매칭</Text>
        </Group>
      )}

      <Stack gap="xs">
        <div>
          <Text size="xs" fw={600} c="dimmed">지원대상</Text>
          <Text size="sm" lineClamp={3} style={{ whiteSpace: 'pre-line' }}>{result.targetAudience || '-'}</Text>
        </div>

        <div>
          <Text size="xs" fw={600} c="dimmed">지원내용</Text>
          <Text size="sm" lineClamp={3} style={{ whiteSpace: 'pre-line' }}>{result.supportContent || '-'}</Text>
        </div>

        <Divider />

        <Group gap="lg">
          <div>
            <Text size="xs" fw={600} c="dimmed">신청방법</Text>
            <Text size="xs" style={{ whiteSpace: 'pre-line' }}>{result.applicationMethod || '-'}</Text>
          </div>
          <div>
            <Text size="xs" fw={600} c="dimmed">소관기관</Text>
            <Text size="xs">{result.managingAgency || '-'}</Text>
          </div>
        </Group>

        {result.contactPhone && (
          <div>
            <Text size="xs" fw={600} c="dimmed">문의</Text>
            <Text size="xs">{result.contactPhone.split('||').join(' / ')}</Text>
          </div>
        )}
      </Stack>
    </Card>
  );
}
