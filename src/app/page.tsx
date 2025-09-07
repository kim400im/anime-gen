// app/page.tsx
"use client";

import { useState, FormEvent, useEffect, useRef } from 'react';
import Image from 'next/image';

// --- 데이터 타입 정의 ---
interface Character {
  id: number;
  name: string;
  imageUrl: string;
  characterSheets?: string[];
}

interface StoryboardScene {
  id: number;
  imageUrl: string;
  description: string;
  endFrameUrl?: string; // 다음 장면 생성시 end frame URL
}

interface Sketch {
  id: number;
  name: string;
  dataUrl: string;
  createdAt: string;
}

// API 기본 URL (Next.js API Routes 사용)
const API_BASE_URL = "";


export default function Home() {
  // --- STATE MANAGEMENT ---
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [keyImage, setKeyImage] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<StoryboardScene | null>(null);
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [characterDetailModal, setCharacterDetailModal] = useState<Character | null>(null);
  
  // 파일 업로드를 위한 상태 및 ref
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 스케치 관련 상태
  const [sketches, setSketches] = useState<Sketch[]>([]);
  // 스토리 관련 상태
  const [stories, setStories] = useState<any[]>([]);
  const [isSketchModalOpen, setIsSketchModalOpen] = useState(false);
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  
  // 사이드바 탭 상태
  const [activeTab, setActiveTab] = useState<'storyboard' | 'sketches'>('storyboard');

  // 스토리보드 생성 모달 관련 상태
  const [isStoryboardModalOpen, setIsStoryboardModalOpen] = useState(false);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [editingStory, setEditingStory] = useState<any | null>(null);
  const [storyElements, setStoryElements] = useState<Array<{type: 'text' | 'character', content: string, character?: Character}>>([]);
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  const [isGenerateNextSceneModalOpen, setIsGenerateNextSceneModalOpen] = useState(false);
  const [nextScenePrompt, setNextScenePrompt] = useState('');
  const [selectedCharacter1, setSelectedCharacter1] = useState<Character | null>(null);
  const [selectedCharacter2, setSelectedCharacter2] = useState<Character | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [storyPrompt, setStoryPrompt] = useState('');
  const [draggedCharacters, setDraggedCharacters] = useState<Array<{character: Character, x: number, y: number, id: string}>>([]);
  const storyCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingCharacter, setIsDraggingCharacter] = useState<string | null>(null);


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

  // 스케치 로드
  useEffect(() => {
    const fetchSketches = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sketches`);
        if (response.ok) {
          const data = await response.json();
          setSketches(data.sketches);
        } else {
          // 서버 연결 실패시 localStorage에서 로드
          const savedSketches = localStorage.getItem('sketches');
          if (savedSketches) {
            setSketches(JSON.parse(savedSketches));
          }
        }
      } catch (error) {
        console.error('Failed to fetch sketches:', error);
        const savedSketches = localStorage.getItem('sketches');
        if (savedSketches) {
          setSketches(JSON.parse(savedSketches));
        }
      }
    };
    fetchSketches();
  }, []);

  // 스토리보드 로드
  useEffect(() => {
    const fetchStoryboards = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/storyboards`);
        if (response.ok) {
          const data = await response.json();
          setStoryboard(data.storyboards);
        } else {
          // 서버 연결 실패시 localStorage에서 로드
          const savedStoryboard = localStorage.getItem('storyboard');
          if (savedStoryboard) {
            setStoryboard(JSON.parse(savedStoryboard));
          }
        }
      } catch (error) {
        console.error('Failed to fetch storyboards:', error);
        const savedStoryboard = localStorage.getItem('storyboard');
        if (savedStoryboard) {
          setStoryboard(JSON.parse(savedStoryboard));
        }
      }
    };
    fetchStoryboards();
  }, []);

  // 스토리 로드
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stories`);
        if (response.ok) {
          const data = await response.json();
          setStories(data.stories);
        } else {
          // 서버 연결 실패시 localStorage에서 로드
          const savedStories = localStorage.getItem('stories');
          if (savedStories) {
            setStories(JSON.parse(savedStories));
          }
        }
      } catch (error) {
        console.error('Failed to fetch stories:', error);
        const savedStories = localStorage.getItem('stories');
        if (savedStories) {
          setStories(JSON.parse(savedStories));
        }
      }
    };
    fetchStories();
  }, []);

  // 캔버스 초기화
  useEffect(() => {
    if (canvasRef.current && isSketchModalOpen) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isSketchModalOpen]);


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

  const handleGenerateCharacterSheet = async (character: Character) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-character-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character }),
      });
      if (!response.ok) throw new Error('Failed to generate character sheet');
      const data = await response.json();
      console.log('Character sheet generated:', data.characterSheetImages);
      
      // Update local character data
      setCharacters(prev => prev.map(char => 
        char.id === character.id 
          ? { ...char, characterSheets: data.characterSheetImages }
          : char
      ));
      
      alert(`캐릭터 시트가 생성되었습니다! ${data.characterSheetImages.length}개의 이미지가 생성되었습니다.`);
    } catch (error) {
      console.error(error);
      alert("캐릭터 시트 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 스케치 관련 핸들러
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.strokeStyle = brushColor;
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSketch = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    const newSketch: Sketch = {
      id: Date.now(),
      name: `스케치 ${sketches.length + 1}`,
      dataUrl,
      createdAt: new Date().toISOString()
    };

    try {
      // 서버에 저장
      const response = await fetch(`${API_BASE_URL}/api/sketches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSketch),
      });

      if (response.ok) {
        const updatedSketches = [...sketches, newSketch];
        setSketches(updatedSketches);
        // 백업용 localStorage도 업데이트
        localStorage.setItem('sketches', JSON.stringify(updatedSketches));
        setIsSketchModalOpen(false);
        alert('스케치가 저장되었습니다!');
      } else {
        throw new Error('서버 저장 실패');
      }
    } catch (error) {
      console.error('Failed to save sketch to server:', error);
      // 서버 저장 실패시 localStorage에만 저장
      const updatedSketches = [...sketches, newSketch];
      setSketches(updatedSketches);
      localStorage.setItem('sketches', JSON.stringify(updatedSketches));
      setIsSketchModalOpen(false);
      alert('스케치가 로컬에 저장되었습니다.');
    }
  };

  const selectSketch = (sketch: Sketch) => {
    setSelectedSketch(sketch);
    setKeyImage(sketch.dataUrl);
    setStoryboard([]);
    setSelectedScene(null);
  };

  const handleCreateStoryboard = () => {
    // 현재 키 이미지를 배경으로 설정
    if (keyImage) {
      setBackgroundImage(keyImage);
    }
    setIsStoryboardModalOpen(true);
  };

  // 드래그 앤 드랍 핸들러
  const handleDragStart = (e: React.DragEvent, character: Character) => {
    e.dataTransfer.setData('character', JSON.stringify(character));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const characterData = e.dataTransfer.getData('character');
    if (characterData && storyCanvasRef.current) {
      const character = JSON.parse(characterData);
      const rect = storyCanvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newCharacterId = `${character.id}-${Date.now()}`;
      setDraggedCharacters(prev => [...prev, { character, x, y, id: newCharacterId }]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 캐릭터 드래그 핸들러
  const handleCharacterMouseDown = (e: React.MouseEvent, characterId: string) => {
    e.preventDefault();
    setIsDraggingCharacter(characterId);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCharacter && storyCanvasRef.current) {
      const rect = storyCanvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setDraggedCharacters(prev => 
        prev.map(char => 
          char.id === isDraggingCharacter 
            ? { ...char, x, y }
            : char
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCharacter(null);
  };

  const handleGenerateStoryboard = async () => {
    if (!keyImage || draggedCharacters.length === 0) {
      alert('스케치와 캐릭터를 배치해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        backgroundImage: keyImage,
        characters: draggedCharacters.map(dc => ({
          character: dc.character,
          x: dc.x,
          y: dc.y
        })),
        prompt: storyPrompt,
        aspectRatio: selectedRatio
      };

      const response = await fetch(`${API_BASE_URL}/api/create-storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to create storyboard');
      
      const data = await response.json();
      console.log('Storyboard created:', data);
      
      // 생성된 스토리보드를 기존 스토리보드 목록에 추가
      const newScenes = data.storyboardImages.map((imageUrl: string, index: number) => ({
        id: Date.now() + index,
        imageUrl,
        description: `AI 생성: ${data.sceneDescription}`
      }));
      
      const updatedStoryboard = [...storyboard, ...newScenes];
      setStoryboard(updatedStoryboard);
      
      // 서버에 스토리보드 저장
      try {
        await fetch(`${API_BASE_URL}/api/storyboards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenes: newScenes }),
        });
        console.log('Storyboard saved to server');
      } catch (error) {
        console.error('Failed to save storyboard to server:', error);
      }
      
      // 백업용 localStorage에도 저장
      localStorage.setItem('storyboard', JSON.stringify(updatedStoryboard));
      
      // 첫 번째 생성된 이미지를 메인 화면에 표시
      if (data.storyboardImages.length > 0) {
        setKeyImage(data.storyboardImages[0]);
      }
      
      setIsStoryboardModalOpen(false);
      alert(`스토리보드가 생성되었습니다! ${data.storyboardImages.length}개의 이미지가 생성되었습니다.`);
      
    } catch (error) {
      console.error(error);
      alert("스토리보드 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStory = async () => {
    if (!storyText.trim()) {
      alert('스토리 텍스트를 입력해주세요.');
      return;
    }

    if (editingStory) {
      // 수정 모드
      const updatedStory = {
        ...editingStory,
        text: storyText,
        elements: storyElements,
        updatedAt: new Date().toISOString()
      };

      try {
        // 서버에 스토리 업데이트
        const response = await fetch(`${API_BASE_URL}/api/stories/${editingStory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStory),
        });

        if (response.ok) {
          // 상태 업데이트
          const updatedStories = stories.map(story => 
            story.id === editingStory.id ? updatedStory : story
          );
          setStories(updatedStories);
          localStorage.setItem('stories', JSON.stringify(updatedStories));
          
          setStoryText('');
          setEditingStory(null);
          setStoryElements([]);
          setIsAddStoryModalOpen(false);
          alert('스토리가 수정되었습니다!');
        } else {
          throw new Error('서버 업데이트 실패');
        }
      } catch (error) {
        console.error('Failed to update story on server:', error);
        // 서버 업데이트 실패시에도 로컬에서 수정
        const updatedStories = stories.map(story => 
          story.id === editingStory.id ? updatedStory : story
        );
        setStories(updatedStories);
        localStorage.setItem('stories', JSON.stringify(updatedStories));
        
        setStoryText('');
        setEditingStory(null);
        setStoryElements([]);
        setIsAddStoryModalOpen(false);
        alert('스토리가 로컬에 수정되었습니다.');
      }
    } else {
      // 새 스토리 추가
      const newStory = {
        id: Date.now(),
        text: storyText,
        elements: storyElements,
        createdAt: new Date().toISOString()
      };

      try {
        // 서버에 스토리 저장
        const response = await fetch(`${API_BASE_URL}/api/stories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStory),
        });

        if (response.ok) {
          // 상태 업데이트
          const updatedStories = [...stories, newStory];
          setStories(updatedStories);
          localStorage.setItem('stories', JSON.stringify(updatedStories));
          
          setStoryText('');
          setStoryElements([]);
          setIsAddStoryModalOpen(false);
          alert('스토리가 저장되었습니다!');
        } else {
          throw new Error('서버 저장 실패');
        }
      } catch (error) {
        console.error('Failed to save story to server:', error);
        // 서버 저장 실패시에도 상태와 localStorage 업데이트
        const updatedStories = [...stories, newStory];
        setStories(updatedStories);
        localStorage.setItem('stories', JSON.stringify(updatedStories));
        
        setStoryText('');
        setStoryElements([]);
        setIsAddStoryModalOpen(false);
        alert('스토리가 로컬에 저장되었습니다.');
      }
    }
  };

  const handleAddCharacterToStory = (character: Character) => {
    const characterBadge = `[${character.name}]`;
    setStoryText(prev => prev + (prev ? ' ' : '') + characterBadge);
    
    const newElement = {
      type: 'character' as const,
      content: character.name,
      character: character
    };
    setStoryElements(prev => [...prev, newElement]);
  };

  const handleStoryTextChange = (text: string) => {
    setStoryText(text);
  };

  const handleGenerateImageFromStory = async () => {
    if (!storyText.trim()) {
      alert('스토리 내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        story: storyText,
        elements: storyElements,
        characters: storyElements
          .filter(el => el.type === 'character')
          .map(el => el.character),
        aspectRatio: selectedRatio
      };

      const response = await fetch(`${API_BASE_URL}/api/generate-story-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to generate story image');
      
      const data = await response.json();
      
      // 생성된 이미지를 스토리보드에 추가
      const newScene = {
        id: Date.now(),
        imageUrl: data.imageUrl,
        description: `스토리 생성: ${storyText.slice(0, 100)}...`
      };
      
      const updatedStoryboard = [...storyboard, newScene];
      setStoryboard(updatedStoryboard);
      
      // 서버에 스토리보드 저장
      try {
        await fetch(`${API_BASE_URL}/api/storyboards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenes: [newScene] }),
        });
        console.log('Storyboard saved to server');
      } catch (error) {
        console.error('Failed to save storyboard to server:', error);
      }
      
      // 백업용 localStorage에도 저장
      localStorage.setItem('storyboard', JSON.stringify(updatedStoryboard));
      
      // 메인 화면에 생성된 이미지 표시
      setKeyImage(data.imageUrl);
      
      // 모달 닫기
      setStoryText('');
      setStoryElements([]);
      setEditingStory(null);
      setIsAddStoryModalOpen(false);
      
      alert('스토리 이미지가 생성되었습니다!');
      
    } catch (error) {
      console.error(error);
      alert("이미지 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNextScene = async () => {
    if (!selectedScene) return;
    
    setIsLoading(true);
    try {
      const requestData = {
        startFrameUrl: selectedScene.imageUrl,
        prompt: nextScenePrompt.trim() || undefined,
        aspectRatio: selectedRatio
      };

      const response = await fetch(`${API_BASE_URL}/api/generate-next-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to generate next scene');
      
      const data = await response.json();
      
      // 현재 scene에 endFrameUrl 추가
      const updatedScene = {
        ...selectedScene,
        endFrameUrl: data.endFrameUrl
      };

      // 스토리보드 업데이트
      const updatedStoryboard = storyboard.map(scene => 
        scene.id === selectedScene.id ? updatedScene : scene
      );
      setStoryboard(updatedStoryboard);
      setSelectedScene(updatedScene);
      
      // 서버에 업데이트된 스토리보드 저장
      try {
        await fetch(`${API_BASE_URL}/api/storyboards/${selectedScene.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedScene),
        });
      } catch (error) {
        console.error('Failed to update storyboard on server:', error);
      }
      
      // localStorage 백업
      localStorage.setItem('storyboard', JSON.stringify(updatedStoryboard));
      
      setIsGenerateNextSceneModalOpen(false);
      setNextScenePrompt('');
      alert('다음 장면이 생성되었습니다!');
      
    } catch (error) {
      console.error(error);
      alert("다음 장면 생성에 실패했습니다.");
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
              accept="image/png, image/jpeg, image/gif, image/webp"
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
            <select 
              value={selectedRatio}
              onChange={(e) => setSelectedRatio(e.target.value)}
              className="bg-gray-700 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1:1">1024x1024 (1:1)</option>
              <option value="16:9">1920x1080 (16:9)</option>
              <option value="9:16">1080x1920 (9:16)</option>
            </select>
            <span className="text-gray-400 text-sm">선택된 비율: {selectedRatio}</span>
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
                <button onClick={() => setIsSketchModalOpen(true)} disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 p-3 rounded-md font-bold disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                  스케치 하기
                </button>
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

        {/* Right Panel: Storyboard & Sketches */}
        <div className="w-1/4 min-w-[300px] border-l border-gray-700 p-4 flex flex-col">
          <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('storyboard')} 
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'storyboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              📚 스토리보드
            </button>
            <button 
              onClick={() => setActiveTab('sketches')} 
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'sketches' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              🎨 스케치
            </button>
          </div>

          {/* Sketches Tab */}
          {activeTab === 'sketches' && (
            <div className="flex-grow">
              <h3 className="text-lg font-semibold mb-2">저장된 스케치</h3>
              {sketches.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  <p>저장된 스케치가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto">
                  {sketches.map((sketch) => (
                    <div
                      key={sketch.id}
                      onClick={() => selectSketch(sketch)}
                      className={`bg-gray-800 p-2 rounded-lg flex items-start cursor-pointer hover:bg-gray-700 transition-colors ${selectedSketch?.id === sketch.id ? 'ring-2 ring-orange-400' : ''}`}
                    >
                      <div className="relative w-12 h-12 mr-3 flex-shrink-0 bg-white rounded">
                        <Image src={sketch.dataUrl} alt={sketch.name} fill style={{ objectFit: 'contain' }} className="rounded" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{sketch.name}</p>
                        <p className="text-xs text-gray-400">{new Date(sketch.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Storyboard Tab */}
          {activeTab === 'storyboard' && (
            <div className="flex-grow">
              <h3 className="text-lg font-semibold mb-2">스토리보드</h3>
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => setIsAddStoryModalOpen(true)}
                  className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                >
                  스토리 추가하기
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('storyboard');
                    setStoryboard([]);
                    alert('스토리보드가 초기화되었습니다.');
                  }}
                  className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
                >
                  스토리보드 초기화
                </button>
              </div>
              {(storyboard.length === 0 && stories.length === 0) ? (
                <div className="text-gray-400 text-center mt-10 flex-grow flex items-center justify-center">
                  <p>생성된 스토리보드가<br/>여기에 표시됩니다.</p>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                  {/* 스토리 목록 */}
                  {stories.map((story) => (
                    <div
                      key={`story-${story.id}`}
                      className="bg-gray-800 p-3 rounded-lg border-l-4 border-green-500 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        setEditingStory(story);
                        setStoryText(story.text);
                        setStoryElements(story.elements || []);
                        setIsAddStoryModalOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-green-400 font-semibold">📖 스토리</span>
                        <div className="flex items-center space-x-2">
                          {story.updatedAt && (
                            <span className="text-xs text-yellow-400">수정됨</span>
                          )}
                          <span className="text-xs text-gray-500">{new Date(story.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{story.text}</p>
                    </div>
                  ))}
                  
                  {/* 스토리보드 목록 */}
                  {storyboard.map((scene) => (
                    <div
                      key={`scene-${scene.id}`}
                      className={`bg-gray-800 p-2 rounded-lg flex items-start cursor-pointer hover:bg-gray-700 transition-colors ${selectedScene?.id === scene.id ? 'ring-2 ring-blue-400' : ''}`}
                      onClick={() => {
                        console.log('Clicked scene:', scene);
                        setSelectedScene(scene);
                        setIsSceneModalOpen(true);
                      }}
                    >
                      <div className="relative w-12 h-12 mr-3 flex-shrink-0 bg-gray-700 rounded">
                        <Image 
                          src={scene.imageUrl} 
                          alt={`Scene ${scene.id}`} 
                          fill
                          style={{ objectFit: 'cover' }}
                          className="rounded"
                          onError={(e) => {
                            console.error('Image failed to load:', scene.imageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{scene.description}</p>
                        <p className="text-xs text-gray-500">Scene {scene.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{characterDetailModal.name}</h2>
            
            {/* Original Character Image */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">원본 캐릭터</h3>
              <div className="relative w-48 h-48 mx-auto bg-gray-700 rounded-lg overflow-hidden">
                <Image 
                  src={characterDetailModal.imageUrl} 
                  alt={characterDetailModal.name} 
                  fill 
                  style={{ objectFit: 'cover' }} 
                />
              </div>
            </div>

            {/* Character Sheets */}
            {characterDetailModal.characterSheets && characterDetailModal.characterSheets.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">캐릭터 시트</h3>
                <div className="grid grid-cols-2 gap-4">
                  {characterDetailModal.characterSheets.map((sheetUrl, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg overflow-hidden">
                      <div className="relative aspect-square">
                        <Image 
                          src={sheetUrl} 
                          alt={`Character sheet ${index + 1}`} 
                          fill 
                          style={{ objectFit: 'cover' }} 
                        />
                      </div>
                      <div className="p-2 text-center text-sm text-gray-300">
                        시트 {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-between space-x-4">
              <button 
                onClick={() => setCharacterDetailModal(null)} 
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                닫기
              </button>
              <button 
                onClick={() => {
                  handleGenerateCharacterSheet(characterDetailModal);
                  setCharacterDetailModal(null);
                }} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-semibold transition-colors disabled:bg-gray-500"
              >
                {isLoading ? "생성 중..." : "이미지로 캐릭터 시트 생성하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sketch Modal */}
      {isSketchModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsSketchModalOpen(false)}
        >
          <div 
            className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">스케치 하기</h2>
            
            {/* Drawing Tools */}
            <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">브러시 크기:</label>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm w-8">{brushSize}</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">색상:</label>
                <input 
                  type="color" 
                  value={brushColor} 
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-12 h-8 rounded border-0"
                />
              </div>
              <button 
                onClick={clearCanvas}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              >
                지우기
              </button>
            </div>

            {/* Canvas */}
            <div className="border-2 border-gray-600 rounded-lg mb-6 bg-white">
              <canvas
                ref={canvasRef}
                width={700}
                height={400}
                className="rounded-lg cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ display: 'block' }}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button 
                onClick={() => setIsSketchModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-md font-semibold transition-colors"
              >
                취소
              </button>
              <button 
                onClick={saveSketch}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md font-semibold transition-colors"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storyboard Creation Modal */}
      {isStoryboardModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsStoryboardModalOpen(false)}
        >
          <div 
            className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">스토리보드 구성하기</h2>
            
            <div className="grid grid-cols-4 gap-6">
              {/* Left Panel: Characters */}
              <div className="col-span-1">
                <h3 className="text-lg font-semibold mb-4">캐릭터 선택</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">캐릭터 1:</label>
                  <select 
                    value={selectedCharacter1?.id || ''} 
                    onChange={(e) => setSelectedCharacter1(characters.find(c => c.id === Number(e.target.value)) || null)}
                    className="w-full bg-gray-700 p-2 rounded-md text-white"
                  >
                    <option value="">선택하세요</option>
                    {characters.map(char => (
                      <option key={char.id} value={char.id}>{char.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">캐릭터 2:</label>
                  <select 
                    value={selectedCharacter2?.id || ''} 
                    onChange={(e) => setSelectedCharacter2(characters.find(c => c.id === Number(e.target.value)) || null)}
                    className="w-full bg-gray-700 p-2 rounded-md text-white"
                  >
                    <option value="">선택하세요</option>
                    {characters.map(char => (
                      <option key={char.id} value={char.id}>{char.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">배경 이미지:</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                </div>

                {/* Draggable Characters */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">드래그해서 배치:</h4>
                  {[selectedCharacter1, selectedCharacter2].filter(Boolean).map((char) => (
                    <div
                      key={char!.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, char!)}
                      className="bg-gray-700 p-2 rounded-md cursor-move hover:bg-gray-600 transition-colors flex items-center"
                    >
                      <Image src={char!.imageUrl} alt={char!.name} width={30} height={30} className="rounded mr-2" />
                      <span className="text-sm">{char!.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center Panel: Canvas */}
              <div className="col-span-2">
                <h3 className="text-lg font-semibold mb-4">스토리보드 캔버스</h3>
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-lg bg-white relative"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  style={{ height: '500px' }}
                >
                  {/* Background Image */}
                  {backgroundImage && (
                    <div 
                      className="absolute inset-0 w-full h-full rounded-lg"
                      style={{ 
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  )}
                  
                  <canvas
                    ref={storyCanvasRef}
                    width={600}
                    height={500}
                    className="absolute inset-0 w-full h-full"
                    style={{ background: 'transparent' }}
                  />
                  
                  {/* Render dragged characters */}
                  {draggedCharacters.map((draggedChar) => (
                    <div
                      key={draggedChar.id}
                      className="absolute cursor-move"
                      style={{
                        left: `${draggedChar.x - 25}px`,
                        top: `${draggedChar.y - 25}px`,
                        zIndex: isDraggingCharacter === draggedChar.id ? 10 : 1
                      }}
                      onMouseDown={(e) => handleCharacterMouseDown(e, draggedChar.id)}
                    >
                      <Image 
                        src={draggedChar.character.imageUrl} 
                        alt={draggedChar.character.name} 
                        width={50} 
                        height={50} 
                        className={`rounded-full border-2 shadow-lg ${
                          isDraggingCharacter === draggedChar.id 
                            ? 'border-blue-400 shadow-blue-400/50' 
                            : 'border-white'
                        }`}
                        draggable={false}
                      />
                    </div>
                  ))}
                  
                  {draggedCharacters.length === 0 && !backgroundImage && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <p>캐릭터를 여기에 드래그하세요</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Prompt */}
              <div className="col-span-1">
                <h3 className="text-lg font-semibold mb-4">스토리 프롬프트</h3>
                <textarea
                  value={storyPrompt}
                  onChange={(e) => setStoryPrompt(e.target.value)}
                  placeholder="스토리보드에 대한 설명을 입력하세요..."
                  className="w-full h-64 p-3 bg-gray-700 text-white rounded-md resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button 
                onClick={() => setIsStoryboardModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-md font-semibold transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleGenerateStoryboard}
                disabled={isLoading || !keyImage || draggedCharacters.length === 0}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md font-semibold transition-colors disabled:bg-gray-500"
              >
                {isLoading ? "생성 중..." : "스토리보드 생성"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scene Detail Modal */}
      {isSceneModalOpen && selectedScene && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setIsSceneModalOpen(false)}
        >
          <div 
            className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">🔍 스토리보드 상세 보기</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    setIsGenerateNextSceneModalOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm font-semibold transition-colors"
                >
                  🎬 Generate Next Scene
                </button>
                <button 
                  onClick={() => {
                    // TODO: Make video functionality
                    alert('비디오 생성 기능은 곧 구현됩니다!');
                  }}
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md text-sm font-semibold transition-colors"
                >
                  🎥 Make This as Video
                </button>
              </div>
            </div>
            
            {selectedScene.endFrameUrl ? (
              // Start/End Frame 나란히 표시
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden">
                  <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold z-10">
                    Start Frame
                  </div>
                  <Image 
                    src={selectedScene.imageUrl} 
                    alt={`Start Frame ${selectedScene.id}`} 
                    fill 
                    style={{ objectFit: 'contain' }} 
                    className="rounded-lg" 
                  />
                </div>
                <div className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden">
                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold z-10">
                    End Frame
                  </div>
                  <Image 
                    src={selectedScene.endFrameUrl} 
                    alt={`End Frame ${selectedScene.id}`} 
                    fill 
                    style={{ objectFit: 'contain' }} 
                    className="rounded-lg" 
                  />
                </div>
              </div>
            ) : (
              // 단일 이미지 표시
              <div className="relative w-full aspect-square mb-4 bg-gray-700 rounded-lg overflow-hidden">
                <Image 
                  src={selectedScene.imageUrl} 
                  alt={`Scene ${selectedScene.id}`} 
                  fill 
                  style={{ objectFit: 'contain' }} 
                  className="rounded-lg" 
                />
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">설명</h3>
              <p className="text-gray-300">{selectedScene.description}</p>
            </div>
            
            <div className="flex justify-between space-x-4">
              <button 
                onClick={() => setIsSceneModalOpen(false)} 
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                닫기
              </button>
              <button 
                onClick={() => {
                  setKeyImage(selectedScene.imageUrl);
                  setIsSceneModalOpen(false);
                }} 
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                메인 화면에 표시
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Story Modal */}
      {isAddStoryModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setIsAddStoryModalOpen(false)}
        >
          <div 
            className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{editingStory ? '📝 스토리 수정하기' : '📝 스토리 추가하기'}</h2>
            
            <div className="grid grid-cols-3 gap-6">
              {/* 왼쪽: 캐릭터 선택 */}
              <div className="col-span-1">
                <h3 className="text-lg font-semibold mb-4">캐릭터 추가</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      onClick={() => handleAddCharacterToStory(char)}
                      className="flex items-center p-2 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600 transition-colors"
                    >
                      <Image src={char.imageUrl} alt={char.name} width={30} height={30} className="rounded-full mr-2" />
                      <span className="text-sm">{char.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 오른쪽: 스토리 작성 */}
              <div className="col-span-2">
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">스토리 내용</label>
                  <p className="text-xs text-gray-400 mb-2">왼쪽에서 캐릭터를 클릭하면 [캐릭터명] 형태로 텍스트에 추가됩니다.</p>
                  <textarea
                    value={storyText}
                    onChange={(e) => handleStoryTextChange(e.target.value)}
                    placeholder="스토리를 입력해주세요... 캐릭터를 추가하려면 왼쪽 목록에서 캐릭터를 클릭하세요."
                    className="w-full h-64 p-3 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {storyElements.some(el => el.type === 'character') && (
                    <div className="mt-2 p-2 bg-gray-600 rounded-md">
                      <p className="text-xs text-blue-300 mb-1">포함된 캐릭터:</p>
                      <div className="flex flex-wrap gap-1">
                        {storyElements.filter(el => el.type === 'character').map((element, index) => (
                          <div key={index} className="flex items-center bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                            <Image 
                              src={element.character!.imageUrl} 
                              alt={element.character!.name} 
                              width={16} 
                              height={16} 
                              className="rounded-full mr-1" 
                            />
                            {element.character!.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button 
                onClick={() => {
                  setStoryText('');
                  setEditingStory(null);
                  setStoryElements([]);
                  setIsAddStoryModalOpen(false);
                }} 
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                취소
              </button>
              {editingStory ? (
                <button 
                  onClick={handleSaveStory}
                  disabled={!storyText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-semibold transition-colors disabled:bg-gray-500"
                >
                  수정하기
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleSaveStory}
                    disabled={!storyText.trim()}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md font-semibold transition-colors disabled:bg-gray-500"
                  >
                    저장하기
                  </button>
                  <button 
                    onClick={handleGenerateImageFromStory}
                    disabled={!storyText.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md font-semibold transition-colors disabled:bg-gray-500"
                  >
                    {isLoading ? '생성 중...' : '🎨 이미지 생성하기'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Next Scene Modal */}
      {isGenerateNextSceneModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setIsGenerateNextSceneModalOpen(false)}
        >
          <div 
            className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">🎬 다음 장면 생성하기</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-3">
                현재 이미지에서 이어질 다음 장면을 생성합니다. 특정 지시사항이 있다면 아래에 입력하세요.
              </p>
              
              <label className="block text-sm font-medium mb-2">다음 장면 설명 (선택사항)</label>
              <textarea
                value={nextScenePrompt}
                onChange={(e) => setNextScenePrompt(e.target.value)}
                placeholder="예: 캐릭터가 문을 열고 나간다, 시간이 밤으로 바뀐다, 카메라가 확대된다... (비워두면 자동으로 다음 장면 생성)"
                className="w-full h-24 p-3 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <button 
                onClick={() => {
                  setIsGenerateNextSceneModalOpen(false);
                  setNextScenePrompt('');
                }} 
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md font-semibold transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleGenerateNextScene}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md font-semibold transition-colors disabled:bg-gray-500"
              >
                {isLoading ? '생성 중...' : '🎬 다음 장면 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
