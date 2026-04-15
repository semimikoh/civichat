import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { LawMeta, LawArticle, LawReference } from '@/core/types/law';

const LEGALIZE_DIR = resolve(process.cwd(), 'data/legalize-kr/kr');

/** YAML frontmatter를 파싱한다. 간단한 키-값 파서 (외부 의존성 없음). */
function parseFrontmatter(content: string): { meta: Record<string, string | string[]>; body: string } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    return { meta: {}, body: content };
  }

  const meta: Record<string, string | string[]> = {};
  const lines = fmMatch[1].split('\n');
  let currentKey = '';

  for (const line of lines) {
    const kvMatch = line.match(/^(\S+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].replace(/^['"]|['"]$/g, '').trim();
      if (value) {
        meta[currentKey] = value;
      }
    } else if (line.match(/^- /) && currentKey) {
      const item = line.replace(/^- /, '').trim();
      const existing = meta[currentKey];
      if (Array.isArray(existing)) {
        existing.push(item);
      } else {
        meta[currentKey] = [item];
      }
    }
  }

  return { meta, body: fmMatch[2] };
}

/** frontmatter를 LawMeta로 변환한다. */
function toLawMeta(meta: Record<string, string | string[]>): LawMeta {
  const str = (key: string): string => {
    const v = meta[key];
    return Array.isArray(v) ? v.join(', ') : (v ?? '');
  };
  const arr = (key: string): string[] => {
    const v = meta[key];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return [v];
    return [];
  };

  return {
    title: str('제목'),
    lawMst: str('법령MST'),
    lawId: str('법령ID'),
    lawType: str('법령구분'),
    ministry: arr('소관부처'),
    promulgationDate: str('공포일자'),
    enforcementDate: str('시행일자'),
    status: str('상태'),
    sourceUrl: str('출처'),
  };
}

/** 마크다운 본문을 조문 단위로 분리한다. */
function splitArticles(body: string, lawTitle: string, lawType: string, sourceUrl: string): LawArticle[] {
  const articles: LawArticle[] = [];
  let currentChapter = '';

  // ##### 제X조 (제목) 패턴으로 분리
  const sections = body.split(/(?=##### 제)/);

  for (const section of sections) {
    // 장 제목 추출 (## 제X장 ...)
    const chapterMatch = section.match(/^## (제\d+장[^\n]*)/m);
    if (chapterMatch) {
      currentChapter = chapterMatch[1].trim();
    }

    const articleMatch = section.match(/^##### (제[\d조의]+)\s*\(([^)]+)\)\s*\n([\s\S]*)/);
    if (!articleMatch) continue;

    const articleNumber = articleMatch[1].trim();
    const articleTitle = articleMatch[2].trim();
    let articleContent = articleMatch[3].trim();

    // 다음 장 제목이 본문에 포함되어 있으면 제거
    const nextChapterIdx = articleContent.search(/\n## 제\d+장/);
    if (nextChapterIdx !== -1) {
      const chapterInContent = articleContent.match(/\n## (제\d+장[^\n]*)/);
      if (chapterInContent) {
        currentChapter = chapterInContent[1].trim();
      }
      articleContent = articleContent.substring(0, nextChapterIdx).trim();
    }

    // 빈 조문 건너뛰기
    if (!articleContent || articleContent.length < 5) continue;

    // 마크다운 볼드/이스케이프 정리 + 항 번호 앞 줄바꿈 유지
    const cleanContent = articleContent
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\\\./g, '.')
      .replace(/\n\s*\n/g, '\n')
      .replace(/([^\n])\s*(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/g, '$1\n$2')
      .replace(/([^\n])\s*(\d+\.)\s/g, '$1\n$2 ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    const embeddingText = `${lawTitle} ${articleNumber} ${articleTitle}: ${cleanContent}`.substring(0, 2000);

    articles.push({
      lawTitle,
      lawType,
      chapter: currentChapter,
      articleNumber,
      articleTitle,
      articleContent: cleanContent,
      embeddingText,
      sourceUrl,
    });
  }

  return articles;
}

/** 단일 마크다운 파일을 파싱하여 조문 목록을 반환한다. */
export function parseLawFile(filePath: string): { meta: LawMeta; articles: LawArticle[] } {
  const content = readFileSync(filePath, 'utf-8');
  const { meta, body } = parseFrontmatter(content);
  const lawMeta = toLawMeta(meta);
  const lawType = lawMeta.lawType || filePath.replace(/\.md$/, '').split('/').pop() || '';
  const articles = splitArticles(body, lawMeta.title, lawType, lawMeta.sourceUrl);
  return { meta: lawMeta, articles };
}

/** legalize-kr 전체 디렉토리를 파싱한다. */
export function parseAllLaws(): { totalLaws: number; totalArticles: number; articles: LawArticle[] } {
  if (!existsSync(LEGALIZE_DIR)) {
    throw new Error(`legalize-kr 데이터가 없습니다: ${LEGALIZE_DIR}\ngit clone https://github.com/legalize-kr/legalize-kr.git data/legalize-kr`);
  }

  const lawDirs = readdirSync(LEGALIZE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const allArticles: LawArticle[] = [];
  let lawFileCount = 0;

  for (const lawDir of lawDirs) {
    const dirPath = join(LEGALIZE_DIR, lawDir);
    const files = readdirSync(dirPath).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = join(dirPath, file);
      try {
        const { articles } = parseLawFile(filePath);
        allArticles.push(...articles);
        lawFileCount++;
      } catch (err) {
        console.error(`파싱 실패: ${filePath}`, err instanceof Error ? err.message : err);
      }
    }
  }

  const deduped = deduplicateArticles(allArticles);
  return {
    totalLaws: lawFileCount,
    totalArticles: deduped.length,
    articles: deduped,
  };
}

/** 특정 법령명 목록에 해당하는 법령만 파싱한다. */
export function parseLawsByNames(lawNames: string[]): { totalLaws: number; totalArticles: number; articles: LawArticle[] } {
  if (!existsSync(LEGALIZE_DIR)) {
    throw new Error(`legalize-kr 데이터가 없습니다: ${LEGALIZE_DIR}\ngit clone https://github.com/legalize-kr/legalize-kr.git data/legalize-kr`);
  }

  const allArticles: LawArticle[] = [];
  let lawFileCount = 0;
  const processed = new Set<string>();

  for (const name of lawNames) {
    const filePath = findLawFilePath(name);
    if (!filePath || processed.has(filePath)) continue;
    processed.add(filePath);

    try {
      const { articles } = parseLawFile(filePath);
      allArticles.push(...articles);
      lawFileCount++;
    } catch (err) {
      console.error(`파싱 실패: ${filePath}`, err instanceof Error ? err.message : err);
    }
  }

  const deduped = deduplicateArticles(allArticles);
  return {
    totalLaws: lawFileCount,
    totalArticles: deduped.length,
    articles: deduped,
  };
}

/** 동일 (법령명, 법령구분, 조문번호) 중복 제거. 마지막 것(최신)을 유지한다. */
function deduplicateArticles(articles: LawArticle[]): LawArticle[] {
  const map = new Map<string, LawArticle>();
  for (const a of articles) {
    map.set(`${a.lawTitle}::${a.lawType}::${a.articleNumber}`, a);
  }
  return [...map.values()];
}

/** 복지 서비스의 법령 필드("유아교육법(제24조)||영유아보육법(제34조)")를 파싱한다. */
export function parseLawReferences(lawField: string): LawReference[] {
  if (!lawField || !lawField.trim()) return [];

  return lawField.split('||').map((ref) => {
    const match = ref.trim().match(/^(.+?)\((.+)\)$/);
    if (match) {
      return { lawName: match[1].trim(), articleRef: match[2].trim() };
    }
    return { lawName: ref.trim(), articleRef: '' };
  });
}

/** 법령명으로 legalize-kr 파일 경로를 찾는다. 시행령/시행규칙도 처리. */
export function findLawFilePath(lawName: string): string | null {
  const normalized = lawName.replace(/\s+/g, '');

  // 직접 디렉토리 매칭 (법률)
  const directPath = join(LEGALIZE_DIR, normalized, '법률.md');
  if (existsSync(directPath)) return directPath;

  // 시행령/시행규칙 매칭
  const suffixes = ['시행령', '시행규칙', '시행세칙'] as const;
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      const baseName = normalized.slice(0, -suffix.length);
      const filePath = join(LEGALIZE_DIR, baseName, `${suffix}.md`);
      if (existsSync(filePath)) return filePath;

      // 시행규칙에 부처명이 붙은 경우 (시행규칙(교육부령).md)
      if (suffix === '시행규칙') {
        const baseDir = join(LEGALIZE_DIR, baseName);
        if (existsSync(baseDir)) {
          const files = readdirSync(baseDir).filter((f) => f.startsWith('시행규칙'));
          if (files.length > 0) return join(baseDir, files[0]);
        }
      }
    }
  }

  // 디렉토리만 존재하는 경우 (법률.md 파일)
  const dirPath = join(LEGALIZE_DIR, normalized);
  if (existsSync(dirPath)) {
    const files = readdirSync(dirPath).filter((f) => f.endsWith('.md'));
    if (files.length > 0) return join(dirPath, files[0]);
  }

  return null;
}
