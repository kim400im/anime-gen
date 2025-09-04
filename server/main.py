import asyncio
import os
import shutil
import time  # time 모듈을 임포트합니다.
from typing import List

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# --- Static 파일 설정 ---
STATIC_DIR = "static"
IMAGES_DIR = os.path.join(STATIC_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)


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

class StoryboardScene(BaseModel):
    id: int
    imageUrl: str
    description: str

class ImageGenerationRequest(BaseModel):
    character: Character
    sketchData: str

class StoryboardGenerationRequest(BaseModel):
    keyImageUrl: str


# --- 인메모리 DB ---
# 기본 이미지 경로를 포함합니다. 이 파일이 실제로 존재해야 합니다.
DEFAULT_IMAGE_URL = "http://localhost:8000/static/images/default.svg"
db_characters: List[Character] = [
    Character(id=1, name="아리", imageUrl=DEFAULT_IMAGE_URL),
]
next_character_id = 2


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
        imageUrl=image_url
    )
    db_characters.append(new_character)
    next_character_id += 1
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
