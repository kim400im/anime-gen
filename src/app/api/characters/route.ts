import { NextRequest, NextResponse } from 'next/server';
import { getCharacters, createCharacter, createTables } from '../../../lib/db';
import { uploadImage } from '../../../lib/storage';

// GET - 모든 캐릭터 조회
export async function GET() {
  try {
    // 테이블이 없으면 생성
    await createTables();
    
    const characters = await getCharacters();
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    // 기본 캐릭터 반환
    return NextResponse.json([
      {
        id: 1,
        name: '아리 (기본 캐릭터)',
        imageUrl: '/api/placeholder-image',
        characterSheets: []
      }
    ]);
  }
}

// POST - 새 캐릭터 생성 (FormData 처리)
export async function POST(request: NextRequest) {
  try {
    await createTables();
    
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const image = formData.get('image') as File;

    if (!name || !image) {
      return NextResponse.json(
        { error: 'Name and image are required' },
        { status: 400 }
      );
    }

    // 이미지를 Vercel Blob에 업로드
    const filename = `characters/${Date.now()}_${image.name}`;
    const imageUrl = await uploadImage(image, filename);

    // 데이터베이스에 캐릭터 저장
    const newCharacter = await createCharacter(name, imageUrl);

    return NextResponse.json(newCharacter);

  } catch (error) {
    console.error('[API] Error creating character:', error);
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    );
  }
}