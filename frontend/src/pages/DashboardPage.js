import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Users, 
  DollarSign,
  Plus,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const DashboardPage = () => {
  const { user, API } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, expensesResponse] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/expenses`)
      ]);
      
      setStats(statsResponse.data);
      setRecentExpenses(expensesResponse.data.slice(0, 5)); // Get last 5 expenses
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      meals: 'bg-orange-100 text-orange-700',
      travel: 'bg-blue-100 text-blue-700',
      office: 'bg-purple-100 text-purple-700',
      general: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.general;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="animate-pulse space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your expenses today.
          </p>
        </div>
        
        <Link to="/expenses/create">
          <Button className="btn-hover bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg" data-testid="create-expense-cta">
            <Plus className="w-4 h-4 mr-2" />
            New Expense
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-animate glass-effect border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="total-expenses-count">
              {stats?.total_expenses || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {user?.role === 'employee' ? 'Your submissions' : 'All submissions'}
            </p>
          </CardContent>
        </Card>

        <Card className="card-animate glass-effect border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="pending-expenses-count">
              {stats?.pending_expenses || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="card-animate glass-effect border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="approved-expenses-count">
              {stats?.approved_expenses || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card className="card-animate glass-effect border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {user?.role === 'employee' ? 'Total Amount' : 'Team Members'}
            </CardTitle>
            {user?.role === 'employee' ? (
              <DollarSign className="h-4 w-4 text-green-600" />
            ) : (
              <Users className="h-4 w-4 text-blue-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900" data-testid="fourth-stat-value">
              {user?.role === 'employee' 
                ? formatCurrency(stats?.total_amount || 0)
                : stats?.total_users || 0
              }
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {user?.role === 'employee' ? 'Approved expenses' : 'Active users'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Expenses */}
        <Card className="glass-effect border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Recent Expenses
              </CardTitle>
              <Link to="/expenses">
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                  View all
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <div className="text-center py-8" data-testid="no-expenses-message">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No expenses yet</p>
                <Link to="/expenses/create">
                  <Button variant="outline" className="mt-4">
                    Create your first expense
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4" data-testid="recent-expenses-list">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white/50 hover:bg-white/70 transition-all duration-200"
                    data-testid={`expense-item-${expense.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getCategoryColor(expense.category)}`}>
                          <Receipt className="w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-48">
                          {expense.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className={getCategoryColor(expense.category)}>
                            {expense.category}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(expense.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </p>
                      <Badge className={getStatusColor(expense.status)}>
                        {expense.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Status Overview */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="glass-effect border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/expenses/create" className="block">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 border-dashed border-2 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200"
                  data-testid="quick-create-expense"
                >
                  <Plus className="w-5 h-5 mr-3 text-indigo-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Create New Expense</div>
                    <div className="text-sm text-gray-600">Submit receipts with AI scanning</div>
                  </div>
                </Button>
              </Link>
              
              <Link to="/expenses" className="block">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all duration-200"
                  data-testid="quick-view-expenses"
                >
                  <Receipt className="w-5 h-5 mr-3 text-gray-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">View My Expenses</div>
                    <div className="text-sm text-gray-600">Track submission history</div>
                  </div>
                </Button>
              </Link>
              
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <Link to="/approvals" className="block">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all duration-200"
                    data-testid="quick-approvals"
                  >
                    <CheckCircle className="w-5 h-5 mr-3 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Pending Approvals</div>
                      <div className="text-sm text-gray-600">Review team expenses</div>
                    </div>
                    {stats?.pending_expenses > 0 && (
                      <Badge className="ml-auto bg-yellow-100 text-yellow-800">
                        {stats.pending_expenses}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Expense Status Overview */}
          <Card className="glass-effect border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats && stats.total_expenses > 0 ? (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Approved</span>
                      <span className="text-green-600 font-medium">
                        {Math.round((stats.approved_expenses / stats.total_expenses) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(stats.approved_expenses / stats.total_expenses) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Pending</span>
                      <span className="text-yellow-600 font-medium">
                        {Math.round((stats.pending_expenses / stats.total_expenses) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(stats.pending_expenses / stats.total_expenses) * 100} 
                      className="h-2"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-600" data-testid="no-stats-message">
                  <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p>No expenses to analyze yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;