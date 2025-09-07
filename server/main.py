import asyncio
import os
import shutil
import time  # time 모듈을 임포트합니다.
from typing import List, Optional
import json
import base64

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from google import genai
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from google.genai import types

# Load environment variables
success = load_dotenv("../.env")
print(f".env loaded? {success}")

# --- Static 파일 설정 ---
STATIC_DIR = "static"
IMAGES_DIR = os.path.join(STATIC_DIR, "images")
DATA_DIR = "data"
CHARACTERS_JSON = os.path.join(DATA_DIR, "characters.json")
SKETCHES_JSON = os.path.join(DATA_DIR, "sketches.json")
STORYBOARDS_JSON = os.path.join(DATA_DIR, "storyboards.json")
STORIES_JSON = os.path.join(DATA_DIR, "stories.json")
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
print("GOOGLE_API_KEY in env:", os.getenv("GOOGLE_API_KEY"))

# --- Gemini AI 클라이언트 설정 ---
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))



# --- FastAPI 앱 초기화 ---
app = FastAPI()
app.mount(f"/{STATIC_DIR}", StaticFiles(directory=STATIC_DIR), name="static")


# --- CORS 설정 ---
origins = [
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic 데이터 모델 ---
class Character(BaseModel):
    id: int
    name: str
    imageUrl: str
    characterSheets: Optional[List[str]] = []

class StoryboardScene(BaseModel):
    id: int
    imageUrl: str
    description: str

class ImageGenerationRequest(BaseModel):
    character: Character
    sketchData: str

class StoryboardGenerationRequest(BaseModel):
    keyImageUrl: str

class CharacterSheetRequest(BaseModel):
    character: Character

class StoryboardCreationRequest(BaseModel):
    backgroundImage: str  # base64 data URL
    characters: List[dict]  # [{"character": Character, "x": float, "y": float}]
    prompt: str
    aspectRatio: str = "1:1"

class Sketch(BaseModel):
    id: int
    name: str
    dataUrl: str
    createdAt: str

class StoryboardScene(BaseModel):
    id: int
    imageUrl: str
    description: str
    endFrameUrl: Optional[str] = None

class StoryElement(BaseModel):
    type: str  # 'text' or 'character'
    content: str
    character: Optional[dict] = None

class Story(BaseModel):
    id: int
    text: str
    elements: List[StoryElement] = []
    createdAt: str
    updatedAt: Optional[str] = None

class StoryImageRequest(BaseModel):
    story: str
    elements: List[StoryElement]
    characters: List[dict]
    aspectRatio: str = "1:1"

class NextSceneRequest(BaseModel):
    startFrameUrl: str
    prompt: Optional[str] = None
    aspectRatio: str = "1:1"


# --- 데이터 저장/로드 함수 ---
def load_characters() -> List[Character]:
    try:
        with open(CHARACTERS_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [Character(**char) for char in data["characters"]]
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"Error loading characters: {e}")
        return []

def save_characters(characters: List[Character]):
    try:
        data = {
            "characters": [char.dict() for char in characters],
            "next_id": max([char.id for char in characters] + [0]) + 1
        }
        with open(CHARACTERS_JSON, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving characters: {e}")

def get_next_character_id() -> int:
    try:
        with open(CHARACTERS_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("next_id", 1)
    except:
        return 1

# 스케치 관련 함수들
def load_sketches() -> List[Sketch]:
    try:
        with open(SKETCHES_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [Sketch(**sketch) for sketch in data["sketches"]]
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"Error loading sketches: {e}")
        return []

def save_sketches(sketches: List[Sketch]):
    try:
        data = {
            "sketches": [sketch.dict() for sketch in sketches]
        }
        with open(SKETCHES_JSON, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving sketches: {e}")

# 스토리보드 관련 함수들
def load_storyboards() -> List[StoryboardScene]:
    try:
        with open(STORYBOARDS_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [StoryboardScene(**scene) for scene in data["storyboards"]]
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"Error loading storyboards: {e}")
        return []

def save_storyboards(storyboards: List[StoryboardScene]):
    try:
        data = {
            "storyboards": [storyboard.dict() for storyboard in storyboards]
        }
        with open(STORYBOARDS_JSON, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving storyboards: {e}")

def load_stories() -> List[Story]:
    try:
        with open(STORIES_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [Story(**story) for story in data["stories"]]
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"Error loading stories: {e}")
        return []

def save_stories(stories: List[Story]):
    try:
        data = {
            "stories": [story.dict() for story in stories]
        }
        with open(STORIES_JSON, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving stories: {e}")

# --- 데이터 초기화 ---
DEFAULT_IMAGE_URL = "http://localhost:8000/static/images/default.svg"
db_characters: List[Character] = load_characters()
next_character_id = get_next_character_id()
db_sketches: List[Sketch] = load_sketches()
db_storyboards: List[StoryboardScene] = load_storyboards()
db_stories: List[Story] = load_stories()


# --- API 엔드포인트 ---

@app.get("/")
def read_root():
    return {"message": "AI Animation Studio Backend is running."}

@app.get("/api/characters", response_model=List[Character])
async def get_characters():
    return db_characters

# [수정됨] 캐릭터 등록 시 이미지 파일 업로드 처리
@app.post("/api/characters", response_model=Character)
async def create_character(name: str = Form(...), image: UploadFile = File(...)):
    global next_character_id

    # [수정] JavaScript의 Date.now()를 Python의 time.time()으로 변경
    unique_filename = f"{int(time.time())}_{image.filename}"
    file_path = os.path.join(IMAGES_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    image_url = f"http://localhost:8000/{STATIC_DIR}/images/{unique_filename}"

    new_character = Character(
        id=next_character_id,
        name=name,
        imageUrl=image_url,
        characterSheets=[]
    )
    db_characters.append(new_character)
    next_character_id += 1
    save_characters(db_characters)
    return new_character

@app.post("/api/generate-image")
async def generate_image(request: ImageGenerationRequest):
    print(f"[API] Generating image for character: {request.character.name}")
    await asyncio.sleep(1.5)
    return {"imageUrl": DEFAULT_IMAGE_URL}

@app.post("/api/generate-storyboard", response_model=List[StoryboardScene])
async def generate_storyboard(request: StoryboardGenerationRequest):
    print(f"[API] Generating storyboard from image: {request.keyImageUrl}")
    await asyncio.sleep(2.5)
    mock_storyboard = [
        {"id": 1, "imageUrl": DEFAULT_IMAGE_URL, "description": "1. [AI] 소년이 신비로운 숲의 입구를 발견합니다."},
        {"id": 2, "imageUrl": DEFAULT_IMAGE_URL, "description": "2. [AI] 숲으로 들어가자 빛나는 버섯들을 마주칩니다."},
        {"id": 3, "imageUrl": DEFAULT_IMAGE_URL, "description": "3. [AI] 버섯들 사이에서 작은 정령을 만납니다."},
    ]
    return mock_storyboard

@app.post("/api/generate-character-sheet")
async def generate_character_sheet(request: CharacterSheetRequest):
    print(f"[API] Generating character sheet for: {request.character.name}")
    print(f"[API] Character image URL: {request.character.imageUrl}")
    
    try:
        # --- URL을 로컬 경로로 변환 ---
        if request.character.imageUrl.startswith("http://localhost:8000/"):
            local_path = request.character.imageUrl.replace("http://localhost:8000/", "")
        else:
            local_path = request.character.imageUrl
        
        file_path = os.path.join(".", local_path)
        print(f"[API] Opening local file: {file_path}")
        
        # 로컬 파일 열기
        with open(file_path, "rb") as f:
            image_bytes = f.read()
        
        character_image = Image.open(BytesIO(image_bytes))
        print(f"[API] Image loaded: {character_image.size}")
        
        prompt = f"""Based on this character image, generate each of the following 5 images for a complete character sheet:

1. Proportion settings (height comparisons, head-to-body ratios, etc.)
2. Three views (front, side, back) 
3. Expression settings (Expression Sheet) - showing various facial expressions
4. Action settings (Pose Sheet) - showing various common poses
5. Clothing settings (Costume Design) - showing different outfit variations

Character name: {request.character.name}
Please create a comprehensive character sheet with all 5 sections for animation reference."""
        
        print("[API] Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=[
                prompt,
                types.Part(
                    inline_data=types.Blob(
                        mime_type="image/png",
                        data=image_bytes,
                    )
                )
            ],
        )
        
        print(f"[API] Gemini response received")
        print(f"[API] Number of candidates: {len(response.candidates)}")
        
        generated_images = []
        if response.candidates and len(response.candidates) > 0:
            parts = response.candidates[0].content.parts
            print(f"[API] Number of parts in response: {len(parts)}")
            
            for i, part in enumerate(parts):
                if part.text is not None:
                    print(f"[API] Part {i}: Text - {part.text[:100]}...")
                elif part.inline_data is not None:
                    print(f"[API] Part {i}: Image data found, size: {len(part.inline_data.data)} bytes")
                    # Save generated image
                    unique_filename = f"character_sheet_{int(time.time())}_{i}.png"
                    save_path = os.path.join(IMAGES_DIR, unique_filename)
                    
                    image = Image.open(BytesIO(part.inline_data.data))
                    image.save(save_path)
                    print(f"[API] Saved image: {save_path}")
                    
                    image_url = f"http://localhost:8000/{STATIC_DIR}/images/{unique_filename}"
                    generated_images.append(image_url)
        
        # Update character with generated sheet images
        for char in db_characters:
            if char.id == request.character.id:
                char.characterSheets = generated_images
                break
        save_characters(db_characters)
        
        print(f"[API] Generated {len(generated_images)} images")
        return {"characterSheetImages": generated_images}
        
    except Exception as e:
        print(f"[API] Error generating character sheet: {e}")
        import traceback
        traceback.print_exc()
        return {"characterSheetImages": [DEFAULT_IMAGE_URL] * 5}

@app.post("/api/create-storyboard")
async def create_storyboard(request: StoryboardCreationRequest):
    print(f"[API] Creating storyboard with {len(request.characters)} characters")
    print(f"[API] User prompt: {request.prompt}")
    print(f"[API] Requested aspect ratio: {request.aspectRatio}")
    
    try:
        # --- 1. Vision Analysis: 캐릭터 위치 파악 ---
        print("[API] Analyzing character positions...")
        
        # base64 이미지를 바이트로 변환
        if request.backgroundImage.startswith('data:image'):
            header, data = request.backgroundImage.split(',', 1)
            background_bytes = base64.b64decode(data)
        else:
            background_bytes = base64.b64decode(request.backgroundImage)
        
        # 캐릭터 위치 분석 프롬프트
        position_analysis_prompt = f"""
        Analyze this sketch image and describe the positions of characters that should be placed at these coordinates:
        """
        
        for i, char_data in enumerate(request.characters):
            char = char_data["character"]
            x_percent = (char_data["x"] / 600) * 100  # 캔버스 크기 기준으로 백분율 계산
            y_percent = (char_data["y"] / 500) * 100
            position_analysis_prompt += f"\n- {char['name']}: positioned at {x_percent:.1f}% from left, {y_percent:.1f}% from top"
        
        position_analysis_prompt += f"\n\nUser's story context: {request.prompt}\n\nBased on the sketch and character positions, create a detailed scene description for generating a storyboard image."
        
        vision_response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=[
                position_analysis_prompt,
                types.Part(
                    inline_data=types.Blob(
                        mime_type="image/png",
                        data=background_bytes,
                    )
                )
            ],
        )
        
        scene_description = ""
        if vision_response.candidates and len(vision_response.candidates) > 0:
            for part in vision_response.candidates[0].content.parts:
                if part.text:
                    scene_description += part.text
        
        print(f"[API] Generated scene description: {scene_description[:200]}...")
        
        # --- 2. 이미지 생성: 스케치 + 캐릭터 시트 이미지들 ---
        print("[API] Generating storyboard image...")
        
        # 비율에 따른 추가 프롬프트
        ratio_prompts = {
            "1:1": "IMPORTANT: Generate a SQUARE image with 1:1 aspect ratio. The image must be exactly square shaped, with equal width and height. Do not create vertical or horizontal rectangles.",
            "16:9": "IMPORTANT: Generate a WIDE HORIZONTAL image with 16:9 aspect ratio. The image must be wider than it is tall, like a movie screen or landscape photo.",
            "9:16": "IMPORTANT: Generate a TALL VERTICAL image with 9:16 aspect ratio. The image must be taller than it is wide, like a smartphone screen or portrait photo."
        }

        # 이미지 생성을 위한 콘텐츠 준비
        generation_prompt = f"""
        Create a detailed storyboard scene based on this sketch and character references.
        
        IMPORTANT: Use the exact character designs from the provided character sheets. Match their clothing, facial features, and style precisely.
        
        Scene Description: {scene_description}
        
        Style: Animation storyboard, clean lines, detailed characters that EXACTLY match the provided character reference sheets.
        
        {ratio_prompts.get(request.aspectRatio, ratio_prompts["1:1"])}
        
        Character positioning instructions:"""
        
        print(f"[API] Final storyboard prompt sent to Gemini: {generation_prompt}")
        
        for char_data in request.characters:
            char = char_data["character"]
            x_percent = (char_data["x"] / 600) * 100
            y_percent = (char_data["y"] / 500) * 100
            generation_prompt += f"\n- Place {char['name']} at {x_percent:.1f}% from left, {y_percent:.1f}% from top, using the exact design from their character sheet."
        
        contents_for_generation = [generation_prompt]
        
        # 배경 스케치 추가
        contents_for_generation.append(
            types.Part(
                inline_data=types.Blob(
                    mime_type="image/png",
                    data=background_bytes,
                )
            )
        )
        
        # 각 캐릭터의 캐릭터 시트 이미지들 추가 (모든 시트 이미지 포함)
        for char_data in request.characters:
            char = char_data["character"]
            if char.get("characterSheets") and len(char["characterSheets"]) > 0:
                # 모든 캐릭터 시트 이미지 추가
                for i, sheet_url in enumerate(char["characterSheets"]):
                    if sheet_url.startswith("http://localhost:8000/"):
                        local_path = sheet_url.replace("http://localhost:8000/", "")
                        sheet_file_path = os.path.join(".", local_path)
                        
                        try:
                            with open(sheet_file_path, "rb") as f:
                                sheet_bytes = f.read()
                            
                            contents_for_generation.append(
                                types.Part(
                                    inline_data=types.Blob(
                                        mime_type="image/png",
                                        data=sheet_bytes,
                                    )
                                )
                            )
                            print(f"[API] Added character sheet {i+1} for {char['name']}")
                        except Exception as e:
                            print(f"[API] Failed to load character sheet {i+1} for {char['name']}: {e}")
                
                # 캐릭터 시트 설명 추가
                contents_for_generation[0] += f"\n\nFor {char['name']}: Reference the character sheets provided - use these exact designs for clothing, hair, facial features, and overall appearance."
        
        # 이미지 생성 요청
        generation_response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=contents_for_generation,
        )
        
        generated_images = []
        if generation_response.candidates and len(generation_response.candidates) > 0:
            candidate = generation_response.candidates[0]
            print(f"[API] Candidate content: {candidate.content}")
            
            if candidate.content and hasattr(candidate.content, 'parts'):
                parts = candidate.content.parts
                print(f"[API] Number of parts in response: {len(parts)}")
                
                for i, part in enumerate(parts):
                    if hasattr(part, 'inline_data') and part.inline_data is not None:
                        print(f"[API] Part {i}: Image data found, size: {len(part.inline_data.data)} bytes")
                        # 스토리보드 이미지 저장
                        unique_filename = f"storyboard_{int(time.time())}_{i}.png"
                        save_path = os.path.join(IMAGES_DIR, unique_filename)
                        
                        image = Image.open(BytesIO(part.inline_data.data))
                        image.save(save_path)
                        print(f"[API] Saved storyboard image: {save_path}")
                        
                        image_url = f"http://localhost:8000/{STATIC_DIR}/images/{unique_filename}"
                        generated_images.append(image_url)
                    elif hasattr(part, 'text') and part.text:
                        print(f"[API] Part {i}: Text response - {part.text[:100]}...")
            else:
                print("[API] No content or parts found in response")
                # 응답 구조 디버깅
                print(f"[API] Full response structure: {dir(candidate)}")
                if hasattr(candidate, 'finish_reason'):
                    print(f"[API] Finish reason: {candidate.finish_reason}")
        else:
            print("[API] No candidates in response")
        
        print(f"[API] Generated {len(generated_images)} storyboard images")
        return {
            "storyboardImages": generated_images,
            "sceneDescription": scene_description
        }
        
    except Exception as e:
        print(f"[API] Error creating storyboard: {e}")
        import traceback
        traceback.print_exc()
        return {
            "storyboardImages": [DEFAULT_IMAGE_URL],
            "sceneDescription": "Error generating scene description"
        }

@app.get("/api/sketches")
async def get_sketches():
    return {"sketches": [sketch.dict() for sketch in db_sketches]}

@app.post("/api/sketches")
async def save_sketch(sketch_data: dict):
    try:
        new_sketch = Sketch(**sketch_data)
        db_sketches.append(new_sketch)
        save_sketches(db_sketches)
        return {"success": True, "sketch": new_sketch.dict()}
    except Exception as e:
        print(f"Error saving sketch: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/storyboards")
async def get_storyboards():
    return {"storyboards": [storyboard.dict() for storyboard in db_storyboards]}

@app.post("/api/storyboards")
async def save_storyboard_scenes(scenes_data: dict):
    try:
        new_scenes = [StoryboardScene(**scene) for scene in scenes_data["scenes"]]
        db_storyboards.extend(new_scenes)
        save_storyboards(db_storyboards)
        return {"success": True, "scenes": [scene.dict() for scene in new_scenes]}
    except Exception as e:
        print(f"Error saving storyboard scenes: {e}")
        return {"success": False, "error": str(e)}

# --- Stories API ---
@app.get("/api/stories")
async def get_stories():
    return {"stories": [story.dict() for story in db_stories]}

@app.post("/api/stories")
async def save_story(story_data: dict):
    try:
        new_story = Story(**story_data)
        db_stories.append(new_story)
        save_stories(db_stories)
        return {"success": True, "story": new_story.dict()}
    except Exception as e:
        print(f"Error saving story: {e}")
        return {"success": False, "error": str(e)}

@app.put("/api/stories/{story_id}")
async def update_story(story_id: int, story_data: dict):
    try:
        for i, story in enumerate(db_stories):
            if story.id == story_id:
                updated_story = Story(**story_data)
                db_stories[i] = updated_story
                save_stories(db_stories)
                return {"success": True, "story": updated_story.dict()}
        return {"success": False, "error": "Story not found"}
    except Exception as e:
        print(f"Error updating story: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/generate-story-image")
async def generate_story_image(request: StoryImageRequest):
    try:
        print(f"[API] Generating image for story: {request.story}")
        print(f"[API] Characters involved: {len(request.characters)}")
        print(f"[API] Requested aspect ratio: {request.aspectRatio}")
        
        # 비율에 따른 추가 프롬프트
        ratio_prompts = {
            "1:1": "IMPORTANT: Generate a SQUARE image with 1:1 aspect ratio. The image must be exactly square shaped, with equal width and height. Do not create vertical or horizontal rectangles.",
            "16:9": "IMPORTANT: Generate a WIDE HORIZONTAL image with 16:9 aspect ratio. The image must be wider than it is tall, like a movie screen or landscape photo.",
            "9:16": "IMPORTANT: Generate a TALL VERTICAL image with 9:16 aspect ratio. The image must be taller than it is wide, like a smartphone screen or portrait photo."
        }
        
        # Gemini로 이미지 생성 프롬프트 구성
        prompt = f"""Create an anime-style illustration for this story:
        
Story: {request.story}

Style: High-quality anime art, detailed characters, vibrant colors, dynamic composition.
Characters should match the provided reference images exactly - same appearance, clothing, and features.

The scene should capture the emotion and action described in the story text.

{ratio_prompts.get(request.aspectRatio, ratio_prompts["1:1"])}"""

        print(f"[API] Final prompt sent to Gemini: {prompt}")
        contents_for_generation = [prompt]
        
        # 캐릭터 이미지들 추가
        for char in request.characters:
            if char.get("characterSheets") and len(char["characterSheets"]) > 0:
                for sheet_url in char["characterSheets"]:
                    if sheet_url.startswith("http://localhost:8000/"):
                        local_path = sheet_url.replace("http://localhost:8000/", "")
                        sheet_file_path = os.path.join(".", local_path)
                        
                        try:
                            with open(sheet_file_path, "rb") as f:
                                sheet_bytes = f.read()
                            
                            contents_for_generation.append(
                                types.Part(
                                    inline_data=types.Blob(
                                        mime_type="image/png",
                                        data=sheet_bytes,
                                    )
                                )
                            )
                            print(f"[API] Added character sheet for {char['name']}")
                        except Exception as e:
                            print(f"[API] Failed to load character sheet for {char['name']}: {e}")
            elif char.get("imageUrl"):
                # 캐릭터 기본 이미지 사용
                if char["imageUrl"].startswith("http://localhost:8000/"):
                    local_path = char["imageUrl"].replace("http://localhost:8000/", "")
                    char_file_path = os.path.join(".", local_path)
                    
                    try:
                        with open(char_file_path, "rb") as f:
                            char_bytes = f.read()
                        
                        contents_for_generation.append(
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type="image/png",
                                    data=char_bytes,
                                )
                            )
                        )
                        print(f"[API] Added character image for {char['name']}")
                    except Exception as e:
                        print(f"[API] Failed to load character image for {char['name']}: {e}")

        # 이미지 생성 요청
        generation_response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=contents_for_generation,
        )
        
        if generation_response.candidates and len(generation_response.candidates) > 0:
            candidate = generation_response.candidates[0]
            
            if candidate.content and hasattr(candidate.content, 'parts'):
                parts = candidate.content.parts
                
                for i, part in enumerate(parts):
                    if hasattr(part, 'inline_data') and part.inline_data is not None:
                        # 스토리 이미지 저장
                        unique_filename = f"story_{int(time.time())}_{i}.png"
                        save_path = os.path.join(IMAGES_DIR, unique_filename)
                        
                        image = Image.open(BytesIO(part.inline_data.data))
                        image.save(save_path)
                        print(f"[API] Saved story image: {save_path}")
                        
                        image_url = f"http://localhost:8000/{STATIC_DIR}/images/{unique_filename}"
                        return {"imageUrl": image_url}
        
        print("[API] No image generated from response")
        return {"imageUrl": DEFAULT_IMAGE_URL}
        
    except Exception as e:
        print(f"[API] Error generating story image: {e}")
        import traceback
        traceback.print_exc()
        return {"imageUrl": DEFAULT_IMAGE_URL}

@app.post("/api/generate-next-scene")
async def generate_next_scene(request: NextSceneRequest):
    try:
        print(f"[API] Generating next scene from: {request.startFrameUrl}")
        print(f"[API] Custom prompt: {request.prompt}")
        print(f"[API] Aspect ratio: {request.aspectRatio}")
        
        # 비율에 따른 추가 프롬프트
        ratio_prompts = {
            "1:1": "IMPORTANT: Generate a SQUARE image with 1:1 aspect ratio. The image must be exactly square shaped, with equal width and height. Do not create vertical or horizontal rectangles.",
            "16:9": "IMPORTANT: Generate a WIDE HORIZONTAL image with 16:9 aspect ratio. The image must be wider than it is tall, like a movie screen or landscape photo.",
            "9:16": "IMPORTANT: Generate a TALL VERTICAL image with 9:16 aspect ratio. The image must be taller than it is wide, like a smartphone screen or portrait photo."
        }

        # 기본 프롬프트 또는 사용자 프롬프트 사용
        if request.prompt:
            scene_instruction = f"Create the next scene with this direction: {request.prompt}"
        else:
            scene_instruction = "Create a natural next scene that logically follows from the start frame. Show what happens next in this story sequence."

        # Gemini로 다음 장면 생성 프롬프트 구성
        prompt = f"""You are given a START FRAME image. Create an END FRAME that shows the next logical scene in the sequence.

START FRAME: This is the current scene (provided as image)

TASK: {scene_instruction}

REQUIREMENTS:
- Maintain visual consistency with the start frame (same art style, character designs, color palette)
- Show clear progression from start to end frame 
- Keep the same characters and setting unless specifically instructed otherwise
- Create a smooth visual transition that could be animated between these two frames

Style: High-quality anime art, detailed characters, vibrant colors, dynamic composition that matches the start frame.

{ratio_prompts.get(request.aspectRatio, ratio_prompts["1:1"])}"""

        contents_for_generation = [prompt]
        
        # Start frame 이미지 추가
        if request.startFrameUrl.startswith("http://localhost:8000/"):
            local_path = request.startFrameUrl.replace("http://localhost:8000/", "")
            start_frame_path = os.path.join(".", local_path)
            
            try:
                with open(start_frame_path, "rb") as f:
                    start_frame_bytes = f.read()
                
                contents_for_generation.append(
                    types.Part(
                        inline_data=types.Blob(
                            mime_type="image/png",
                            data=start_frame_bytes,
                        )
                    )
                )
                print(f"[API] Added start frame image: {start_frame_path}")
            except Exception as e:
                print(f"[API] Failed to load start frame: {e}")
                return {"endFrameUrl": DEFAULT_IMAGE_URL}

        print(f"[API] Final next scene prompt sent to Gemini: {prompt}")

        # 이미지 생성 요청
        generation_response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=contents_for_generation,
        )
        
        if generation_response.candidates and len(generation_response.candidates) > 0:
            candidate = generation_response.candidates[0]
            
            if candidate.content and hasattr(candidate.content, 'parts'):
                parts = candidate.content.parts
                
                for i, part in enumerate(parts):
                    if hasattr(part, 'inline_data') and part.inline_data is not None:
                        # End frame 이미지 저장
                        unique_filename = f"next_scene_{int(time.time())}_{i}.png"
                        save_path = os.path.join(IMAGES_DIR, unique_filename)
                        
                        image = Image.open(BytesIO(part.inline_data.data))
                        image.save(save_path)
                        print(f"[API] Saved next scene image: {save_path}")
                        
                        end_frame_url = f"http://localhost:8000/{STATIC_DIR}/images/{unique_filename}"
                        return {"endFrameUrl": end_frame_url}
        
        print("[API] No image generated from response")
        return {"endFrameUrl": DEFAULT_IMAGE_URL}
        
    except Exception as e:
        print(f"[API] Error generating next scene: {e}")
        import traceback
        traceback.print_exc()
        return {"endFrameUrl": DEFAULT_IMAGE_URL}
