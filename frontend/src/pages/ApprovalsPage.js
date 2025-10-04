import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Receipt, 
  Calendar,
  DollarSign,
  MessageSquare,
  User,
  Building2
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';

const ApprovalsPage = () => {
  const { user, API } = useContext(AuthContext);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingExpenses();
  }, []);

  const fetchPendingExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses/pending`);
      setPendingExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch pending expenses:', error);
      toast.error('Failed to load pending expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (expenseId, action) => {
    setProcessing(true);
    
    try {
      await axios.post(`${API}/expenses/${expenseId}/approve`, {
        action,
        comment: comment.trim() || undefined
      });

      toast.success(`Expense ${action}d successfully!`);
      
      // Remove from pending list
      setPendingExpenses(prev => prev.filter(exp => exp.id !== expenseId));
      setSelectedExpense(null);
      setComment('');
      
    } catch (error) {
      console.error(`Failed to ${action} expense:`, error);
      toast.error(`Failed to ${action} expense. Please try again.`);
    } finally {
      setProcessing(false);
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      meals: 'bg-orange-100 text-orange-700 border-orange-200',
      travel: 'bg-blue-100 text-blue-700 border-blue-200',
      office: 'bg-purple-100 text-purple-700 border-purple-200',
      general: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[category] || colors.general;
  };

  const ApprovalDialog = ({ expense, onApprove, onReject }) => (
    <DialogContent className="max-w-2xl" data-testid="approval-dialog">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          <Receipt className="h-5 w-5 text-indigo-600" />
          <span>Review Expense</span>
        </DialogTitle>
        <DialogDescription>
          Review the expense details and provide your decision
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Expense Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-sm text-gray-600">Amount</Label>
            <p className="font-semibold text-lg">{formatCurrency(expense.amount)}</p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Date</Label>
            <p className="font-medium">{formatDate(expense.date)}</p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Category</Label>
            <Badge className={getCategoryColor(expense.category)}>
              {expense.category}
            </Badge>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Currency</Label>
            <p className="font-medium">{expense.currency}</p>
          </div>
        </div>

        <div>
          <Label className="text-sm text-gray-600">Description</Label>
          <p className="mt-1 p-3 bg-gray-50 rounded-md">{expense.description}</p>
        </div>

        {/* Comment Section */}
        <div>
          <Label htmlFor="approval-comment" className="text-sm font-medium">
            Comments (Optional)
          </Label>
          <Textarea
            id="approval-comment"
            placeholder="Add comments about your decision..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2 min-h-[80px]"
            data-testid="approval-comment-input"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={() => onReject(expense.id)}
            disabled={processing}
            variant="outline"
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
            data-testid="reject-expense-button"
          >
            <XCircle className="h-4 w-4 mr-2" />
            {processing ? 'Processing...' : 'Reject'}
          </Button>
          
          <Button
            onClick={() => onApprove(expense.id)}
            disabled={processing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            data-testid="approve-expense-button"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {processing ? 'Processing...' : 'Approve'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  if (loading) {
    return (
      <div className="space-y-6" data-testid="approvals-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="approvals-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600 mt-2">
            Review and approve team expense submissions
          </p>
        </div>
        
        <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full">
          <Clock className="h-4 w-4" />
          <span className="font-medium" data-testid="pending-count-badge">
            {pendingExpenses.length} Pending
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-effect border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Awaiting Review</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="awaiting-review-count">
                  {pendingExpenses.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="total-pending-amount">
                  {formatCurrency(pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Your Role</p>
                <p className="text-lg font-bold text-gray-900 capitalize">
                  {user?.role}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      <Card className="glass-effect border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Expenses Awaiting Approval</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingExpenses.length === 0 ? (
            <div className="text-center py-12" data-testid="no-pending-expenses">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                All caught up! 🎉
              </h3>
              <p className="text-gray-600">
                There are no expenses pending your approval at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="pending-expenses-list">
              {pendingExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-6 rounded-lg border border-gray-200 bg-white/50 hover:bg-white/70 hover:shadow-md transition-all duration-200"
                  data-testid={`pending-expense-${expense.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Category Icon */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(expense.category)}`}>
                        <Receipt className="w-6 h-6" />
                      </div>
                      
                      {/* Expense Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              {expense.description}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(expense.date)}
                              </div>
                              <div className="flex items-center">
                                <Building2 className="w-4 h-4 mr-1" />
                                Employee ID: {expense.employee_id.slice(-8)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCurrency(expense.amount)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {expense.currency}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getCategoryColor(expense.category)}>
                              {expense.category}
                            </Badge>
                            
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Review
                            </Badge>
                          </div>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => setSelectedExpense(expense)}
                                className="btn-hover bg-indigo-600 hover:bg-indigo-700 text-white"
                                data-testid={`review-expense-${expense.id}`}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </DialogTrigger>
                            
                            {selectedExpense?.id === expense.id && (
                              <ApprovalDialog
                                expense={selectedExpense}
                                onApprove={(id) => handleApprovalAction(id, 'approve')}
                                onReject={(id) => handleApprovalAction(id, 'reject')}
                              />
                            )}
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalsPage;