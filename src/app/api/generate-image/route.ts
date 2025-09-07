import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API] Generating image from sketch:', body);

    // 임시로 placeholder 이미지 반환
    // 실제로는 Gemini를 사용해서 스케치 기반 이미지 생성
    
    const imageUrl = '/api/placeholder-image';
    
    return NextResponse.json({ 
      imageUrl
    });

  } catch (error) {
    console.error('[API] Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image', imageUrl: '/api/placeholder-image' },
      { status: 500 }
    );
  }
}