import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, BarChart3, Users, Target } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    category: 'all'
  });
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchCategories();
    fetchExpenses();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchExpenses();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      
      console.log('Fetching analytics from:', `${API}/analytics/expenses?${params}`);
      const response = await axios.get(`${API}/analytics/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Analytics response:', response.data);
      setAnalytics(response.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      console.error('Error details:', error.response?.data || error.message);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories from:', `${API}/categories`);
      const response = await axios.get(`${API}/categories`);
      console.log('Categories response:', response.data);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.error('Error details:', error.response?.data || error.message);
      setCategories([]);
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      
      console.log('Fetching expenses from:', `${API}/expenses?${params}`);
      const response = await axios.get(`${API}/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Expenses response:', response.data);
      setExpenses(response.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      console.error('Error details:', error.response?.data || error.message);
      setExpenses([]);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      category: 'all'
    });
  };

  const getCategoryLabel = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.label : categoryName;
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return 'Invalid date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalSpending = () => {
    if (!analytics || analytics.length === 0) return 0;
    return analytics.reduce((total, item) => total + (item.total_amount || 0), 0);
  };

  const getTotalExpenses = () => {
    if (!analytics || analytics.length === 0) return 0;
    return analytics.reduce((total, item) => total + (item.expense_count || 0), 0);
  };

  const getExpensesToday = () => {
    if (!expenses || expenses.length === 0) return [];
    
    const today = new Date().toISOString().split('T')[0];
    return expenses.filter(expense => {
      if (!expense || !expense.date) return false;
      try {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === today;
      } catch (error) {
        console.error('Date parsing error:', error, expense.date);
        return false;
      }
    });
  };

  const renderCategoryChart = (categories) => {
    if (!categories || categories.length === 0) {
      return <div className="text-gray-500 text-center py-4">No category data available</div>;
    }
    
    const amounts = categories.map(cat => cat.total_amount || 0);
    const maxAmount = Math.max(...amounts, 1);
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    
    return categories.map((category, index) => {
      const percentage = maxAmount > 0 ? (category.total_amount / maxAmount) * 100 : 0;
      return (
        <div key={category.category || index} className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <span className="text-sm font-medium">
                {getCategoryLabel(category.category || 'Unknown')}
              </span>
              <Badge variant="secondary" className="text-xs">
                {category.expense_count || 0}
              </Badge>
            </div>
            <span className="text-sm font-semibold">
              ${(category.total_amount || 0).toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${colors[index % colors.length]} transition-all duration-300`}
              style={{ width: `${Math.max(percentage, 2)}%` }}
            />
          </div>
        </div>
      );
    });
  };

  const renderMonthlyChart = (trends) => {
    const maxAmount = Math.max(...trends.map(trend => trend.total_amount), 1);
    
    return (
      <div className="space-y-3">
        {trends.slice(-6).map((month, index, array) => {
          const percentage = (month.total_amount / maxAmount) * 100;
          const prevMonth = index > 0 ? array[index - 1] : null;
          const isIncrease = prevMonth && month.total_amount > prevMonth.total_amount;
          const isDecrease = prevMonth && month.total_amount < prevMonth.total_amount;
          
          return (
            <div key={`${month.year}-${month.month}`} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {getMonthName(month.month)} {month.year}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {month.expense_count}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">
                    ${month.total_amount.toFixed(2)}
                  </span>
                  {isIncrease && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {isDecrease && <TrendingDown className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getDailyExpenses = () => {
    if (!expenses || expenses.length === 0) return [];
    
    const dailyData = {};
    
    expenses.forEach(expense => {
      if (!expense || !expense.date) return;
      
      try {
        const date = new Date(expense.date).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            expenses: [],
            total_amount: 0,
            expense_count: 0
          };
        }
        dailyData[date].expenses.push(expense);
        dailyData[date].total_amount += expense.amount || 0;
        dailyData[date].expense_count += 1;
      } catch (error) {
        console.error('Date parsing error in getDailyExpenses:', error, expense.date);
      }
    });

    return Object.values(dailyData)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7); // Last 7 days
  };

  const renderDailyExpenseChart = (dailyExpenses) => {
    const maxAmount = Math.max(...dailyExpenses.map(day => day.total_amount), 1);
    
    return (
      <div className="space-y-4">
        {dailyExpenses.map((day) => {
          const percentage = (day.total_amount / maxAmount) * 100;
          const isToday = day.date === new Date().toISOString().split('T')[0];
          
          return (
            <div key={day.date} className={`p-3 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-700' : ''}`}>
                    {formatDate(day.date)}
                    {isToday && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Today</span>}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {day.expense_count} expenses
                  </Badge>
                </div>
                <span className={`text-sm font-bold ${isToday ? 'text-blue-700' : ''}`}>
                  ${day.total_amount.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${isToday ? 'bg-blue-500' : 'bg-gray-400'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="space-y-1">
                {day.expenses.slice(0, 3).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="truncate max-w-32">{expense.description}</span>
                      <Badge className={getStatusColor(expense.status)} variant="secondary" size="sm">
                        {expense.status}
                      </Badge>
                    </div>
                    <span className="font-medium">${expense.amount?.toFixed(2)}</span>
                  </div>
                ))}
                {day.expenses.length > 3 && (
                  <div className="text-xs text-gray-500 italic">
                    +{day.expenses.length - 3} more expenses
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getTopCategories = () => {
    if (!analytics || analytics.length === 0) return [];
    
    const categoryTotals = {};
    
    analytics.forEach(item => {
      if (!item || !item._id || !item._id.category) return;
      
      const category = item._id.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = {
          category,
          total_amount: 0,
          expense_count: 0
        };
      }
      categoryTotals[category].total_amount += item.total_amount || 0;
      categoryTotals[category].expense_count += item.expense_count || 0;
    });

    return Object.values(categoryTotals)
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5);
  };

  const getMonthlyTrends = () => {
    if (!analytics || analytics.length === 0) return [];
    
    const monthlyData = {};
    
    analytics.forEach(item => {
      if (!item || !item._id || !item._id.year || !item._id.month) return;
      
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = {
          year: item._id.year,
          month: item._id.month,
          total_amount: 0,
          expense_count: 0
        };
      }
      monthlyData[key].total_amount += item.total_amount || 0;
      monthlyData[key].expense_count += item.expense_count || 0;
    });

    return Object.values(monthlyData)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Expense Analytics</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-lg">Loading analytics data...</div>
            <div className="text-sm text-gray-500 mt-2">Please wait while we fetch your expense data</div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Analytics state:', { analytics, expenses, categories });

  const totalSpending = getTotalSpending();
  const totalExpenses = getTotalExpenses();
  const topCategories = getTopCategories();
  const monthlyTrends = getMonthlyTrends();
  const expensesToday = getExpensesToday();
  
  console.log('Rendering with data:', {
    totalSpending,
    totalExpenses,
    topCategories: topCategories.length,
    monthlyTrends: monthlyTrends.length,
    expensesToday: expensesToday.length,
    analyticsLength: analytics.length,
    expensesLength: expenses.length
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Expense Analytics</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {filters.start_date || filters.end_date ? 'Filtered period' : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses}</div>
            <p className="text-xs text-muted-foreground">
              {filters.category !== 'all' ? `${filters.category} category` : 'All categories'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Expense</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalExpenses > 0 ? (totalSpending / totalExpenses).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per expense average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expensesToday.length}</div>
            <p className="text-xs text-muted-foreground">
              ${expensesToday.reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)} total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top Categories Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Top Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topCategories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No data available</p>
              ) : (
                renderCategoryChart(topCategories)
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Monthly Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrends.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No data available</p>
            ) : (
              renderMonthlyChart(monthlyTrends)
            )}
          </CardContent>
        </Card>

        {/* Today's Expenses Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Today's Expenses</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {expensesToday.length} expenses
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {expensesToday.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No expenses today</p>
                  <p className="text-xs text-gray-400 mt-1">Expenses will appear here when added</p>
                </div>
              ) : (
                expensesToday.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{expense.description}</span>
                        <Badge className={getStatusColor(expense.status)} variant="secondary">
                          {expense.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {getCategoryLabel(expense.category)} • {expense.employee_name}
                        {expense.receipt_url && (
                          <span className="ml-2 text-blue-600">• Has receipt</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${expense.amount?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {expensesToday.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Total for today:</span>
                    <span className="text-lg">
                      ${expensesToday.reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Expense Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Daily Expense Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              {getDailyExpenses().length === 0 ? (
                <p className="text-gray-500 text-center py-4">No daily expense data</p>
              ) : (
                renderDailyExpenseChart(getDailyExpenses())
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Recent Expenses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {expenses.slice(0, 15).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No expenses found</p>
              ) : (
                expenses.slice(0, 15).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{expense.description}</span>
                        <Badge className={getStatusColor(expense.status)} variant="secondary" size="sm">
                          {expense.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        {getCategoryLabel(expense.category)} • {expense.employee_name} • {formatDate(expense.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${expense.amount?.toFixed(2)}</div>
                      {expense.receipt_url && (
                        <div className="text-xs text-blue-600">📎</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.length === 0 && expenses.length === 0 && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No expense data available for the selected filters</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or date range</p>
          </CardContent>
        </Card>
      )}
      {/* Dashboard Stats Integration */}
      {dashboardStats && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Dashboard Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardStats.total_expenses}</div>
                <div className="text-sm text-gray-500">Total Expenses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardStats.pending_expenses}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardStats.approved_expenses}</div>
                <div className="text-sm text-gray-500">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">${dashboardStats.total_amount?.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsPage;