import { NextRequest, NextResponse } from 'next/server';
import { getStoryboards, createStoryboard, updateStoryboard, createTables } from '../../../../lib/db';
import { uploadBase64Image } from '../../../../lib/storage';

// GET - 모든 스토리보드 조회
export async function GET() {
  try {
    await createTables();
    const storyboards = await getStoryboards();
    return NextResponse.json({ storyboards });
  } catch (error) {
    console.error('Error fetching storyboards:', error);
    return NextResponse.json({ storyboards: [] }, { status: 200 });
  }
}

// POST - 새 스토리보드 생성
export async function POST(request: NextRequest) {
  try {
    await createTables();
    
    const body = await request.json();
    console.log('[API] Saving storyboard scenes:', body);

    if (body.scenes) {
      // 여러 scenes 저장
      const savedScenes = [];
      for (const scene of body.scenes) {
        let imageUrl = scene.imageUrl;
        
        // Base64 이미지인 경우 Vercel Blob에 업로드
        if (imageUrl && imageUrl.startsWith('data:image/')) {
          const filename = `storyboards/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
          imageUrl = await uploadBase64Image(imageUrl, filename);
        }
        
        const savedScene = await createStoryboard(imageUrl, scene.description || '');
        savedScenes.push(savedScene);
      }
      
      return NextResponse.json({ 
        success: true, 
        scenes: savedScenes
      });
    } else {
      // 단일 storyboard 저장
      let imageUrl = body.imageUrl;
      
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        const filename = `storyboards/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        imageUrl = await uploadBase64Image(imageUrl, filename);
      }
      
      const savedScene = await createStoryboard(imageUrl, body.description || '');
      
      return NextResponse.json({ 
        success: true, 
        scenes: [savedScene]
      });
    }

  } catch (error) {
    console.error('[API] Error saving storyboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save storyboard' },
      { status: 500 }
    );
  }
}