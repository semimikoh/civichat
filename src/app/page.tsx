import { Container, Title, Text, Stack } from '@mantine/core';

export default function HomePage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>CiviChat</Title>
        <Text c="dimmed">
          자연어로 정부 복지 혜택을 찾고, 관련 법령까지 연결해주는 RAG 기반 검색
        </Text>
      </Stack>
    </Container>
  );
}
