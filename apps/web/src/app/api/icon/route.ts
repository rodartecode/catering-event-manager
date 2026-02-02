import { NextResponse } from 'next/server';

const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="14" stroke="#2563eb" stroke-width="2" fill="#eff6ff"/>
  <circle cx="16" cy="16" r="10" stroke="#2563eb" stroke-width="1.5" fill="#dbeafe"/>
  <path d="M11 10v12M9 10v4c0 1.5 1 2 2 2s2-.5 2-2v-4" stroke="#1d4ed8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 10c0 0 1.5 2 1.5 5s-1.5 3-1.5 3v4" stroke="#1d4ed8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function GET() {
  return new NextResponse(SVG_ICON, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
