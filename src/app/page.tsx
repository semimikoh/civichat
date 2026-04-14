'use client';

import { useState } from 'react';
import { Tabs, Box, Container } from '@mantine/core';
import { BenefitChatContainer } from '@/components/benefit/ChatContainer';
import { LegalChatContainer } from '@/components/legal/LegalChatContainer';

type TabValue = 'benefit' | 'legal';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabValue>('benefit');

  return (
    <Box h="100dvh" style={{ display: 'flex', flexDirection: 'column' }}>
      <Container size="xs" pt="sm">
        <Tabs
          value={activeTab}
          onChange={(v) => setActiveTab((v as TabValue) ?? 'benefit')}
        >
          <Tabs.List>
            <Tabs.Tab value="benefit">복지</Tabs.Tab>
            <Tabs.Tab value="legal">법령</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Container>

      <Box flex={1} style={{ overflow: 'hidden', position: 'relative' }}>
        <Box
          h="100%"
          style={{ display: activeTab === 'benefit' ? 'block' : 'none' }}
        >
          <BenefitChatContainer />
        </Box>
        <Box
          h="100%"
          style={{ display: activeTab === 'legal' ? 'block' : 'none' }}
        >
          <LegalChatContainer />
        </Box>
      </Box>
    </Box>
  );
}
