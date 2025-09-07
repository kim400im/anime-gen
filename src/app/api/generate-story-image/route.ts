import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface StoryElement {
  type: string;
  content: string;
  character?: any;
}

interface StoryImageRequest {
  story: string;
  elements: StoryElement[];
  characters: any[];
  aspectRatio: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StoryImageRequest = await request.json();
    console.log('[API] Generating image for story:', body.story);
    console.log('[API] Characters involved:', body.characters.length);
    console.log('[API] Requested aspect ratio:', body.aspectRatio);

    // 비율에 따른 추가 프롬프트
    const ratioPrompts = {
      "1:1": "IMPORTANT: Generate a SQUARE image with 1:1 aspect ratio. The image must be exactly square shaped, with equal width and height. Do not create vertical or horizontal rectangles.",
      "16:9": "IMPORTANT: Generate a WIDE HORIZONTAL image with 16:9 aspect ratio. The image must be wider than it is tall, like a movie screen or landscape photo.",
      "9:16": "IMPORTANT: Generate a TALL VERTICAL image with 9:16 aspect ratio. The image must be taller than it is wide, like a smartphone screen or portrait photo."
    };

    // Gemini로 이미지 생성 프롬프트 구성
    const prompt = `Create an anime-style illustration for this story:
        
Story: ${body.story}

Style: High-quality anime art, detailed characters, vibrant colors, dynamic composition.
Characters should match the provided reference images exactly - same appearance, clothing, and features.

The scene should capture the emotion and action described in the story text.

${ratioPrompts[body.aspectRatio as keyof typeof ratioPrompts] || ratioPrompts["1:1"]}`;

    console.log('[API] Final prompt sent to Gemini:', prompt);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // 이미지 생성 요청
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const text = response.text();

    // 임시로 기본 이미지 URL 반환 (실제로는 생성된 이미지 URL을 반환해야 함)
    const defaultImageUrl = "/api/placeholder-image";

    return NextResponse.json({ 
      imageUrl: defaultImageUrl,
      generatedText: text 
    });

  } catch (error) {
    console.error('[API] Error generating story image:', error);
    return NextResponse.json(
      { error: 'Failed to generate story image', imageUrl: "/api/placeholder-image" },
      { status: 500 }
    );
  }
}