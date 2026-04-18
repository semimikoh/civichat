import '@testing-library/jest-dom/vitest';

// Node 환경(eval 테스트 등)에서는 브라우저 mock 스킵
if (typeof window !== 'undefined') {
  // Mantine이 jsdom에서 필요로 하는 브라우저 API mock
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // ResizeObserver mock (Mantine 일부 컴포넌트에서 사용)
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}
