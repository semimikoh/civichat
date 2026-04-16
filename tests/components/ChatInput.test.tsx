import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { ChatInput } from '@/components/benefit/ChatInput';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('ChatInput', () => {
  it('빈 입력은 제출하지 않는다', async () => {
    const onSubmit = vi.fn();
    renderWithMantine(<ChatInput onSubmit={onSubmit} />);

    const button = screen.getByRole('button', { name: '검색' });
    expect(button).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('공백만 입력하면 제출하지 않는다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithMantine(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: '검색어 입력' });
    await user.type(input, '   ');

    const form = screen.getByRole('search');
    await user.type(input, '{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('텍스트 입력 후 제출하면 trimmed 값이 전달되고 입력이 초기화된다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithMantine(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: '검색어 입력' });
    await user.type(input, '  육아 지원금  ');
    await user.type(input, '{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('육아 지원금');
    expect(input).toHaveValue('');
  });

  it('disabled 상태에서는 입력과 버튼이 비활성화된다', () => {
    const onSubmit = vi.fn();
    renderWithMantine(<ChatInput onSubmit={onSubmit} disabled />);

    const input = screen.getByRole('textbox', { name: '검색어 입력' });
    const button = screen.getByRole('button', { name: '검색' });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('제출 버튼 클릭으로도 제출된다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithMantine(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: '검색어 입력' });
    await user.type(input, '청년 주거');

    const button = screen.getByRole('button', { name: '검색' });
    await user.click(button);

    expect(onSubmit).toHaveBeenCalledWith('청년 주거');
  });
});
