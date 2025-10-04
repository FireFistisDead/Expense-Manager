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

# Admin User Management Models
class UserCreateByAdmin(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # "admin", "manager", "employee"
    manager_id: Optional[str] = None  # Required if role is "employee"

class UserUpdateByAdmin(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    manager_id: Optional[str] = None
    is_manager_approver: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    company_id: str
    manager_id: Optional[str] = None
    is_manager_approver: bool = False
    created_at: datetime

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

# Role-Based Permission System
def require_role(*allowed_roles: str):
    """
    Dependency factory for role-based access control.
    Usage: current_user: User = Depends(require_role("admin", "manager"))
    """
    async def check_role(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return check_role

def require_company_access(target_company_id: str = None):
    """
    Dependency factory for company isolation.
    Ensures user can only access data from their own company.
    """
    async def check_company_access(current_user: User = Depends(get_current_user)):
        if target_company_id and current_user.company_id != target_company_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You can only access data from your own company."
            )
        return current_user
    return check_company_access

def require_role_and_company(*allowed_roles: str):
    """
    Combined dependency for role + company access control.
    Usage: current_user: User = Depends(require_role_and_company("admin", "manager"))
    """
    async def check_role_and_company(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return check_role_and_company

# Helper Functions for Company Isolation
async def get_company_users(company_id: str) -> List[dict]:
    """Get all users from a specific company."""
    users = await db.users.find({"company_id": company_id}).to_list(1000)
    return users

async def get_company_expenses(company_id: str) -> List[dict]:
    """Get all expenses from users in a specific company."""
    # First get all users in the company
    company_users = await get_company_users(company_id)
    user_ids = [user["id"] for user in company_users]
    
    # Then get all expenses from those users
    expenses = await db.expenses.find({"employee_id": {"$in": user_ids}}).to_list(1000)
    return expenses

async def can_user_access_expense(user: User, expense_id: str) -> bool:
    """Check if a user can access a specific expense based on role and company."""
    expense = await db.expenses.find_one({"id": expense_id})
    if not expense:
        return False
    
    # Get the employee who created the expense
    expense_employee = await db.users.find_one({"id": expense["employee_id"]})
    if not expense_employee:
        return False
    
    # Check company isolation
    if user.company_id != expense_employee["company_id"]:
        return False
    
    # Role-based access
    if user.role == "admin":
        return True
    elif user.role == "manager":
        # Manager can access their own expenses or their team's expenses
        if expense["employee_id"] == user.id:
            return True
        # Check if the expense employee reports to this manager
        return expense_employee.get("manager_id") == user.id
    elif user.role == "employee":
        # Employee can only access their own expenses
        return expense["employee_id"] == user.id
    
    return False

# Enhanced Company Isolation Functions
async def get_company_safe_expense(expense_id: str, user: User) -> Optional[dict]:
    """
    Get expense only if user has access and it belongs to their company.
    Returns None if no access or cross-company.
    """
    expense = await db.expenses.find_one({"id": expense_id})
    if not expense:
        return None
    
    # Verify company access through expense owner
    expense_employee = await db.users.find_one({
        "id": expense["employee_id"],
        "company_id": user.company_id  # Company filter added here
    })
    
    if not expense_employee:
        return None  # Expense owner not in same company
    
    # Role-based access check
    if user.role == "admin":
        return expense
    elif user.role == "manager":
        if expense["employee_id"] == user.id or expense_employee.get("manager_id") == user.id:
            return expense
    elif user.role == "employee" and expense["employee_id"] == user.id:
        return expense
    
    return None

async def get_company_safe_user(user_id: str, current_user: User) -> Optional[dict]:
    """
    Get user only if they belong to the same company as current user.
    """
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_user.company_id  # Company filter enforced
    })
    return user

async def get_accessible_user_ids(current_user: User) -> List[str]:
    """
    Get list of user IDs that current user can access based on role + company.
    """
    if current_user.role == "admin":
        # Admin sees all users in their company
        users = await db.users.find({"company_id": current_user.company_id}).to_list(1000)
        return [user["id"] for user in users]
    elif current_user.role == "manager":
        # Manager sees their team + themselves
        team_users = await db.users.find({
            "company_id": current_user.company_id,
            "manager_id": current_user.id
        }).to_list(1000)
        return [user["id"] for user in team_users] + [current_user.id]
    else:
        # Employee sees only themselves
        return [current_user.id]

async def validate_cross_company_access(target_company_id: str, current_user: User) -> bool:
    """
    Validate that user is not trying to access data from another company.
    Returns True if access is allowed, False if cross-company violation.
    """
    return current_user.company_id == target_company_id

# Admin User Management Helper Functions
async def validate_user_role(role: str) -> bool:
    """Validate that the role is one of the allowed values."""
    return role in ["admin", "manager", "employee"]

async def validate_manager_assignment(manager_id: str, current_user: User) -> bool:
    """
    Validate that the manager exists and belongs to the same company.
    """
    if not manager_id:
        return True  # No manager assignment is valid
    
    manager = await db.users.find_one({
        "id": manager_id,
        "company_id": current_user.company_id,
        "role": {"$in": ["admin", "manager"]}  # Only admins and managers can be managers
    })
    return manager is not None

async def validate_role_elevation(current_user: User, target_role: str) -> bool:
    """
    Validate role elevation rules:
    - Only admins can create other admins
    - Admins can create managers and employees
    - Managers cannot create users (admin-only feature)
    """
    if current_user.role != "admin":
        return False  # Only admins can create users
    
    if target_role == "admin":
        return current_user.role == "admin"  # Only admins can create other admins
    
    return True  # Admins can create any role

async def get_user_with_company_check(user_id: str, current_user: User) -> Optional[dict]:
    """Get user only if they belong to the same company."""
    user = await db.users.find_one({
        "id": user_id,
        "company_id": current_user.company_id
    })
    return user

async def get_direct_reports(manager_user: User) -> List[str]:
    """
    Get list of user IDs that are direct reports of the given manager.
    Only returns users from the same company who have this manager assigned.
    """
    if manager_user.role not in ["admin", "manager"]:
        return []  # Only admins and managers can have direct reports
    
    # Find all users who have this manager assigned
    reports_cursor = db.users.find({
        "manager_id": manager_user.id,
        "company_id": manager_user.company_id,  # Company isolation
        "is_active": True  # Only active users
    }, {"id": 1})  # Only return user IDs
    
    reports = await reports_cursor.to_list(length=None)
    return [report["id"] for report in reports]

async def get_manager_accessible_users(manager_user: User) -> List[str]:
    """
    Get all user IDs that a manager can access (themselves + direct reports).
    Includes the manager's own ID plus all their direct reports.
    """
    accessible_ids = [manager_user.id]  # Manager can always access themselves
    
    if manager_user.role in ["admin", "manager"]:
        direct_reports = await get_direct_reports(manager_user)
        accessible_ids.extend(direct_reports)
    
    return accessible_ids

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
    """Register new user with company isolation checks."""
    
    # Check if user already exists (email must be unique globally)
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
    
    # Create user (always admin for new company registration)
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
    """Login user with company information included."""
    
    # Find user by email (no company filter needed for login)
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not bcrypt.verify(login_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user = User(**user_doc)
    
    # Verify user's company still exists (additional security)
    company = await db.companies.find_one({"id": user.company_id})
    if not company:
        raise HTTPException(
            status_code=401, 
            detail="User's company no longer exists. Contact administrator."
        )
    
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
    """Get expenses based on user role with bulletproof company isolation."""
    
    # Get user IDs that current user can access (already company-filtered)
    accessible_user_ids = await get_accessible_user_ids(current_user)
    
    # Get expenses only from accessible users
    expenses = await db.expenses.find({
        "employee_id": {"$in": accessible_user_ids}
    }).to_list(1000)
    
    return [Expense(**expense) for expense in expenses]

@api_router.get("/expenses/pending", response_model=List[Expense])
async def get_pending_expenses(current_user: User = Depends(require_role_and_company("admin", "manager"))):
    """Get pending expenses - only for managers and admins, with strict company isolation."""
    
    # Get user IDs that current user can access (company-filtered)
    accessible_user_ids = await get_accessible_user_ids(current_user)
    
    # Get pending expenses only from accessible users
    expenses = await db.expenses.find({
        "status": "pending",
        "employee_id": {"$in": accessible_user_ids}
    }).to_list(1000)
    
    return [Expense(**expense) for expense in expenses]

@api_router.post("/expenses/{expense_id}/approve")
async def approve_expense(
    expense_id: str,
    approval: ApprovalAction,
    current_user: User = Depends(require_role_and_company("admin", "manager"))
):
    """Approve/reject expense with bulletproof company and permission checks."""
    
    # Use company-safe expense retrieval
    expense = await get_company_safe_expense(expense_id, current_user)
    if not expense:
        raise HTTPException(
            status_code=404, 
            detail="Expense not found or access denied"
        )
    
    # Additional role-based check for approval rights
    if current_user.role == "manager":
        # Manager can only approve expenses from their direct reports
        accessible_user_ids = await get_manager_accessible_users(current_user)
        if expense["employee_id"] not in accessible_user_ids:
            raise HTTPException(
                status_code=403,
                detail="You can only approve expenses from your direct reports"
            )
    
    # Update expense status with company-safe query
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
    
    # Update with company verification (double-check)
    result = await db.expenses.update_one({"id": expense_id}, update_data)
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": f"Expense {approval.action}d successfully"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics with bulletproof company isolation."""
    
    # Get user IDs that current user can access (already company-filtered)
    accessible_user_ids = await get_accessible_user_ids(current_user)
    
    if current_user.role == "employee":
        # Employee stats - only their own data
        total_expenses = await db.expenses.count_documents({"employee_id": current_user.id})
        pending_expenses = await db.expenses.count_documents({
            "employee_id": current_user.id, 
            "status": "pending"
        })
        approved_expenses = await db.expenses.count_documents({
            "employee_id": current_user.id, 
            "status": "approved"
        })
        
        # Total amount spent (approved expenses only)
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
        # Manager/Admin stats - using accessible user IDs (company-safe)
        total_expenses = await db.expenses.count_documents({
            "employee_id": {"$in": accessible_user_ids}
        })
        pending_expenses = await db.expenses.count_documents({
            "employee_id": {"$in": accessible_user_ids}, 
            "status": "pending"
        })
        approved_expenses = await db.expenses.count_documents({
            "employee_id": {"$in": accessible_user_ids}, 
            "status": "approved"
        })
        
        # Total users count (team-wide for manager, company-wide for admin)
        total_users = len(accessible_user_ids)
        
        return {
            "total_expenses": total_expenses,
            "pending_expenses": pending_expenses,
            "approved_expenses": approved_expenses,
            "total_users": total_users
        }

# Admin User Management Routes
@api_router.post("/admin/users", response_model=UserResponse, dependencies=[Depends(require_role("admin"))])
async def create_user_by_admin(
    user_data: UserCreateByAdmin,
    current_user: User = Depends(require_role("admin"))
):
    """Create a new user within the admin's company."""
    
    # Validate role
    if not await validate_user_role(user_data.role):
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Validate role elevation permissions
    if not await validate_role_elevation(current_user, user_data.role):
        raise HTTPException(status_code=403, detail="Insufficient permissions to create user with this role")
    
    # Validate manager assignment if provided
    if user_data.manager_id:
        if not await validate_manager_assignment(user_data.manager_id, current_user):
            raise HTTPException(status_code=400, detail="Invalid manager assignment")
    
    # Check if user with email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = bcrypt.hash(user_data.password)
    
    new_user = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "role": user_data.role,
        "company_id": current_user.company_id,  # Auto-assign to admin's company
        "manager_id": user_data.manager_id,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(new_user)
    
    # Return user data without password
    return UserResponse(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        role=user_data.role,
        company_id=current_user.company_id,
        manager_id=user_data.manager_id,
        is_active=True
    )

@api_router.get("/admin/users", dependencies=[Depends(require_role("admin"))])
async def get_company_users_by_admin(current_user: User = Depends(require_role("admin"))):
    """Get all users in the admin's company."""
    
    users_cursor = db.users.find({
        "company_id": current_user.company_id
    }, {
        "hashed_password": 0  # Exclude password from response
    })
    
    users = await users_cursor.to_list(length=None)
    
    # Convert to response format
    user_responses = []
    for user in users:
        user_responses.append(UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            company_id=user["company_id"],
            manager_id=user.get("manager_id"),
            is_active=user.get("is_active", True)
        ))
    
    return {"users": user_responses}

@api_router.patch("/admin/users/{user_id}", response_model=UserResponse, dependencies=[Depends(require_role("admin"))])
async def update_user_by_admin(
    user_id: str,
    user_updates: UserUpdateByAdmin,
    current_user: User = Depends(require_role("admin"))
):
    """Update a user within the admin's company."""
    
    # Get the target user with company validation
    target_user = await get_user_with_company_check(user_id, current_user)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found or access denied")
    
    # Prepare update data
    update_data = {}
    
    if user_updates.name is not None:
        update_data["name"] = user_updates.name
    
    if user_updates.role is not None:
        # Validate role
        if not await validate_user_role(user_updates.role):
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Validate role elevation permissions
        if not await validate_role_elevation(current_user, user_updates.role):
            raise HTTPException(status_code=403, detail="Insufficient permissions to assign this role")
        
        update_data["role"] = user_updates.role
    
    if user_updates.manager_id is not None:
        # Validate manager assignment
        if user_updates.manager_id and not await validate_manager_assignment(user_updates.manager_id, current_user):
            raise HTTPException(status_code=400, detail="Invalid manager assignment")
        
        update_data["manager_id"] = user_updates.manager_id
    
    if user_updates.is_active is not None:
        update_data["is_active"] = user_updates.is_active
    
    if user_updates.password is not None:
        update_data["hashed_password"] = bcrypt.hash(user_updates.password)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    result = await db.users.update_one(
        {"id": user_id, "company_id": current_user.company_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found or access denied")
    
    # Get updated user
    updated_user = await db.users.find_one(
        {"id": user_id, "company_id": current_user.company_id},
        {"hashed_password": 0}
    )
    
    return UserResponse(
        id=updated_user["id"],
        name=updated_user["name"],
        email=updated_user["email"],
        role=updated_user["role"],
        company_id=updated_user["company_id"],
        manager_id=updated_user.get("manager_id"),
        is_active=updated_user.get("is_active", True)
    )

# Manager Team Management Routes
@api_router.get("/manager/team", dependencies=[Depends(require_role("manager"))])
async def get_manager_team(current_user: User = Depends(require_role("manager"))):
    """Get all direct reports of the current manager."""
    
    # Get direct reports with company isolation
    direct_report_ids = await get_direct_reports(current_user)
    
    if not direct_report_ids:
        return {"team_members": []}
    
    # Get detailed user information for direct reports
    team_cursor = db.users.find({
        "id": {"$in": direct_report_ids},
        "company_id": current_user.company_id  # Extra safety check
    }, {
        "hashed_password": 0  # Exclude password from response
    })
    
    team_members = await team_cursor.to_list(length=None)
    
    # Convert to response format
    team_responses = []
    for member in team_members:
        team_responses.append(UserResponse(
            id=member["id"],
            name=member["name"],
            email=member["email"],
            role=member["role"],
            company_id=member["company_id"],
            manager_id=member.get("manager_id"),
            is_active=member.get("is_active", True)
        ))
    
    return {
        "team_members": team_responses,
        "manager": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email
        },
        "team_size": len(team_responses)
    }

@api_router.get("/manager/team/expenses", dependencies=[Depends(require_role("manager"))])
async def get_team_expenses(current_user: User = Depends(require_role("manager"))):
    """Get all expenses from the manager's direct reports."""
    
    # Get accessible user IDs (manager + direct reports)
    accessible_user_ids = await get_manager_accessible_users(current_user)
    
    if not accessible_user_ids:
        return {"expenses": []}
    
    # Get expenses from team members with company isolation
    expenses_cursor = db.expenses.find({
        "employee_id": {"$in": accessible_user_ids},
        "company_id": current_user.company_id  # Company isolation
    })
    
    expenses = await expenses_cursor.to_list(length=None)
    
    return {"expenses": expenses, "count": len(expenses)}

@api_router.get("/manager/team/pending", dependencies=[Depends(require_role("manager"))])
async def get_team_pending_expenses(current_user: User = Depends(require_role("manager"))):
    """Get pending expenses from manager's direct reports only."""
    
    # Get direct reports only (exclude manager's own expenses)
    direct_report_ids = await get_direct_reports(current_user)
    
    if not direct_report_ids:
        return {"pending_expenses": []}
    
    # Get pending expenses from direct reports with company isolation
    expenses_cursor = db.expenses.find({
        "employee_id": {"$in": direct_report_ids},
        "company_id": current_user.company_id,  # Company isolation
        "status": "pending"
    })
    
    pending_expenses = await expenses_cursor.to_list(length=None)
    
    return {
        "pending_expenses": pending_expenses,
        "count": len(pending_expenses)
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