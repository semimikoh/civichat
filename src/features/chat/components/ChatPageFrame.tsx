'use client';

import type { ReactNode } from 'react';
import { Container, Group, Stack, Text, Title } from '@mantine/core';
import { SkipLink } from '@/components/SkipLink';

interface ChatPageFrameProps {
  a11y: {
    mainLabel: string;
    skipHref: string;
    busy: boolean;
  };
  heading: {
    title: string;
    description: string;
  };
  children: ReactNode;
}

export function ChatPageFrame({ a11y, heading, children }: ChatPageFrameProps) {
  return (
    <Container size="xs" h="100%" py="md" role="main" aria-label={a11y.mainLabel} aria-busy={a11y.busy}>
      <SkipLink href={a11y.skipHref} />
      <Stack h="100%" gap="md">
        <header>
          <Group gap="xs" align="baseline">
            <Title order={1} size="h2">{heading.title}</Title>
            <Text size="sm" c="dimmed">{heading.description}</Text>
          </Group>
        </header>
        {children}
      </Stack>
    </Container>
  );
}
