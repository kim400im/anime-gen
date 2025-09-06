import asyncio
import os
import shutil
import time  # time 모듈을 임포트합니다.
from typing import List, Optional
import json

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

# --- 데이터 초기화 ---
DEFAULT_IMAGE_URL = "http://localhost:8000/static/images/default.svg"
db_characters: List[Character] = load_characters()
next_character_id = get_next_character_id()


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
