import { NextRequest, NextResponse } from 'next/server';
import { getSketches, createSketch, createTables } from '../../../lib/db';

// GET - 모든 스케치 조회
export async function GET() {
  try {
    await createTables();
    const sketches = await getSketches();
    return NextResponse.json({ sketches });
  } catch (error) {
    console.error('Error fetching sketches:', error);
    return NextResponse.json({ sketches: [] }, { status: 200 });
  }
}

// POST - 새 스케치 저장
export async function POST(request: NextRequest) {
  try {
    await createTables();
    
    const body = await request.json();
    console.log('[API] Saving sketch:', body);

    const { name, dataUrl } = body;
    
    if (!name || !dataUrl) {
      return NextResponse.json(
        { success: false, error: 'Name and dataUrl are required' },
        { status: 400 }
      );
    }

    const newSketch = await createSketch(name, dataUrl);

    return NextResponse.json({ 
      success: true, 
      sketch: newSketch 
    });

  } catch (error) {
    console.error('[API] Error saving sketch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save sketch' },
      { status: 500 }
    );
  }
}