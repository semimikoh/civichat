'use client';

import { Center, Container, Group, Stack, Text, Title } from '@mantine/core';

export function ChatContainer() {
  return (
    <Container size="xs" h="100%" py="md">
      <Stack h="100%" gap="md">
        <header>
          <Group gap="xs" align="baseline">
            <Title order={1} size="h2">CiviChat</Title>
            <Text size="sm" c="dimmed">궁금한 법령, 쉽게 찾아보세요</Text>
          </Group>
        </header>

        <Center flex={1}>
          <Stack align="center" gap="xs">
            <Title order={3} c="dimmed">법령 검색</Title>
            <Text size="sm" c="dimmed" ta="center">
              곧 지원됩니다 (v2)
            </Text>
          </Stack>
        </Center>
      </Stack>
    </Container>
  );
}
