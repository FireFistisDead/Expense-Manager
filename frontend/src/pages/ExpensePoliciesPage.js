import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, DollarSign, FileText } from 'lucide-react';
import axios from 'axios';

const ExpensePoliciesPage = () => {
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    category: '',
    max_amount: '',
    requires_receipt: true,
    auto_approve_limit: ''
  });

  useEffect(() => {
    fetchPolicies();
    fetchCategories();
  }, []);

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/policies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPolicies(response.data);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const policyData = {
        ...formData,
        max_amount: parseFloat(formData.max_amount),
        auto_approve_limit: formData.auto_approve_limit ? parseFloat(formData.auto_approve_limit) : null
      };

      if (editingPolicy) {
        await axios.put(`/api/policies/${editingPolicy.id}`, policyData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/policies', policyData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowForm(false);
      setEditingPolicy(null);
      setFormData({
        category: '',
        max_amount: '',
        requires_receipt: true,
        auto_approve_limit: ''
      });
      fetchPolicies();
    } catch (error) {
      console.error('Error saving policy:', error);
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      category: policy.category,
      max_amount: policy.max_amount.toString(),
      requires_receipt: policy.requires_receipt,
      auto_approve_limit: policy.auto_approve_limit ? policy.auto_approve_limit.toString() : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (policyId) => {
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/policies/${policyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPolicies();
      } catch (error) {
        console.error('Error deleting policy:', error);
      }
    }
  };

  const getCategoryLabel = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.label : categoryName;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading policies...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expense Policies</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingPolicy ? 'Edit Policy' : 'Create New Policy'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="max_amount">Maximum Amount ($)</Label>
                <Input
                  id="max_amount"
                  type="number"
                  step="0.01"
                  value={formData.max_amount}
                  onChange={(e) => setFormData({...formData, max_amount: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="auto_approve_limit">Auto-Approve Limit ($)</Label>
                <Input
                  id="auto_approve_limit"
                  type="number"
                  step="0.01"
                  value={formData.auto_approve_limit}
                  onChange={(e) => setFormData({...formData, auto_approve_limit: e.target.value})}
                  placeholder="Leave empty to disable auto-approval"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_receipt"
                  checked={formData.requires_receipt}
                  onCheckedChange={(checked) => setFormData({...formData, requires_receipt: checked})}
                />
                <Label htmlFor="requires_receipt">Requires Receipt</Label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingPolicy(null);
                  setFormData({
                    category: '',
                    max_amount: '',
                    requires_receipt: true,
                    auto_approve_limit: ''
                  });
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{getCategoryLabel(policy.category)}</CardTitle>
                <div className="flex space-x-1">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(policy)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(policy.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                  <span>Max: ${policy.max_amount.toFixed(2)}</span>
                </div>
                
                {policy.auto_approve_limit && (
                  <div className="flex items-center text-sm">
                    <Badge variant="secondary" className="text-xs">
                      Auto-approve up to ${policy.auto_approve_limit.toFixed(2)}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  <span>{policy.requires_receipt ? 'Receipt required' : 'Receipt optional'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {policies.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No expense policies created yet</p>
            <p className="text-sm text-gray-500 mt-2">Create policies to set spending limits and approval rules</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExpensePoliciesPage;