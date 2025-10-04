import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  Search, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Users,
  FileText,
  Eye,
  ArrowUpDown,
  Download,
  RefreshCw,
  ArrowLeft,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const ManagerTeamExpensesPage = () => {
  const { API, user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchTeamExpenses();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    filterAndSortExpenses();
  }, [expenses, searchTerm, statusFilter, employeeFilter, sortBy, sortOrder, dateRange]);

  const fetchTeamExpenses = async () => {
    try {
      const response = await axios.get(`${API}/manager/team/expenses`);
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch team expenses:', error);
      toast.error('Failed to load team expenses');
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${API}/manager/team`);
      setTeamMembers(response.data.team_members || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortExpenses = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }

    // Employee filter
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(expense => expense.employee_id === employeeFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          filterDate.setFullYear(1970);
      }
      
      filtered = filtered.filter(expense => 
        new Date(expense.created_at) >= filterDate
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'employee':
          aValue = a.employee_name || '';
          bValue = b.employee_name || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        default: // date
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredExpenses(filtered);
  };

  const getExpenseStats = () => {
    const stats = {
      total: expenses.length,
      pending: expenses.filter(e => e.status === 'pending').length,
      approved: expenses.filter(e => e.status === 'approved').length,
      rejected: expenses.filter(e => e.status === 'rejected').length,
      totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      pendingAmount: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0),
      approvedAmount: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0)
    };
    return stats;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportExpenses = () => {
    // Simple CSV export
    const headers = ['Date', 'Employee', 'Description', 'Category', 'Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(expense => [
        new Date(expense.created_at).toLocaleDateString(),
        expense.employee_name || 'Unknown',
        `"${expense.description || ''}"`,
        expense.category || '',
        expense.amount || 0,
        expense.status || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Expenses exported successfully');
  };

  const refreshData = () => {
    setLoading(true);
    Promise.all([fetchTeamExpenses(), fetchTeamMembers()]).finally(() => {
      setLoading(false);
      toast.success('Data refreshed');
    });
  };

  const stats = getExpenseStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link to="/manager/team">
              <Button variant="outline" size="sm" className="bg-white">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              Team Expenses
            </h1>
          </div>
          <p className="text-gray-600 ml-14">
            Monitor and analyze all expense reports from your team members
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline" className="bg-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportExpenses} className="bg-green-600 hover:bg-green-700 text-white">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-600 mt-1">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-orange-900">{stats.pending}</p>
                <p className="text-xs text-orange-600 mt-1">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
                <p className="text-xs text-green-600 mt-1">{formatCurrency(stats.approvedAmount)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
                <p className="text-xs text-red-600 mt-1">Need attention</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Employee Filter */}
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {teamMembers.filter(member => member.id && member.id !== '').map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                <SelectItem value="employee-asc">Employee (A-Z)</SelectItem>
                <SelectItem value="status-asc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              Showing {filteredExpenses.length} of {expenses.length} expenses
            </span>
            {(searchTerm || statusFilter !== 'all' || employeeFilter !== 'all' || dateRange !== 'all') && (
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setEmployeeFilter('all');
                  setDateRange('all');
                }}
                variant="outline" 
                size="sm"
                className="h-7 px-2 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-4">
        {filteredExpenses.map((expense) => (
          <Card 
            key={expense.id} 
            className="bg-white/80 backdrop-blur-sm border-gray-200 hover:shadow-lg transition-all duration-200"
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {expense.description || 'No description'}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${getStatusColor(expense.status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(expense.status)}
                          {expense.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {expense.employee_name || 'Unknown Employee'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(expense.created_at)}
                        </span>
                        {expense.category && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            {expense.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(expense.amount || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {(expense.receipt_url || expense.notes) && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {expense.notes && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{expense.notes}</p>
                        </div>
                      )}
                      {expense.receipt_url && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-gray-400" />
                          <a 
                            href={expense.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Receipt
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {expense.status === 'pending' && (
                    <Link to="/approvals">
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                        <Eye className="h-3 w-3 mr-1" />
                        Review
                      </Button>
                    </Link>
                  )}
                  <Button size="sm" variant="outline" className="bg-white">
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredExpenses.length === 0 && !loading && (
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {expenses.length === 0 ? 'No expenses found' : 'No expenses match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {expenses.length === 0 
                ? 'Your team hasn\'t submitted any expense reports yet.' 
                : 'Try adjusting your search criteria or filters.'}
            </p>
            {expenses.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                <FileText className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700">
                  Team members can submit expenses from the "Create Expense" page.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Analytics Footer */}
      {filteredExpenses.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700 mb-1">Average Expense</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(stats.totalAmount / stats.total || 0)}
                </p>
              </div>
              <div className="text-center">
                <PieChart className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700 mb-1">Approval Rate</p>
                <p className="text-xl font-bold text-blue-900">
                  {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700 mb-1">Active Submitters</p>
                <p className="text-xl font-bold text-blue-900">
                  {new Set(filteredExpenses.map(e => e.employee_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManagerTeamExpensesPage;