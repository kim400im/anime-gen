import { NextRequest, NextResponse } from 'next/server';
import { updateStoryboard, createTables } from '../../../../lib/db';
import { uploadBase64Image } from '../../../../lib/storage';

// PUT - 스토리보드 업데이트 (endFrame 추가 등)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await createTables();
    
    const storyboardId = parseInt(params.id);
    const body = await request.json();
    console.log('[API] Updating storyboard:', storyboardId, body);

    let endFrameUrl = body.endFrameUrl;
    
    // Base64 이미지인 경우 Vercel Blob에 업로드
    if (endFrameUrl && endFrameUrl.startsWith('data:image/')) {
      const filename = `storyboards/end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
      endFrameUrl = await uploadBase64Image(endFrameUrl, filename);
    }

    const updatedStoryboard = await updateStoryboard(storyboardId, endFrameUrl);

    return NextResponse.json({ 
      success: true, 
      storyboard: updatedStoryboard 
    });

  } catch (error) {
    console.error('[API] Error updating storyboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update storyboard' },
      { status: 500 }
    );
  }
}