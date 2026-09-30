import type { SVGProps } from 'react';

export function AiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g stroke="currentColor" strokeWidth="1.6" opacity="0.6">
        <line x1="32" y1="32" x2="32" y2="10" />
        <line x1="32" y1="32" x2="51" y2="21" />
        <line x1="32" y1="32" x2="51" y2="43" />
        <line x1="32" y1="32" x2="32" y2="54" />
        <line x1="32" y1="32" x2="13" y2="43" />
        <line x1="32" y1="32" x2="13" y2="21" />
        <line x1="32" y1="10" x2="51" y2="21" />
        <line x1="51" y1="21" x2="51" y2="43" />
        <line x1="51" y1="43" x2="32" y2="54" />
        <line x1="32" y1="54" x2="13" y2="43" />
        <line x1="13" y1="43" x2="13" y2="21" />
        <line x1="13" y1="21" x2="32" y2="10" />
      </g>
      <g fill="currentColor">
        <circle cx="32" cy="32" r="6.5" />
        <circle cx="32" cy="10" r="3.5" />
        <circle cx="51" cy="21" r="3.5" />
        <circle cx="51" cy="43" r="3.5" />
        <circle cx="32" cy="54" r="3.5" />
        <circle cx="13" cy="43" r="3.5" />
        <circle cx="13" cy="21" r="3.5" />
      </g>
    </svg>
  );
}
