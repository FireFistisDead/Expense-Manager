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
    department: Optional[str] = None
    job_title: Optional[str] = None
    employee_id: Optional[str] = None
    manager_id: Optional[str] = None
    is_manager_approver: bool = False
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    is_active: bool = True
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
    status: str = "pending"  # pending, approved, rejected, reimbursed
    receipt_url: Optional[str] = None
    merchant_name: Optional[str] = None
    payment_method: Optional[str] = None  # cash, card, online
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    billable: bool = False
    tax_amount: Optional[float] = 0.0
    notes: Optional[str] = None
    reimbursement_date: Optional[datetime] = None
    policy_violation: bool = False
    violation_reason: Optional[str] = None
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

class ExpensePolicy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    category: str
    max_amount: float
    requires_receipt: bool = True
    auto_approve_limit: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    title: str
    description: str
    expense_ids: List[str]
    total_amount: float
    status: str = "draft"  # draft, submitted, approved, rejected
    submission_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetLimit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    department: str
    category: str
    monthly_limit: float
    yearly_limit: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str  # expense_submitted, expense_approved, expense_rejected, policy_violation
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# Policy validation
async def validate_expense_against_policy(expense_data: dict, company_id: str):
    policies = await db.expense_policies.find({
        "company_id": company_id,
        "category": expense_data["category"]
    }).to_list(10)
    
    violations = []
    
    for policy in policies:
        if expense_data["amount"] > policy["max_amount"]:
            violations.append(f"Amount ${expense_data['amount']} exceeds policy limit of ${policy['max_amount']} for {policy['category']}")
        
        if policy["requires_receipt"] and not expense_data.get("receipt_url"):
            violations.append(f"Receipt required for {policy['category']} expenses")
    
    return violations

# Auto-approval check
async def check_auto_approval(expense_data: dict, company_id: str):
    policies = await db.expense_policies.find({
        "company_id": company_id,
        "category": expense_data["category"]
    }).to_list(10)
    
    for policy in policies:
        if policy.get("auto_approve_limit") and expense_data["amount"] <= policy["auto_approve_limit"]:
            return True
    
    return False

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
    # Truncate password to 72 bytes for bcrypt compatibility
    password_bytes = user_data.password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    hashed_password = bcrypt.hash(password_bytes.decode('utf-8'))
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
    if not user_doc:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Truncate password to 72 bytes for bcrypt compatibility
    password_bytes = login_data.password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    if not bcrypt.verify(password_bytes.decode('utf-8'), user_doc["password"]):
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
    expense_dict = expense_data.dict()
    
    # Validate against expense policies
    violations = await validate_expense_against_policy(expense_dict, current_user.company_id)
    
    # Check for auto-approval
    auto_approve = await check_auto_approval(expense_dict, current_user.company_id)
    
    expense = Expense(
        employee_id=current_user.id,
        policy_violation=bool(violations),
        violation_reason="; ".join(violations) if violations else None,
        status="approved" if auto_approve and not violations else "pending",
        **expense_dict
    )
    
    await db.expenses.insert_one(expense.dict())
    
    # Create notification for manager if not auto-approved
    if not auto_approve and current_user.manager_id:
        await create_notification(
            user_id=current_user.manager_id,
            title="New Expense Submitted",
            message=f"{current_user.full_name} has submitted a new expense for ${expense.amount}",
            type="expense_submitted"
        )
    
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
    
    # Send notification to employee
    await create_notification(
        user_id=expense["employee_id"],
        title=f"Expense {approval.action.title()}d",
        message=f"Your expense for ${expense['amount']} has been {approval.action}d" + 
                (f": {approval.comment}" if approval.comment else ""),
        type=f"expense_{approval.action}d"
    )
    
    return {"message": f"Expense {approval.action}d successfully"}

# Expense Policies
@api_router.post("/policies", response_model=ExpensePolicy)
async def create_expense_policy(policy_data: ExpensePolicy, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create expense policies")
    
    policy_data.company_id = current_user.company_id
    await db.expense_policies.insert_one(policy_data.dict())
    return policy_data

@api_router.get("/policies", response_model=List[ExpensePolicy])
async def get_expense_policies(current_user: User = Depends(get_current_user)):
    policies = await db.expense_policies.find({"company_id": current_user.company_id}).to_list(100)
    return [ExpensePolicy(**policy) for policy in policies]

@api_router.put("/policies/{policy_id}")
async def update_expense_policy(policy_id: str, policy_data: ExpensePolicy, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update expense policies")
    
    await db.expense_policies.update_one({"id": policy_id}, {"$set": policy_data.dict()})
    return {"message": "Policy updated successfully"}

@api_router.delete("/policies/{policy_id}")
async def delete_expense_policy(policy_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete expense policies")
    
    await db.expense_policies.delete_one({"id": policy_id})
    return {"message": "Policy deleted successfully"}

# Expense Reports
@api_router.post("/reports", response_model=ExpenseReport)
async def create_expense_report(report_data: ExpenseReport, current_user: User = Depends(get_current_user)):
    report_data.employee_id = current_user.id
    
    # Calculate total amount from expense IDs
    expenses = await db.expenses.find({"id": {"$in": report_data.expense_ids}}).to_list(1000)
    total_amount = sum(expense["amount"] for expense in expenses)
    report_data.total_amount = total_amount
    
    await db.expense_reports.insert_one(report_data.dict())
    return report_data

@api_router.get("/reports", response_model=List[ExpenseReport])
async def get_expense_reports(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        reports = await db.expense_reports.find({}).to_list(1000)
    elif current_user.role == "manager":
        # Get reports from team members
        team_users = await db.users.find({"manager_id": current_user.id}).to_list(100)
        team_ids = [user["id"] for user in team_users] + [current_user.id]
        reports = await db.expense_reports.find({"employee_id": {"$in": team_ids}}).to_list(1000)
    else:
        reports = await db.expense_reports.find({"employee_id": current_user.id}).to_list(1000)
    
    return [ExpenseReport(**report) for report in reports]

@api_router.put("/reports/{report_id}/submit")
async def submit_expense_report(report_id: str, current_user: User = Depends(get_current_user)):
    report = await db.expense_reports.find_one({"id": report_id, "employee_id": current_user.id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await db.expense_reports.update_one(
        {"id": report_id}, 
        {"$set": {"status": "submitted", "submission_date": datetime.now(timezone.utc)}}
    )
    
    # Notify manager
    if current_user.manager_id:
        await create_notification(
            user_id=current_user.manager_id,
            title="New Expense Report Submitted",
            message=f"{current_user.full_name} has submitted an expense report: {report['title']}",
            type="expense_submitted"
        )
    
    return {"message": "Report submitted successfully"}

# Budget Management
@api_router.post("/budgets", response_model=BudgetLimit)
async def create_budget_limit(budget_data: BudgetLimit, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create budget limits")
    
    budget_data.company_id = current_user.company_id
    await db.budget_limits.insert_one(budget_data.dict())
    return budget_data

@api_router.get("/budgets", response_model=List[BudgetLimit])
async def get_budget_limits(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can view budget limits")
    
    budgets = await db.budget_limits.find({"company_id": current_user.company_id}).to_list(100)
    return [BudgetLimit(**budget) for budget in budgets]

@api_router.get("/budgets/spending/{department}")
async def get_department_spending(department: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can view spending data")
    
    # Get current month spending
    current_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (current_month + timedelta(days=32)).replace(day=1)
    
    pipeline = [
        {
            "$lookup": {
                "from": "users",
                "localField": "employee_id",
                "foreignField": "id",
                "as": "employee"
            }
        },
        {
            "$match": {
                "employee.department": department,
                "status": "approved",
                "date": {"$gte": current_month, "$lt": next_month}
            }
        },
        {
            "$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        }
    ]
    
    result = await db.expenses.aggregate(pipeline).to_list(100)
    return result

# Notifications
async def create_notification(user_id: str, title: str, message: str, type: str):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type
    )
    await db.notifications.insert_one(notification.dict())

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).to_list(100)
    return [Notification(**notification) for notification in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

# Analytics and Reporting
@api_router.get("/analytics/expenses")
async def get_expense_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can view analytics")
    
    match_filter = {"status": "approved"}
    
    if start_date and end_date:
        match_filter["date"] = {
            "$gte": datetime.fromisoformat(start_date),
            "$lte": datetime.fromisoformat(end_date)
        }
    
    if category:
        match_filter["category"] = category
    
    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"},
                    "category": "$category"
                },
                "total_amount": {"$sum": "$amount"},
                "expense_count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    
    result = await db.expenses.aggregate(pipeline).to_list(1000)
    return result

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

# User Management
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can view users")
    
    if current_user.role == "admin":
        users = await db.users.find({"company_id": current_user.company_id}).to_list(1000)
    else:
        # Manager can only see their team
        users = await db.users.find({"manager_id": current_user.id}).to_list(1000)
    
    return [User(**{k: v for k, v in user.items() if k != "password"}) for user in users]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Only admins can update other users")
    
    # Remove password and sensitive fields from update
    allowed_fields = ["full_name", "department", "job_title", "phone", "address", "manager_id"]
    update_data = {k: v for k, v in user_data.items() if k in allowed_fields}
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    return {"message": "User updated successfully"}

@api_router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Only admins can deactivate users")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    return {"message": "User deactivated successfully"}

# Categories Management
@api_router.get("/categories")
async def get_expense_categories():
    # Default expense categories
    categories = [
        {"name": "meals", "label": "Meals & Entertainment", "requires_receipt": True},
        {"name": "travel", "label": "Travel & Transportation", "requires_receipt": True},
        {"name": "office", "label": "Office Supplies", "requires_receipt": True},
        {"name": "software", "label": "Software & Subscriptions", "requires_receipt": True},
        {"name": "training", "label": "Training & Education", "requires_receipt": True},
        {"name": "marketing", "label": "Marketing & Advertising", "requires_receipt": True},
        {"name": "utilities", "label": "Utilities", "requires_receipt": True},
        {"name": "equipment", "label": "Equipment & Hardware", "requires_receipt": True},
        {"name": "communications", "label": "Communications", "requires_receipt": False},
        {"name": "other", "label": "Other", "requires_receipt": False}
    ]
    return categories

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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