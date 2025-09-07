import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API] Creating storyboard:', body);
    console.log('[API] Characters:', body.characters?.length || 0);
    console.log('[API] Aspect ratio:', body.aspectRatio);

    // 임시로 여러 개의 storyboard 이미지 반환
    const storyboardImages = [
      '/api/placeholder-image',
      '/api/placeholder-image'
    ];

    const sceneDescription = `Storyboard scene created from user prompt: ${body.prompt}`;
    
    return NextResponse.json({ 
      storyboardImages,
      sceneDescription
    });

  } catch (error) {
    console.error('[API] Error creating storyboard:', error);
    return NextResponse.json(
      { error: 'Failed to create storyboard', storyboardImages: ['/api/placeholder-image'], sceneDescription: 'Error creating storyboard' },
      { status: 500 }
    );
  }
}