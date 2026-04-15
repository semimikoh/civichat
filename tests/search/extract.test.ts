import { describe, it, expect } from 'vitest';
import { analyzeQuery } from '@/core/benefit/extract';

describe('analyzeQuery', () => {
  describe('나이 추출', () => {
    it('26살 → 26', () => {
      const r = analyzeQuery('26살 무직', []);
      expect(r.conditions.age).toBe(26);
    });

    it('만 30세 → 30', () => {
      const r = analyzeQuery('만 30세 여성', []);
      expect(r.conditions.age).toBe(30);
    });

    it('30대 → 35 (대표값)', () => {
      const r = analyzeQuery('30대 주거 지원', []);
      expect(r.conditions.age).toBe(35);
    });

    it('청년 → 26', () => {
      const r = analyzeQuery('청년 취업 지원', []);
      expect(r.conditions.age).toBe(26);
    });

    it('나이 없으면 null', () => {
      const r = analyzeQuery('임산부 혜택', []);
      expect(r.conditions.age).toBeNull();
    });
  });

  describe('성별 추출', () => {
    it('여성 → 여성', () => {
      const r = analyzeQuery('26살 여성', []);
      expect(r.conditions.gender).toBe('여성');
    });

    it('남자 → 남성', () => {
      const r = analyzeQuery('남자 30대', []);
      expect(r.conditions.gender).toBe('남성');
    });

    it('임산부 → 여성', () => {
      const r = analyzeQuery('임산부 혜택', []);
      expect(r.conditions.gender).toBe('여성');
    });

    it('성별 없으면 null', () => {
      const r = analyzeQuery('청년 취업', []);
      expect(r.conditions.gender).toBeNull();
    });
  });

  describe('직업/상태 추출', () => {
    it('무직 → 구직자/실업자', () => {
      const r = analyzeQuery('26살 무직', []);
      expect(r.conditions.occupation).toBe('구직자/실업자');
    });

    it('대학생 → 대학생/대학원생', () => {
      const r = analyzeQuery('대학생 장학금', []);
      expect(r.conditions.occupation).toBe('대학생/대학원생');
    });

    it('직장인 → 근로자/직장인', () => {
      const r = analyzeQuery('직장인 주거', []);
      expect(r.conditions.occupation).toBe('근로자/직장인');
    });

    it('임산부 → 임산부', () => {
      const r = analyzeQuery('임산부 혜택', []);
      expect(r.conditions.occupation).toBe('임산부');
    });

    it('직업 없으면 null', () => {
      const r = analyzeQuery('26살 남자', []);
      expect(r.conditions.occupation).toBeNull();
    });
  });

  describe('지역 추출', () => {
    it('동탄 → 화성시 / 경기도', () => {
      const r = analyzeQuery('동탄 임산부', []);
      expect(r.conditions.region).toBe('화성시');
      expect(r.conditions.regionProvince).toBe('경기도');
    });

    it('분당 → 성남시 / 경기도', () => {
      const r = analyzeQuery('분당 주거', []);
      expect(r.conditions.region).toBe('성남시');
      expect(r.conditions.regionProvince).toBe('경기도');
    });

    it('서울 → 서울특별시', () => {
      const r = analyzeQuery('서울 청년', []);
      expect(r.conditions.region).toBe('서울특별시');
      expect(r.conditions.regionProvince).toBe('서울특별시');
    });

    it('경기도 → 경기도', () => {
      const r = analyzeQuery('경기도 지원금', []);
      expect(r.conditions.region).toBe('경기도');
      expect(r.conditions.regionProvince).toBe('경기도');
    });

    it('지역 없으면 null', () => {
      const r = analyzeQuery('26살 무직', []);
      expect(r.conditions.region).toBeNull();
    });
  });

  describe('키워드 추출', () => {
    it('취업 관련', () => {
      const r = analyzeQuery('취업 지원', []);
      expect(r.conditions.keywords).toContain('취업');
    });

    it('주거 관련', () => {
      const r = analyzeQuery('전세 지원', []);
      expect(r.conditions.keywords).toContain('주거');
    });

    it('임산부 관련', () => {
      const r = analyzeQuery('임산부 혜택', []);
      expect(r.conditions.keywords).toContain('임산부');
    });
  });

  describe('검색/질문 판단', () => {
    it('정보 충분 + 지역 있음 → search', () => {
      const r = analyzeQuery('서울 26살 무직 지원금', []);
      expect(r.action).toBe('search');
    });

    it('구체적 주제 + 지역 있음 → search', () => {
      const r = analyzeQuery('서울 임산부 혜택', []);
      expect(r.action).toBe('search');
    });

    it('정보 충분하지만 지역 없음 → ask (지역 질문)', () => {
      const r = analyzeQuery('26살 무직 지원금', []);
      expect(r.action).toBe('ask');
      expect(r.followUpQuestion).toContain('지역');
    });

    it('막연한 요청 → ask', () => {
      const r = analyzeQuery('지원금 받고 싶어', []);
      expect(r.action).toBe('ask');
    });

    it('혜택 알려줘 → ask', () => {
      const r = analyzeQuery('혜택 알려줘', []);
      expect(r.action).toBe('ask');
    });
  });

  describe('대화 맥락 누적', () => {
    it('이전 턴 나이 유지', () => {
      const history = [
        { role: 'user' as const, content: '26살이야' },
        { role: 'assistant' as const, content: '어떤 혜택을 찾으시나요?' },
      ];
      const r = analyzeQuery('무직이야', history);
      expect(r.conditions.age).toBe(26);
      expect(r.conditions.occupation).toBe('구직자/실업자');
    });

    it('이전 턴 지역 유지', () => {
      const history = [
        { role: 'user' as const, content: '동탄 임산부 혜택' },
        { role: 'assistant' as const, content: '결과입니다' },
      ];
      const r = analyzeQuery('출산 지원도 알려줘', history);
      expect(r.conditions.region).toBe('화성시');
    });
  });
});
