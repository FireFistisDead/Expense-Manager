# 💰 Expense Management System

A comprehensive full-stack expense management application built with React (frontend) and FastAPI (Python backend). This system allows organizations to manage employee expenses, approvals, and expense tracking with OCR receipt processing capabilities.

## 🚀 Features

### 🔐 Authentication & Authorization
- **User Registration & Login** with JWT authentication
- **Role-based access control** (Admin, Manager, Employee)
- **Multi-company support** with company-specific data isolation
- **User profile management** with department and manager assignments

### 💳 Expense Management
- **Create expenses** with detailed information (amount, category, description, date)
- **Receipt upload** with OCR text extraction for automatic data population
- **Multi-currency support** with real-time exchange rate conversion
- **Expense categories** for better organization and reporting
- **Policy validation** with automatic rule enforcement
- **Auto-approval** for expenses under predefined limits

### 📋 Expense Reports
- **Group expenses** into comprehensive reports
- **Submit reports** for batch approval
- **Track report status** (Draft, Submitted, Approved, Rejected)
- **Report history** and detailed expense breakdowns

### ✅ Approval Workflow
- **Manager approval system** for employee expenses
- **Approval history tracking** with comments and timestamps
- **Status tracking** (Pending, Approved, Rejected, Reimbursed)
- **Policy violation alerts** and manual review requirements
- **Bulk approval** capabilities for managers

### 🔔 Notifications & Alerts
- **Real-time notifications** for expense submissions and approvals
- **Email notifications** (configurable)
- **Policy violation alerts**
- **Approval reminders** and deadline notifications
- **Mark as read** functionality

### 📊 Advanced Analytics & Reporting
- **Expense analytics** with filtering by date, category, and department
- **Monthly spending trends** with visual indicators
- **Top categories** analysis and insights
- **Budget tracking** and variance reporting
- **Export capabilities** for financial reporting

### 🛡️ Policy Management (Admin)
- **Expense policies** with category-specific rules
- **Spending limits** and approval thresholds
- **Receipt requirements** by category
- **Auto-approval limits** for streamlined processing
- **Policy violation tracking**

### 👥 User Management
- **User profiles** with department and role management
- **Manager assignments** and team structure
- **User activation/deactivation**
- **Role-based permissions**
- **Employee directory** with contact information

### 💰 Budget Management
- **Department budgets** with monthly/yearly limits
- **Budget monitoring** and alert systems
- **Spending analysis** by department and category
- **Budget variance** reporting

### 🎨 Modern UI/UX
- **Responsive design** built with React and Tailwind CSS
- **Component library** using Radix UI components
- **Intuitive navigation** with role-based menus
- **Mobile-friendly interface**
- **Professional dashboard** with key metrics

## 🏗️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Hook Form** - Form handling and validation
- **Lucide React** - Beautiful icons

### Backend
- **FastAPI** - Modern Python web framework
- **Python 3.8+** - Backend programming language
- **MongoDB** - NoSQL database with Motor (async driver)
- **JWT Authentication** - Secure token-based authentication
- **Pydantic** - Data validation and serialization
- **BCrypt** - Password hashing
- **OCR Integration** - Receipt text extraction
- **Currency API** - Real-time exchange rates

### Development Tools
- **CRACO** - Create React App Configuration Override
- **ESLint & Prettier** - Code linting and formatting
- **Uvicorn** - ASGI web server for FastAPI
- **Git** - Version control

## 📁 Project Structure

```
expense-manager/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── ui/         # UI component library (Radix UI)
│   │   │   └── Layout.js   # Main layout component
│   │   ├── pages/          # Page components
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── ExpensesPage.js
│   │   │   ├── CreateExpensePage.js
│   │   │   └── ApprovalsPage.js
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── App.js          # Main application component
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
│
├── backend/                 # FastAPI backend application
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
│
├── tests/                  # Test files
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **Git**

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/FireFistisDead/Expense-Manager.git
cd Expense-Manager
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install fastapi uvicorn motor python-dotenv passlib bcrypt pyjwt python-multipart aiofiles requests email-validator

# Create environment file
copy ..\env.txt .env
# Or create .env file with the following content:
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="expense_management"
# CORS_ORIGINS="*"
# JWT_SECRET_KEY="your-super-secret-jwt-key-change-in-production"
# EMERGENT_LLM_KEY="your-ocr-api-key"
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Clear npm cache (if needed)
npm cache clean --force

# Install dependencies
npm install --legacy-peer-deps

# Note: Use --legacy-peer-deps to resolve React 18+ compatibility issues
```

#### 4. Database Setup

Ensure MongoDB is running on your system:

```bash
# If using local MongoDB
mongod

# The application will automatically create the required collections
```

### 🏃‍♂️ Running the Application

#### Start Backend Server
```bash
# From backend directory
cd backend
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```
The API will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

#### Start Frontend Application
```bash
# From frontend directory (in a new terminal)
cd frontend
npm start
```
The application will be available at: `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=expense_management

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
CORS_ORIGINS=*

# OCR Service (optional)
EMERGENT_LLM_KEY=your-ocr-api-key
```

### MongoDB Collections

The application uses the following collections:
- `users` - User accounts and profiles
- `companies` - Company information
- `expenses` - Expense records

## 🎯 Usage

### 1. Registration & Login
- Visit `http://localhost:3000`
- Register a new account (first user becomes company admin)
- Login with your credentials

### 2. Creating Expenses
- Navigate to "Create Expense" page
- Fill in expense details or upload a receipt for OCR processing
- Submit for approval

### 3. Managing Approvals (Managers/Admins)
- Visit "Approvals" page
- Review pending expenses
- Approve or reject with comments

### 4. Dashboard Analytics
- View personal expense summary
- Track approval status
- Monitor spending patterns

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Expenses
- `GET /api/expenses` - List user expenses
- `POST /api/expenses` - Create new expense (with policy validation)
- `POST /api/expenses/with-receipt` - Create expense with receipt upload
- `GET /api/expenses/pending` - Get pending expenses (managers only)
- `POST /api/expenses/{id}/approve` - Approve/reject expense

### Expense Reports
- `GET /api/reports` - List expense reports
- `POST /api/reports` - Create new expense report
- `PUT /api/reports/{id}/submit` - Submit report for approval

### Expense Policies (Admin)
- `GET /api/policies` - List expense policies
- `POST /api/policies` - Create expense policy
- `PUT /api/policies/{id}` - Update expense policy
- `DELETE /api/policies/{id}` - Delete expense policy

### User Management
- `GET /api/users` - List users (admin/manager)
- `PUT /api/users/{id}` - Update user profile
- `DELETE /api/users/{id}` - Deactivate user (admin)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/{id}/read` - Mark notification as read

### Budget Management
- `GET /api/budgets` - List budget limits (admin/manager)
- `POST /api/budgets` - Create budget limit (admin)
- `GET /api/budgets/spending/{department}` - Get department spending

### Analytics & Reporting
- `GET /api/analytics/expenses` - Get expense analytics with filters
- `GET /api/dashboard/stats` - Get dashboard statistics

### Categories
- `GET /api/categories` - Get expense categories

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Radix UI** for the beautiful component library
- **Tailwind CSS** for the styling framework
- **FastAPI** for the excellent Python web framework
- **MongoDB** for the flexible database solution

## 🐛 Troubleshooting

### Common Issues

1. **npm install fails**: Use `npm install --legacy-peer-deps`
2. **Backend won't start**: Check MongoDB connection and virtual environment
3. **CORS errors**: Verify CORS_ORIGINS in .env file
4. **OCR not working**: Check EMERGENT_LLM_KEY in environment variables

For more help, please open an issue on GitHub.

---

**Made with ❤️ by [FireFistisDead](https://github.com/FireFistisDead)**