#!/usr/bin/env python3
"""
Script to add sample expense data for testing analytics
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import random
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Sample categories
categories = ['meals', 'travel', 'office', 'software', 'training', 'marketing', 'utilities', 'equipment']

# Sample descriptions
descriptions = {
    'meals': ['Team lunch', 'Client dinner', 'Conference breakfast', 'Business meeting meal'],
    'travel': ['Flight to conference', 'Taxi to airport', 'Hotel accommodation', 'Car rental'],
    'office': ['Printer paper', 'Pens and markers', 'Desk organizer', 'Whiteboard'],
    'software': ['Adobe subscription', 'Slack premium', 'GitHub Pro', 'Zoom license'],
    'training': ['Online course', 'Workshop fee', 'Certification exam', 'Training materials'],
    'marketing': ['Google Ads', 'Facebook promotion', 'Print advertising', 'Trade show booth'],
    'utilities': ['Internet bill', 'Phone service', 'Electricity', 'Water bill'],
    'equipment': ['New laptop', 'Monitor stand', 'Wireless mouse', 'Keyboard']
}

async def add_sample_expenses():
    # Get a user to assign expenses to
    user = await db.users.find_one({"role": "employee"})
    if not user:
        print("No employee user found. Please create a user first.")
        return
    
    print(f"Adding sample expenses for user: {user['email']}")
    
    # Generate expenses for the last 3 months
    expenses = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    for i in range(50):  # Create 50 sample expenses
        # Random date in the last 3 months
        random_days = random.randint(0, 90)
        expense_date = end_date - timedelta(days=random_days)
        
        # Random category
        category = random.choice(categories)
        
        # Random amount between $10 and $500
        amount = round(random.uniform(10, 500), 2)
        
        # Random description from category
        description = random.choice(descriptions[category])
        
        # Random status (mostly approved for analytics)
        status = random.choices(['approved', 'pending', 'rejected'], weights=[0.7, 0.2, 0.1])[0]
        
        expense = {
            "id": f"exp_{i+1:03d}",
            "employee_id": user["id"],
            "employee_name": user["full_name"],
            "category": category,
            "amount": amount,
            "description": description,
            "date": expense_date,
            "status": status,
            "created_at": expense_date,
            "updated_at": expense_date,
        }
        
        # Add receipt for some expenses
        if random.random() > 0.3:  # 70% have receipts
            expense["receipt_url"] = f"/receipts/{expense['id']}_receipt.pdf"
        
        expenses.append(expense)
    
    # Insert all expenses
    if expenses:
        await db.expenses.insert_many(expenses)
        print(f"Successfully added {len(expenses)} sample expenses")
    
    # Print summary
    total_amount = sum(exp['amount'] for exp in expenses if exp['status'] == 'approved')
    approved_count = sum(1 for exp in expenses if exp['status'] == 'approved')
    print(f"Total approved amount: ${total_amount:.2f}")
    print(f"Approved expenses: {approved_count}")

async def main():
    try:
        await add_sample_expenses()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())