import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, FileText, Send, Eye, Calendar, DollarSign } from 'lucide-react';
import axios from 'axios';

const ExpenseReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expense_ids: []
  });

  useEffect(() => {
    fetchReports();
    fetchExpenses();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter approved expenses that are not already in a submitted report
      const availableExpenses = response.data.filter(expense => 
        expense.status === 'approved' && 
        !reports.some(report => 
          report.status !== 'draft' && report.expense_ids.includes(expense.id)
        )
      );
      setExpenses(availableExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/reports', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        expense_ids: []
      });
      fetchReports();
      fetchExpenses();
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const handleSubmitReport = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/reports/${reportId}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const handleExpenseSelection = (expenseId, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        expense_ids: [...formData.expense_ids, expenseId]
      });
    } else {
      setFormData({
        ...formData,
        expense_ids: formData.expense_ids.filter(id => id !== expenseId)
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSelectedExpensesTotal = () => {
    return expenses
      .filter(expense => formData.expense_ids.includes(expense.id))
      .reduce((total, expense) => total + expense.amount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expense Reports</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Report
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Expense Report</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Business Trip to New York - March 2024"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the expenses included in this report"
                  rows={3}
                />
              </div>

              <div>
                <Label>Select Expenses</Label>
                <div className="mt-2 max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                  {expenses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No approved expenses available for reporting</p>
                  ) : (
                    expenses.map((expense) => (
                      <div key={expense.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={expense.id}
                          checked={formData.expense_ids.includes(expense.id)}
                          onCheckedChange={(checked) => handleExpenseSelection(expense.id, checked)}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{expense.description}</p>
                              <p className="text-xs text-gray-500">
                                {expense.category} • {formatDate(expense.date)}
                              </p>
                            </div>
                            <span className="font-semibold text-sm">${expense.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {formData.expense_ids.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p className="text-sm font-medium">
                      Total: ${getSelectedExpensesTotal().toFixed(2)} ({formData.expense_ids.length} expenses)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={formData.expense_ids.length === 0}>
                  Create Report
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setFormData({
                    title: '',
                    description: '',
                    expense_ids: []
                  });
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  {report.description && (
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  )}
                </div>
                <Badge className={getStatusColor(report.status)}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>${report.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{report.expense_ids.length} expenses</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(report.created_at)}</span>
                  </div>
                  {report.submission_date && (
                    <div className="flex items-center space-x-1">
                      <Send className="h-4 w-4" />
                      <span>Submitted {formatDate(report.submission_date)}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {report.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmitReport(report.id)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Submit
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No expense reports created yet</p>
            <p className="text-sm text-gray-500 mt-2">Create reports to group and submit related expenses together</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExpenseReportsPage;