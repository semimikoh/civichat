'use client';

import { Tabs } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';

const TAB_ROUTES = [
  { value: 'benefit', label: '복지' },
  { value: 'legal', label: '법령' },
] as const;

export function TabNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = TAB_ROUTES.find((t) => pathname.startsWith(`/${t.value}`))?.value ?? 'benefit';

  return (
    <Tabs
      value={activeTab}
      onChange={(v) => {
        if (v) router.push(`/${v}`);
      }}
    >
      <Tabs.List>
        {TAB_ROUTES.map((t) => (
          <Tabs.Tab key={t.value} value={t.value}>{t.label}</Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
