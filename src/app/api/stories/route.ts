import { NextRequest, NextResponse } from 'next/server';
import { getStories, createStory, updateStory, createTables } from '../../../../lib/db';

// GET - 모든 스토리 조회
export async function GET() {
  try {
    await createTables();
    const stories = await getStories();
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ stories: [] }, { status: 200 });
  }
}

// POST - 새 스토리 생성
export async function POST(request: NextRequest) {
  try {
    await createTables();
    
    const body = await request.json();
    console.log('[API] Saving story:', body);

    const { text, elements = [] } = body;
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    const newStory = await createStory(text, elements);
    return NextResponse.json({ 
      success: true, 
      story: newStory 
    });

  } catch (error) {
    console.error('[API] Error saving story:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save story' },
      { status: 500 }
    );
  }
}