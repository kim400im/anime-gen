import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API] Generating character sheet:', body);

    // 임시로 여러 개의 placeholder 이미지 반환
    const characterSheetImages = [
      '/api/placeholder-image',
      '/api/placeholder-image',
      '/api/placeholder-image',
      '/api/placeholder-image',
      '/api/placeholder-image'
    ];
    
    return NextResponse.json({ 
      characterSheetImages
    });

  } catch (error) {
    console.error('[API] Error generating character sheet:', error);
    return NextResponse.json(
      { error: 'Failed to generate character sheet', characterSheetImages: ['/api/placeholder-image'] },
      { status: 500 }
    );
  }
}