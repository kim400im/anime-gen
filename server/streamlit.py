import streamlit as st
from PIL import Image
import google.generativeai as genai
from io import BytesIO

st.set_page_config(page_title="Image Generator", layout="centered")
st.title("Image Generator")

# API 키 입력
api_key = st.text_input("Gemini API 키를 입력하세요:", type="password")
if api_key:
    genai.configure(api_key=api_key)
else:
    st.warning("API 키를 입력해주세요.")

# 이미지 업로드
uploaded_file = st.file_uploader("이미지를 업로드하세요...", type=["png", "jpg", "jpeg"])

if uploaded_file and api_key:
    st.image(uploaded_file, caption="원본 이미지", use_column_width=True)
    
    prompt = st.text_area(
        "프롬프트를 입력하세요:",
        value="Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation",
        height=100
    )

    if st.button("이미지 생성"):
        if prompt:
            st.info("이미지를 생성합니다...")
            try:
                # --- 요청하신 코드 로직 ---
                image = Image.open(uploaded_file)
                
                # 요청하신 모델명 "gemini-2.5-flash-image-preview"를 그대로 사용합니다.
                model = genai.GenerativeModel("gemini-2.5-flash-image-preview") 

                response = model.generate_content(
                    contents=[prompt, image],
                )
                
                # 응답 처리
                for part in response.candidates[0].content.parts:
                    if part.text is not None:
                        st.write("모델 응답 (텍스트):")
                        st.markdown(part.text)
                    elif part.inline_data is not None:
                        generated_image_bytes = BytesIO(part.inline_data.data)
                        generated_image = Image.open(generated_image_bytes)
                        st.image(generated_image, caption="생성된 이미지", use_column_width=True)
                        st.success("이미지가 생성되었습니다.")
                # --- 요청 코드 로직 끝 ---

            except Exception as e:
                st.error(f"오류가 발생했습니다: {e}")
        else:
            st.warning("프롬프트를 입력해주세요.")