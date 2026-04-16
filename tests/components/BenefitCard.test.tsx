import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { BenefitCard } from '@/components/benefit/BenefitCard';
import type { SearchResult } from '@/core/benefit/search';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    serviceId: 'SVC001',
    serviceName: '청년 월세 지원',
    servicePurpose: '청년 주거 안정',
    supportType: '현금||현물',
    targetAudience: '만 19세~34세 청년',
    selectionCriteria: '소득 기준 충족',
    supportContent: '월 최대 20만원',
    applicationMethod: '온라인 신청',
    applicationDeadline: '2026-12-31',
    contactAgency: '주거복지센터',
    contactPhone: '1600-0000||02-1234-5678',
    onlineApplicationUrl: 'https://example.com/apply',
    detailUrl: 'https://example.com/detail',
    managingAgency: '서울특별시',
    law: '',
    similarity: 0.9523,
    ...overrides,
  };
}

describe('BenefitCard', () => {
  it('서비스명과 유사도를 표시한다', () => {
    renderWithMantine(<BenefitCard result={makeResult()} index={0} />);

    expect(screen.getByText(/청년 월세 지원/)).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('지원유형 배지를 렌더링한다', () => {
    renderWithMantine(<BenefitCard result={makeResult()} index={0} />);

    expect(screen.getByText('현금')).toBeInTheDocument();
    expect(screen.getByText('현물')).toBeInTheDocument();
  });

  it('supportType이 없으면 배지를 렌더링하지 않는다', () => {
    renderWithMantine(
      <BenefitCard result={makeResult({ supportType: '' })} index={0} />,
    );

    expect(screen.queryByText('현금')).not.toBeInTheDocument();
  });

  it('condText가 있으면 매칭 태그를 표시한다', () => {
    renderWithMantine(
      <BenefitCard result={makeResult()} index={0} condText="청년 / 서울" />,
    );

    expect(screen.getByText('청년')).toBeInTheDocument();
    expect(screen.getByText('서울')).toBeInTheDocument();
    expect(screen.getByText('조건 매칭')).toBeInTheDocument();
  });

  it('condText가 없으면 매칭 태그를 표시하지 않는다', () => {
    renderWithMantine(<BenefitCard result={makeResult()} index={0} />);

    expect(screen.queryByText('조건 매칭')).not.toBeInTheDocument();
  });

  it('외부 링크가 새 창으로 열린다', () => {
    renderWithMantine(<BenefitCard result={makeResult()} index={0} />);

    const link = screen.getByRole('link', { name: /상세 페이지 열기/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('URL이 없으면 링크를 렌더링하지 않는다', () => {
    renderWithMantine(
      <BenefitCard
        result={makeResult({ detailUrl: '', onlineApplicationUrl: '' })}
        index={0}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('빈 필드는 - 로 표시한다', () => {
    renderWithMantine(
      <BenefitCard
        result={makeResult({ targetAudience: '', supportContent: '' })}
        index={0}
      />,
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('전화번호를 / 구분자로 표시한다', () => {
    renderWithMantine(<BenefitCard result={makeResult()} index={0} />);

    expect(screen.getByText('1600-0000 / 02-1234-5678')).toBeInTheDocument();
  });

  it('인덱스 번호가 1-based로 표시된다', () => {
    renderWithMantine(<BenefitCard result={makeResult()} index={2} />);

    expect(screen.getByText(/3\. 청년 월세 지원/)).toBeInTheDocument();
  });
});
