import { NextRequest, NextResponse } from 'next/server';
import { updateStory, createTables } from '../../../../lib/db';

// PUT - 스토리 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await createTables();
    
    const storyId = parseInt(params.id);
    const body = await request.json();
    console.log('[API] Updating story:', storyId, body);

    const { text, elements = [] } = body;
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    const updatedStory = await updateStory(storyId, text, elements);

    return NextResponse.json({ 
      success: true, 
      story: updatedStory 
    });

  } catch (error) {
    console.error('[API] Error updating story:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update story' },
      { status: 500 }
    );
  }
}