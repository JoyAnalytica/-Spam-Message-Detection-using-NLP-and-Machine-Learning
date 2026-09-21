from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# NLTK-এর প্রয়োজনীয় ডাটা ডাউনলোড (যদি আগে থেকে না থাকে)
nltk.download('punkt')
nltk.download('stopwords')

# FastAPI App ইনিশিয়ালাইজেশন
app = FastAPI()

# PorterStemmer এবং Stopwords লোড
ps = PorterStemmer()
stop_words = set(stopwords.words('english'))

# Pickle ফাইল লোড করা
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('vectorizer.pkl', 'rb') as f:
    vectorizer = pickle.load(f)

# আপনার নোটবুকের লজিক অনুযায়ী Text Preprocessing Function
def transform_text(text: str):
    # 1. Lowercase করা
    text = text.lower()
    
    # 2. Tokenize করা
    words = word_tokenize(text)
    
    # 3. Special Character বাদ দেওয়া (isalnum)
    y = [word for word in words if word.isalnum()]
    
    # 4. Stop words বাদ দেওয়া
    y = [word for word in y if word not in stop_words]
    
    # 5. Stemming করা
    y = [ps.stem(word) for word in y]
    
    # 6. List-কে আবার String-এ রূপান্তর করা
    return " ".join(y)

# Input Structure Definition
class SMSRequest(BaseModel):
    text: str

@app.get("/")
def home():
    return {"message": "Spam Detection API is running!"}

@app.post("/predict")
def predict_spam(data: SMSRequest):
    # ১. ইউজার থেকে আসা Text-কে Preprocess করা
    cleaned_text = transform_text(data.text)
    
    # ২. Cleaned Text-কে Vectorize করা
    transformed_text = vectorizer.transform([cleaned_text])
    
    # ৩. Prediction করা
    prediction = model.predict(transformed_text)[0]
    
    # ৪. Result বের করা
    result = "Spam" if prediction == 1 else "Not Spam"
    
    return {
        "raw_text": data.text,
        "cleaned_text": cleaned_text,
        "prediction": result
    }