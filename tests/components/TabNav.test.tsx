import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { TabNav } from '@/components/home/TabNav';

const mockPush = vi.fn();
let mockPathname = '/benefit';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('TabNav', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/benefit';
  });

  it('복지, 법령 탭을 렌더링한다', () => {
    renderWithMantine(<TabNav />);

    expect(screen.getByRole('tab', { name: '복지' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '법령' })).toBeInTheDocument();
  });

  it('/benefit 경로에서 복지 탭이 활성화된다', () => {
    mockPathname = '/benefit';
    renderWithMantine(<TabNav />);

    expect(screen.getByRole('tab', { name: '복지' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '법령' })).toHaveAttribute('aria-selected', 'false');
  });

  it('/legal 경로에서 법령 탭이 활성화된다', () => {
    mockPathname = '/legal';
    renderWithMantine(<TabNav />);

    expect(screen.getByRole('tab', { name: '법령' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '복지' })).toHaveAttribute('aria-selected', 'false');
  });

  it('법령 탭 클릭 시 /legal로 라우팅한다', async () => {
    const user = userEvent.setup();
    renderWithMantine(<TabNav />);

    await user.click(screen.getByRole('tab', { name: '법령' }));
    expect(mockPush).toHaveBeenCalledWith('/legal');
  });

  it('복지 탭 클릭 시 /benefit으로 라우팅한다', async () => {
    const user = userEvent.setup();
    mockPathname = '/legal';
    renderWithMantine(<TabNav />);

    await user.click(screen.getByRole('tab', { name: '복지' }));
    expect(mockPush).toHaveBeenCalledWith('/benefit');
  });
});
