// app/page.tsx
"use client";

import { useState, FormEvent, useEffect, useRef } from 'react';
import Image from 'next/image';

// --- 데이터 타입 정의 ---
interface Character {
  id: number;
  name: string;
  imageUrl: string;
}

interface StoryboardScene {
  id: number;
  imageUrl: string;
  description: string;
}

// 백엔드 API 기본 URL
const API_BASE_URL = "http://localhost:8000";


export default function Home() {
  // --- STATE MANAGEMENT ---
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [keyImage, setKeyImage] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<StoryboardScene | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [characterDetailModal, setCharacterDetailModal] = useState<Character | null>(null);
  
  // 파일 업로드를 위한 상태 및 ref
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/characters`);
        if (!response.ok) throw new Error('Failed to fetch characters');
        const data: Character[] = await response.json();
        setCharacters(data);
        if (data.length > 0 && !selectedCharacter) {
          setSelectedCharacter(data[0]);
        }
      } catch (error) {
        console.error(error);
        alert("백엔드 서버 연결에 실패했습니다. 백엔드 서버가 실행 중인지 확인해주세요.");
        setCharacters([{id: 1, name: '아리 (로드 실패)', imageUrl: 'http://localhost:8000/static/images/default.svg'}]);
      }
    };
    fetchCharacters();
  }, []);


  // --- HANDLER FUNCTIONS ---

  // 파일 선택 시 미리보기 생성
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCharacterImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // 이미지 영역 클릭 시 파일 탐색기 열기
  const triggerFileSelect = () => fileInputRef.current?.click();

  // 캐릭터 등록 시 FormData로 파일 전송
  const handleRegisterCharacter = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nameInput = form.elements.namedItem('characterName') as HTMLInputElement;
    const name = nameInput.value;
    
    if (!name || !characterImageFile) {
      alert("캐릭터 이름과 사진을 모두 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', characterImageFile);
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/characters`, {
        method: 'POST',
        body: formData, // FormData를 사용할 때는 Content-Type 헤더를 설정하지 않습니다.
      });
      if (!response.ok) throw new Error('Failed to register character');
      const newCharacter: Character = await response.json();
      setCharacters(prev => [...prev, newCharacter]);
      
      // 성공 후 상태 초기화
      form.reset();
      setCharacterImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (error) {
      console.error(error);
      alert("캐릭터 등록에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateImageFromSketch = async () => {
    if (!selectedCharacter) {
      alert("먼저 캐릭터를 선택해주세요!");
      return;
    }
    setIsLoading(true);
    setStoryboard([]);
    setSelectedScene(null);

    try {
      const sketchData = "canvas_drawing_data";
      const response = await fetch(`${API_BASE_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character: selectedCharacter, sketchData }),
      });
      if (!response.ok) throw new Error('Failed to generate image');
      const data = await response.json();
      setKeyImage(data.imageUrl);
    } catch (error) {
      console.error(error);
      alert("이미지 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateImageFromUpload = () => {
    setKeyImage("http://localhost:8000/static/images/default.svg");
    setStoryboard([]);
    setSelectedScene(null);
    setIsModalOpen(false);
  }

  const handleCreateStoryboard = async () => {
    if (!keyImage) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyImageUrl: keyImage }),
      });
      if (!response.ok) throw new Error('Failed to create storyboard');
      const newStoryboard: StoryboardScene[] = await response.json();
      setStoryboard(newStoryboard);
    } catch (error) {
      console.error(error);
      alert("스토리보드 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };


  // --- RENDER ---
  return (
    <>
      <main className="flex h-screen w-screen bg-gray-900 text-white font-sans overflow-hidden">
        {/* Left Panel: Character Management */}
        <div className="w-1/4 min-w-[300px] border-r border-gray-700 p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex-shrink-0">👤 캐릭터 관리</h2>
          
          <form onSubmit={handleRegisterCharacter} className="mb-6 bg-gray-800 p-4 rounded-lg flex-shrink-0">
            <p className="mb-2 text-sm text-gray-300">캐릭터 사진</p>
            {/* 파일 입력 및 미리보기 UI */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
            />
            <div 
              onClick={triggerFileSelect} 
              className="w-full h-32 bg-gray-700 rounded-md mb-4 flex items-center justify-center text-gray-400 cursor-pointer relative overflow-hidden"
            >
              {imagePreview ? (
                <Image src={imagePreview} alt="Character preview" fill style={{ objectFit: 'cover' }} />
              ) : (
                "클릭하여 업로드"
              )}
            </div>
            
            <input
              name="characterName"
              type="text"
              placeholder="캐릭터 이름"
              className="w-full bg-gray-700 p-2 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded-md font-bold transition-colors disabled:bg-gray-500">
              {isLoading ? "처리 중..." : "등록하기"}
            </button>
          </form>

          <h3 className="text-lg font-semibold mb-2 flex-shrink-0">📖 등록된 캐릭터 목록</h3>
          <div className="flex-grow overflow-y-auto space-y-2 pr-2">
            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => setCharacterDetailModal(char)}
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedCharacter?.id === char.id ? 'bg-blue-500/30 ring-2 ring-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                <Image src={char.imageUrl} alt={char.name} width={40} height={40} className="rounded-full mr-3 flex-shrink-0" />
                <span className="font-medium truncate">{char.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Creation Space */}
        <div className="w-1/2 p-6 flex flex-col">
          <h2 className="text-2xl font-bold mb-4 flex-shrink-0 text-center">🎨 제작 공간</h2>
          
          <div className="bg-gray-800 p-2 rounded-lg mb-4 flex items-center justify-center space-x-4 flex-shrink-0">
            <span>크기:</span>
            <select className="bg-gray-700 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>1024x1024</option>
            </select>
            <span>비율:</span>
            <select className="bg-gray-700 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>1:1</option>
              <option>16:9</option>
              <option>9:16</option>
            </select>
          </div>

          <div className="flex-grow bg-white rounded-lg mb-4 flex items-center justify-center text-gray-500 relative min-h-0">
            {keyImage ? (
              <Image src={keyImage} alt="Generated Key Image" fill style={{ objectFit: 'contain', padding: '0.5rem' }} />
            ) : (
              "여기에 그림을 그리거나, 아래 버튼으로 이미지를 업로드하세요."
            )}
          </div>

          {isLoading && 
            <div className="text-center mb-2 text-blue-300 animate-pulse">
              ✨ AI가 열심히 작업 중입니다... ✨
            </div>
          }

          <div className="flex-shrink-0">
            {!keyImage ? (
              <div className="flex space-x-4">
                <button onClick={handleCreateImageFromSketch} disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-md font-bold disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                  스케치로 이미지 생성
                </button>
                <button onClick={() => setIsModalOpen(true)} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-md font-bold disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                  이미지로 스토리 시작
                </button>
              </div>
            ) : (
              <button onClick={handleCreateStoryboard} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-md font-bold disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors text-lg">
                📖 이 이미지로 스토리보드 만들기
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Storyboard */}
        <div className="w-1/4 min-w-[300px] border-l border-gray-700 p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex-shrink-0">📚 스토리보드</h2>
          
          {storyboard.length === 0 ? (
            <div className="text-gray-400 text-center mt-10 flex-grow flex items-center justify-center">
              <p>생성된 스토리보드가<br/>여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
              {storyboard.map((scene) => (
                <div
                  key={scene.id}
                  className={`bg-gray-800 p-2 rounded-lg flex items-start cursor-pointer hover:bg-gray-700 transition-colors ${selectedScene?.id === scene.id ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setSelectedScene(scene)}
                >
                  <Image src={scene.imageUrl} alt={`Scene ${scene.id}`} width={60} height={60} className="rounded-md mr-3 flex-shrink-0" />
                  <p className="text-sm text-gray-300 flex-1">{scene.description}</p>
                </div>
              ))}
            </div>
          )}
          
          {selectedScene && (
            <div className="mt-4 flex-shrink-0">
              <h3 className="text-lg font-semibold mb-2">🔍 상세 보기</h3>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="relative w-full aspect-square mb-3">
                  <Image src={selectedScene.imageUrl} alt={`Selected Scene ${selectedScene.id}`} fill style={{ objectFit: 'contain' }} className="rounded-md" />
                </div>
                <p>{selectedScene.description}</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {isModalOpen && (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">이미지 업로드</h2>
            <div className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-400 mb-6 cursor-pointer hover:bg-gray-700/50">
              여기에 파일을 드래그 앤 드롭 하세요.
            </div>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-semibold transition-colors">
                취소
              </button>
              <button onClick={handleCreateImageFromUpload} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-semibold transition-colors">
                업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Detail Modal */}
      {characterDetailModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setCharacterDetailModal(null)}
        >
          <div 
            className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{characterDetailModal.name}</h2>
            <div className="relative w-full aspect-square mb-6 bg-gray-700 rounded-lg overflow-hidden">
              <Image 
                src={characterDetailModal.imageUrl} 
                alt={characterDetailModal.name} 
                fill 
                style={{ objectFit: 'cover' }} 
              />
            </div>
            <div className="flex justify-between space-x-4">
              <button 
                onClick={() => setCharacterDetailModal(null)} 
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                닫기
              </button>
              <button 
                onClick={() => {
                  setSelectedCharacter(characterDetailModal);
                  setCharacterDetailModal(null);
                }} 
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                이미지로 캐릭터 시트 생성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
