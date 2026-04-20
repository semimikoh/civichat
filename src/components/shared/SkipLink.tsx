'use client';

interface SkipLinkProps {
  href: string;
  label?: string;
}

const hiddenStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  zIndex: 100,
};

function showLink(el: HTMLElement) {
  el.style.left = '16px';
  el.style.top = '16px';
  el.style.width = 'auto';
  el.style.height = 'auto';
  el.style.padding = '8px 16px';
  el.style.background = 'var(--mantine-color-blue-6)';
  el.style.color = '#fff';
  el.style.borderRadius = '4px';
  el.style.fontSize = '14px';
  el.style.textDecoration = 'none';
}

function hideLink(el: HTMLElement) {
  el.style.left = '-9999px';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.padding = '0';
}

export function SkipLink({ href, label = '검색 입력으로 건너뛰기' }: SkipLinkProps) {
  return (
    <a
      href={href}
      style={hiddenStyle}
      onFocus={(e) => showLink(e.currentTarget)}
      onBlur={(e) => hideLink(e.currentTarget)}
    >
      {label}
    </a>
  );
}
