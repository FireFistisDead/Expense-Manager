import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Users, Mail, Phone, Briefcase, Edit, UserMinus, Plus } from 'lucide-react';
import axios from 'axios';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    job_title: '',
    phone: '',
    manager_id: ''
  });

  useEffect(() => {
    fetchUsers();
    getCurrentUser();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const submitData = {
        ...formData,
        manager_id: formData.manager_id === 'none' ? null : formData.manager_id
      };
      await axios.put(`/api/users/${editingUser.id}`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEditForm(false);
      setEditingUser(null);
      setFormData({
        full_name: '',
        department: '',
        job_title: '',
        phone: '',
        manager_id: ''
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      department: user.department || '',
      job_title: user.job_title || '',
      phone: user.phone || '',
      manager_id: user.manager_id || 'none'
    });
    setShowEditForm(true);
  };

  const handleDeactivate = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUsers();
      } catch (error) {
        console.error('Error deactivating user:', error);
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getManagerName = (managerId) => {
    const manager = users.find(user => user.id === managerId);
    return manager ? manager.full_name : 'No Manager';
  };

  const getPotentialManagers = () => {
    return users.filter(user => 
      user.role === 'manager' || user.role === 'admin'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{users.length} users</span>
        </div>
      </div>

      {showEditForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit User: {editingUser?.full_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    placeholder="e.g., Engineering, Marketing, Sales"
                  />
                </div>

                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    placeholder="e.g., Software Engineer, Marketing Manager"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="manager_id">Manager</Label>
                  <Select
                    value={formData.manager_id}
                    onValueChange={(value) => setFormData({...formData, manager_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {getPotentialManagers()
                        .filter(user => user.id !== editingUser?.id)
                        .map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.full_name} ({manager.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">Update User</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditForm(false);
                  setEditingUser(null);
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-lg">{user.full_name}</h3>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                      {!user.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      
                      {user.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      
                      {user.job_title && (
                        <div className="flex items-center space-x-1">
                          <Briefcase className="h-4 w-4" />
                          <span>{user.job_title}</span>
                        </div>
                      )}
                    </div>
                    
                    {user.department && (
                      <div className="text-sm text-gray-600 mt-1">
                        Department: {user.department}
                      </div>
                    )}
                    
                    {user.manager_id && (
                      <div className="text-sm text-gray-600 mt-1">
                        Reports to: {getManagerName(user.manager_id)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {(currentUser?.role === 'admin' || currentUser?.id === user.id) && (
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {currentUser?.role === 'admin' && user.id !== currentUser.id && user.is_active && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeactivate(user.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No users found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserManagementPage;