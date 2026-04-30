import { Center, Stack, Title, Text } from '@mantine/core';

interface EmptyStateProps {
  subtitle: string;
  hints: string[];
}

export function EmptyState({ subtitle, hints }: EmptyStateProps) {
  return (
    <Center flex={1}>
      <Stack align="center" gap="xs">
        <Title order={3} c="dimmed">CiviChat</Title>
        <Text size="sm" c="dimmed" ta="center">{subtitle}</Text>
        <Stack gap={4} mt="sm">
          {hints.map((hint) => (
            <Text key={hint} size="xs" c="dimmed">&quot;{hint}&quot;</Text>
          ))}
        </Stack>
      </Stack>
    </Center>
  );
}
