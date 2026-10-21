import { describe, expect, it } from 'vitest';
import { buildContextualLawQuery } from '@/features/legal/server/context-query';

describe('buildContextualLawQuery', () => {
  it('이전 대화가 없으면 원래 질문을 그대로 쓴다', () => {
    expect(buildContextualLawQuery('장애인 고용 의무 비율', [])).toBe('장애인 고용 의무 비율');
  });

  it('충분히 구체적인 질문은 이전 문맥을 붙이지 않는다', () => {
    const history = [
      { role: 'user' as const, content: '장애인 고용 의무' },
      { role: 'assistant' as const, content: '결과입니다' },
    ];

    expect(buildContextualLawQuery('육아휴직 급여 지급 기준', history)).toBe('육아휴직 급여 지급 기준');
  });

  it('짧은 후속 질문은 직전 사용자 질문과 결합한다', () => {
    const history = [
      { role: 'user' as const, content: '장애인 고용 의무' },
      { role: 'assistant' as const, content: '결과입니다' },
    ];

    expect(buildContextualLawQuery('비율은?', history)).toBe('장애인 고용 의무 비율은?');
  });

  it('최근 두 개의 사용자 질문을 보강 문맥으로 쓴다', () => {
    const history = [
      { role: 'user' as const, content: '장애인 고용 의무' },
      { role: 'assistant' as const, content: '결과입니다' },
      { role: 'user' as const, content: '민간기업 기준으로' },
      { role: 'assistant' as const, content: '추가 결과입니다' },
    ];

    expect(buildContextualLawQuery('벌칙은?', history)).toBe('장애인 고용 의무 민간기업 기준으로 벌칙은?');
  });

  it('초기화 성격의 입력은 이전 문맥을 잇지 않는다', () => {
    const history = [
      { role: 'user' as const, content: '장애인 고용 의무' },
      { role: 'assistant' as const, content: '결과입니다' },
    ];

    expect(buildContextualLawQuery('처음부터 육아휴직', history)).toBe('처음부터 육아휴직');
  });

  it('짧아도 새 주제인 질문은 이전 질문과 섞지 않는다', () => {
    const history = [
      { role: 'user' as const, content: '근로기준법 연차휴가' },
      { role: 'assistant' as const, content: '결과입니다' },
    ];

    expect(buildContextualLawQuery('임대차 보증금 반환', history)).toBe('임대차 보증금 반환');
    expect(buildContextualLawQuery('전세사기 피해', history)).toBe('전세사기 피해');
  });

  it('지시어로 시작하는 후속 질문은 법령 용어가 있어도 맥락을 잇는다', () => {
    const history = [
      { role: 'user' as const, content: '근로기준법 연차휴가' },
      { role: 'assistant' as const, content: '결과입니다' },
    ];

    expect(buildContextualLawQuery('그 조항 벌칙은?', history)).toBe('근로기준법 연차휴가 그 조항 벌칙은?');
  });

  it('history 끝에 현재 질문이 들어 있어도 맥락 두 개를 온전히 쓴다', () => {
    const history = [
      { role: 'user' as const, content: '장애인 고용 의무' },
      { role: 'user' as const, content: '민간기업 기준으로' },
      { role: 'user' as const, content: '벌칙은?' },
    ];

    expect(buildContextualLawQuery('벌칙은?', history)).toBe('장애인 고용 의무 민간기업 기준으로 벌칙은?');
  });
});
