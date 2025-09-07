import { put } from '@vercel/blob';

// 이미지를 Vercel Blob에 업로드
export async function uploadImage(file: File, filename: string): Promise<string> {
  try {
    const blob = await put(filename, file, {
      access: 'public',
    });
    
    return blob.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Base64 데이터를 Vercel Blob에 업로드 (스케치/생성된 이미지용)
export async function uploadBase64Image(base64Data: string, filename: string): Promise<string> {
  try {
    // Base64 데이터에서 헤더 제거 (data:image/png;base64, 부분)
    const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Buffer를 File 객체로 변환
    const file = new File([buffer], filename, { type: 'image/png' });
    
    const blob = await put(filename, file, {
      access: 'public',
    });
    
    return blob.url;
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw error;
  }
}

// Gemini에서 생성된 이미지 데이터를 업로드
export async function uploadGeneratedImage(imageBuffer: Buffer, filename: string): Promise<string> {
  try {
    const file = new File([new Uint8Array(imageBuffer)], filename, { type: 'image/png' });
    
    const blob = await put(filename, file, {
      access: 'public',
    });
    
    return blob.url;
  } catch (error) {
    console.error('Error uploading generated image:', error);
    throw error;
  }
}