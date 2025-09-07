import { sql } from '@vercel/postgres';

// 데이터베이스 테이블 생성
export async function createTables() {
  try {
    // Characters 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_url TEXT,
        character_sheets TEXT[], -- JSON array of image URLs
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Stories 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        elements JSONB, -- Story elements with character references
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Storyboards 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS storyboards (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        end_frame_url TEXT, -- For generated next scenes
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Sketches 테이블
    await sql`
      CREATE TABLE IF NOT EXISTS sketches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        data_url TEXT NOT NULL, -- Base64 canvas data
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// Characters CRUD
export async function getCharacters() {
  try {
    const { rows } = await sql`SELECT * FROM characters ORDER BY created_at DESC`;
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      characterSheets: row.character_sheets || []
    }));
  } catch (error) {
    console.error('Error fetching characters:', error);
    return [];
  }
}

export async function createCharacter(name: string, imageUrl: string) {
  try {
    const { rows } = await sql`
      INSERT INTO characters (name, image_url, character_sheets)
      VALUES (${name}, ${imageUrl}, '{}')
      RETURNING *
    `;
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      characterSheets: row.character_sheets || []
    };
  } catch (error) {
    console.error('Error creating character:', error);
    throw error;
  }
}

// Stories CRUD
export async function getStories() {
  try {
    const { rows } = await sql`SELECT * FROM stories ORDER BY created_at DESC`;
    return rows.map(row => ({
      id: row.id,
      text: row.text,
      elements: row.elements || [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching stories:', error);
    return [];
  }
}

export async function createStory(text: string, elements: any[] = []) {
  try {
    const { rows } = await sql`
      INSERT INTO stories (text, elements)
      VALUES (${text}, ${JSON.stringify(elements)})
      RETURNING *
    `;
    const row = rows[0];
    return {
      id: row.id,
      text: row.text,
      elements: row.elements || [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  } catch (error) {
    console.error('Error creating story:', error);
    throw error;
  }
}

export async function updateStory(id: number, text: string, elements: any[] = []) {
  try {
    const { rows } = await sql`
      UPDATE stories 
      SET text = ${text}, elements = ${JSON.stringify(elements)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    if (rows.length === 0) {
      throw new Error('Story not found');
    }
    const row = rows[0];
    return {
      id: row.id,
      text: row.text,
      elements: row.elements || [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  } catch (error) {
    console.error('Error updating story:', error);
    throw error;
  }
}

// Storyboards CRUD
export async function getStoryboards() {
  try {
    const { rows } = await sql`SELECT * FROM storyboards ORDER BY created_at DESC`;
    return rows.map(row => ({
      id: row.id,
      imageUrl: row.image_url,
      endFrameUrl: row.end_frame_url,
      description: row.description,
      createdAt: row.created_at.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching storyboards:', error);
    return [];
  }
}

export async function createStoryboard(imageUrl: string, description: string, endFrameUrl?: string) {
  try {
    const { rows } = await sql`
      INSERT INTO storyboards (image_url, description, end_frame_url)
      VALUES (${imageUrl}, ${description}, ${endFrameUrl || null})
      RETURNING *
    `;
    const row = rows[0];
    return {
      id: row.id,
      imageUrl: row.image_url,
      endFrameUrl: row.end_frame_url,
      description: row.description,
      createdAt: row.created_at.toISOString()
    };
  } catch (error) {
    console.error('Error creating storyboard:', error);
    throw error;
  }
}

export async function updateStoryboard(id: number, endFrameUrl: string) {
  try {
    const { rows } = await sql`
      UPDATE storyboards 
      SET end_frame_url = ${endFrameUrl}
      WHERE id = ${id}
      RETURNING *
    `;
    if (rows.length === 0) {
      throw new Error('Storyboard not found');
    }
    const row = rows[0];
    return {
      id: row.id,
      imageUrl: row.image_url,
      endFrameUrl: row.end_frame_url,
      description: row.description,
      createdAt: row.created_at.toISOString()
    };
  } catch (error) {
    console.error('Error updating storyboard:', error);
    throw error;
  }
}

// Sketches CRUD
export async function getSketches() {
  try {
    const { rows } = await sql`SELECT * FROM sketches ORDER BY created_at DESC`;
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      dataUrl: row.data_url,
      createdAt: row.created_at.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching sketches:', error);
    return [];
  }
}

export async function createSketch(name: string, dataUrl: string) {
  try {
    const { rows } = await sql`
      INSERT INTO sketches (name, data_url)
      VALUES (${name}, ${dataUrl})
      RETURNING *
    `;
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      dataUrl: row.data_url,
      createdAt: row.created_at.toISOString()
    };
  } catch (error) {
    console.error('Error creating sketch:', error);
    throw error;
  }
}