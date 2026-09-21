import os
import pickle
import nltk
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# NLTK-এর প্রয়োজনীয় ডাটা ডাউনলোড
nltk.download('punkt')
nltk.download('stopwords')

# FastAPI App ইনিশিয়ালাইজেশন
app = FastAPI()

# static ফোল্ডার মাউন্ট করা (HTML, CSS, JS এর জন্য)
app.mount("/static", StaticFiles(directory="static"), name="static")

# PorterStemmer এবং Stopwords লোড
ps = PorterStemmer()
stop_words = set(stopwords.words('english'))

# Pickle ফাইল নিরাপদে লোড করা (Path handling সহ)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, 'model.pkl')
vectorizer_path = os.path.join(BASE_DIR, 'vectorizer.pkl')

with open(model_path, 'rb') as f:
    model = pickle.load(f)

with open(vectorizer_path, 'rb') as f:
    vectorizer = pickle.load(f)

# Text Preprocessing Function
def transform_text(text: str):
    text = text.lower()
    words = word_tokenize(text)
    y = [word for word in words if word.isalnum()]
    y = [word for word in y if word not in stop_words]
    y = [ps.stem(word) for word in y]
    return " ".join(y)

# Input Structure Definition
class SMSRequest(BaseModel):
    text: str

# হোম রুটে index.html ফাইল দেখানো
@app.get("/")
def home():
    return FileResponse("static/index.html")

@app.post("/predict")
def predict_spam(data: SMSRequest):
    cleaned_text = transform_text(data.text)
    transformed_text = vectorizer.transform([cleaned_text])
    prediction = model.predict(transformed_text)[0]
    result = "Spam" if prediction == 1 else "Not Spam"
    
    return {
        "raw_text": data.text,
        "cleaned_text": cleaned_text,
        "prediction": result 
    }