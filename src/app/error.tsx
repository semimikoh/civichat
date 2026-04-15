'use client';

import { Button, Center, Stack, Text, Title } from '@mantine/core';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <Title order={3} c="dimmed">문제가 발생했습니다</Title>
        <Text size="sm" c="dimmed">
          일시적인 오류가 발생했습니다. 다시 시도해 주세요.
        </Text>
        <Button variant="light" onClick={reset}>
          다시 시도
        </Button>
      </Stack>
    </Center>
  );
}
