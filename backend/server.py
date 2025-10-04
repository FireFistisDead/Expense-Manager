from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.hash import bcrypt
import base64
# from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
import tempfile
import aiofiles
import requests
import json

# Mock classes for emergentintegrations
class LlmChat:
    def __init__(self, *args, **kwargs):
        pass
    
    def chat(self, *args, **kwargs):
        return {"content": "Mock LLM response"}

class UserMessage:
    def __init__(self, content):
        self.content = content

class FileContentWithMimeType:
    def __init__(self, content, mime_type):
        self.content = content
        self.mime_type = mime_type

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Expense Management System", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str  # "admin", "manager", "employee"
    company_id: str
    manager_id: Optional[str] = None
    is_manager_approver: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: Optional[str] = None
    country: str = "US"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    currency: str = "USD"
    country: str = "US"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    amount: float
    currency: str
    category: str
    description: str
    date: datetime
    status: str = "pending"  # pending, approved, rejected
    receipt_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approval_history: List[Dict[str, Any]] = []

class ExpenseCreate(BaseModel):
    amount: float
    currency: str = "USD"
    category: str
    description: str
    date: datetime

class ApprovalAction(BaseModel):
    action: str  # "approve" or "reject"
    comment: Optional[str] = None

# JWT Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Currency conversion
async def get_currency_rates(base_currency: str = "USD"):
    try:
        response = requests.get(f"https://api.exchangerate-api.com/v4/latest/{base_currency}")
        if response.status_code == 200:
            return response.json()["rates"]
    except:
        pass
    return {"USD": 1.0}  # Fallback

# OCR Function
async def extract_receipt_data(image_file: UploadFile):
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            content = await image_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Initialize LLM chat for OCR
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"receipt_ocr_{uuid.uuid4()}",
            system_message="You are an OCR assistant that extracts expense information from receipt images."
        ).with_model("openai", "gpt-4o")

        # Create file content for the image
        image_file_content = FileContentWithMimeType(
            file_path=temp_file_path,
            mime_type="image/jpeg"
        )

        # Send message with image
        user_message = UserMessage(
            text="""Extract the following information from this receipt image and return as JSON:
            {
                "amount": <total amount as float>,
                "date": <date in YYYY-MM-DD format>,
                "merchant_name": <restaurant/store name>,
                "description": <brief description of purchase>,
                "category": <expense category like 'meals', 'travel', 'office supplies', etc>
            }
            Return only valid JSON without any additional text.""",
            file_contents=[image_file_content]
        )

        response = await chat.send_message(user_message)
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        # Parse the JSON response
        try:
            extracted_data = json.loads(response)
            return extracted_data
        except json.JSONDecodeError:
            # Try to extract JSON from response if wrapped in other text
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                raise ValueError("Could not parse JSON from OCR response")
                
    except Exception as e:
        logging.error(f"OCR extraction failed: {str(e)}")
        return {"error": str(e)}

# API Routes
@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Get country and currency data
    try:
        countries_response = requests.get("https://restcountries.com/v3.1/all?fields=name,currencies")
        countries_data = countries_response.json()
        
        # Find currency for selected country
        currency = "USD"  # Default
        for country in countries_data:
            if country["name"]["common"] == user_data.country:
                if "currencies" in country:
                    currency = list(country["currencies"].keys())[0]
                break
    except:
        currency = "USD"
    
    # Create company (first user becomes admin)
    company_name = user_data.company_name or f"{user_data.full_name}'s Company"
    company = Company(
        name=company_name,
        currency=currency,
        country=user_data.country
    )
    await db.companies.insert_one(company.dict())
    
    # Create user
    hashed_password = bcrypt.hash(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role="admin",  # First user is admin
        company_id=company.id
    )
    
    # Store user with hashed password
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not bcrypt.verify(login_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user = User(**user_doc)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    expense = Expense(
        employee_id=current_user.id,
        **expense_data.dict()
    )
    await db.expenses.insert_one(expense.dict())
    return expense

@api_router.post("/expenses/with-receipt")
async def create_expense_with_receipt(
    receipt: UploadFile = File(...),
    amount: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    # Extract data from receipt using OCR
    ocr_data = await extract_receipt_data(receipt)
    
    if "error" in ocr_data:
        raise HTTPException(status_code=400, detail=f"OCR failed: {ocr_data['error']}")
    
    # Use OCR data or form data (form data takes priority)
    expense_data = {
        "amount": amount or ocr_data.get("amount", 0.0),
        "category": category or ocr_data.get("category", "general"),
        "description": description or ocr_data.get("description", "Receipt upload"),
        "date": datetime.now(timezone.utc),
        "currency": "USD"  # Default for now
    }
    
    expense = Expense(
        employee_id=current_user.id,
        **expense_data
    )
    await db.expenses.insert_one(expense.dict())
    
    return {"expense": expense, "ocr_data": ocr_data}

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        # Admin can see all company expenses
        expenses = await db.expenses.find({"employee_id": {"$regex": ".*"}}).to_list(1000)
    elif current_user.role == "manager":
        # Manager can see their team's expenses
        team_users = await db.users.find({"manager_id": current_user.id}).to_list(100)
        team_ids = [user["id"] for user in team_users] + [current_user.id]
        expenses = await db.expenses.find({"employee_id": {"$in": team_ids}}).to_list(1000)
    else:
        # Employee can only see their own expenses
        expenses = await db.expenses.find({"employee_id": current_user.id}).to_list(1000)
    
    return [Expense(**expense) for expense in expenses]

@api_router.get("/expenses/pending", response_model=List[Expense])
async def get_pending_expenses(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can view pending expenses")
    
    expenses = await db.expenses.find({"status": "pending"}).to_list(1000)
    return [Expense(**expense) for expense in expenses]

@api_router.post("/expenses/{expense_id}/approve")
async def approve_expense(
    expense_id: str,
    approval: ApprovalAction,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can approve expenses")
    
    expense = await db.expenses.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Update expense status
    approval_entry = {
        "approver_id": current_user.id,
        "approver_name": current_user.full_name,
        "action": approval.action,
        "comment": approval.comment,
        "timestamp": datetime.now(timezone.utc)
    }
    
    update_data = {
        "$set": {"status": "approved" if approval.action == "approve" else "rejected"},
        "$push": {"approval_history": approval_entry}
    }
    
    await db.expenses.update_one({"id": expense_id}, update_data)
    
    return {"message": f"Expense {approval.action}d successfully"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    if current_user.role == "employee":
        # Employee stats
        total_expenses = await db.expenses.count_documents({"employee_id": current_user.id})
        pending_expenses = await db.expenses.count_documents({"employee_id": current_user.id, "status": "pending"})
        approved_expenses = await db.expenses.count_documents({"employee_id": current_user.id, "status": "approved"})
        
        # Total amount spent
        pipeline = [
            {"$match": {"employee_id": current_user.id, "status": "approved"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await db.expenses.aggregate(pipeline).to_list(1)
        total_amount = result[0]["total"] if result else 0
        
        return {
            "total_expenses": total_expenses,
            "pending_expenses": pending_expenses,
            "approved_expenses": approved_expenses,
            "total_amount": total_amount
        }
    else:
        # Manager/Admin stats
        total_expenses = await db.expenses.count_documents({})
        pending_expenses = await db.expenses.count_documents({"status": "pending"})
        approved_expenses = await db.expenses.count_documents({"status": "approved"})
        total_users = await db.users.count_documents({"company_id": current_user.company_id})
        
        return {
            "total_expenses": total_expenses,
            "pending_expenses": pending_expenses,
            "approved_expenses": approved_expenses,
            "total_users": total_users
        }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()