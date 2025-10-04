import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { DollarSign, Calendar, PieChart, BarChart3 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

const AnalyticsTestPage = () => {
  const [data, setData] = useState({
    analytics: [],
    expenses: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token);
      console.log('API URL:', API);

      // Test basic connectivity
      const categoriesResponse = await fetch(`${API}/categories`);
      console.log('Categories status:', categoriesResponse.status);
      const categories = await categoriesResponse.json();
      console.log('Categories:', categories);

      const expensesResponse = await fetch(`${API}/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Expenses status:', expensesResponse.status);
      const expenses = await expensesResponse.json();
      console.log('Expenses:', expenses);

      setData({
        categories: categories || [],
        expenses: expenses || [],
        analytics: []
      });
      
    } catch (error) {
      console.error('Fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Analytics Test</h1>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Analytics Test</h1>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  const totalExpenses = data.expenses.length;
  const totalAmount = data.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Total Amount</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Total Expenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.categories.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>API URL: {API}</div>
            <div>Categories Count: {data.categories.length}</div>
            <div>Expenses Count: {data.expenses.length}</div>
            <div>Sample Expense: {JSON.stringify(data.expenses[0] || {}, null, 2)}</div>
          </div>
        </CardContent>
      </Card>

      {data.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.expenses.slice(0, 5).map((expense, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <div className="font-medium">{expense.description || 'No description'}</div>
                    <div className="text-sm text-gray-500">
                      {expense.category || 'No category'} • {expense.employee_name || 'Unknown'}
                    </div>
                  </div>
                  <div className="font-semibold">${(expense.amount || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsTestPage;