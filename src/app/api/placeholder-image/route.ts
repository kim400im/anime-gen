import { NextResponse } from 'next/server';

export async function GET() {
  // 1x1 투명 픽셀 PNG를 base64로 인코딩
  const transparentPixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/mF8UPQAAAABJRU5ErkJggg==',
    'base64'
  );

  return new NextResponse(transparentPixel, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}