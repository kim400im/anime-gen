import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface NextSceneRequest {
  startFrameUrl: string;
  prompt?: string;
  aspectRatio: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NextSceneRequest = await request.json();
    console.log('[API] Generating next scene from:', body.startFrameUrl);
    console.log('[API] Custom prompt:', body.prompt);
    console.log('[API] Aspect ratio:', body.aspectRatio);

    // 비율에 따른 추가 프롬프트
    const ratioPrompts = {
      "1:1": "IMPORTANT: Generate a SQUARE image with 1:1 aspect ratio. The image must be exactly square shaped, with equal width and height. Do not create vertical or horizontal rectangles.",
      "16:9": "IMPORTANT: Generate a WIDE HORIZONTAL image with 16:9 aspect ratio. The image must be wider than it is tall, like a movie screen or landscape photo.",
      "9:16": "IMPORTANT: Generate a TALL VERTICAL image with 9:16 aspect ratio. The image must be taller than it is wide, like a smartphone screen or portrait photo."
    };

    // 기본 프롬프트 또는 사용자 프롬프트 사용
    const sceneInstruction = body.prompt
      ? `Create the next scene with this direction: ${body.prompt}`
      : "Create a natural next scene that logically follows from the start frame. Show what happens next in this story sequence.";

    // Gemini로 다음 장면 생성 프롬프트 구성
    const prompt = `You are given a START FRAME image. Create an END FRAME that shows the next logical scene in the sequence.

START FRAME: This is the current scene (provided as image)

TASK: ${sceneInstruction}

REQUIREMENTS:
- Maintain visual consistency with the start frame (same art style, character designs, color palette)
- Show clear progression from start to end frame 
- Keep the same characters and setting unless specifically instructed otherwise
- Create a smooth visual transition that could be animated between these two frames

Style: High-quality anime art, detailed characters, vibrant colors, dynamic composition that matches the start frame.

${ratioPrompts[body.aspectRatio as keyof typeof ratioPrompts] || ratioPrompts["1:1"]}`;

    console.log('[API] Final next scene prompt sent to Gemini:', prompt);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // 이미지 생성 요청
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const text = response.text();

    // 임시로 기본 이미지 URL 반환
    const endFrameUrl = "/api/placeholder-image";

    return NextResponse.json({ 
      endFrameUrl,
      generatedText: text 
    });

  } catch (error) {
    console.error('[API] Error generating next scene:', error);
    return NextResponse.json(
      { error: 'Failed to generate next scene', endFrameUrl: "/api/placeholder-image" },
      { status: 500 }
    );
  }
}