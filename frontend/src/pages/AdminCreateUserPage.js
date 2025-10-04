import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  UserPlus, 
  ArrowLeft, 
  Shield, 
  Users, 
  Mail,
  Eye,
  EyeOff,
  Key,
  Building2,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const AdminCreateUserPage = () => {
  const { API } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    manager_id: 'none'
  });
  
  const [managers, setManagers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    fetchManagers();
  }, []);

  useEffect(() => {
    checkPasswordStrength(formData.password);
  }, [formData.password]);

  const fetchManagers = async () => {
    try {
      console.log('Fetching managers from:', `${API}/admin/users`);
      const response = await axios.get(`${API}/admin/users`);
      console.log('Managers response:', response.data);
      
      // Filter to get only admins and managers who can be assigned as managers
      const managersList = response.data.users.filter(user => 
        user.role === 'admin' || user.role === 'manager'
      );
      console.log('Filtered managers list:', managersList);
      setManagers(managersList);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load managers list';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'bg-red-200';
      case 2: return 'bg-orange-200';
      case 3: return 'bg-yellow-200';
      case 4: return 'bg-green-200';
      case 5: return 'bg-green-300';
      default: return 'bg-gray-200';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'Very Weak';
      case 2: return 'Weak';
      case 3: return 'Fair';
      case 4: return 'Good';
      case 5: return 'Strong';
      default: return '';
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    toast.success('Secure password generated');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (passwordStrength < 3) {
      toast.error('Please use a stronger password');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = {
        full_name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        manager_id: formData.manager_id === 'none' ? null : formData.manager_id || null
      };

      await axios.post(`${API}/admin/users`, userData);
      toast.success(`User ${formData.name} created successfully!`);
      navigate('/admin/users');
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    { 
      value: 'admin', 
      label: 'Administrator', 
      description: 'Full access to all company data and user management',
      icon: Shield,
      color: 'bg-purple-100 text-purple-700'
    },
    { 
      value: 'manager', 
      label: 'Manager', 
      description: 'Can manage team members and approve expenses',
      icon: Users,
      color: 'bg-blue-100 text-blue-700'
    },
    { 
      value: 'employee', 
      label: 'Employee', 
      description: 'Can create and manage own expenses',
      icon: Users,
      color: 'bg-green-100 text-green-700'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin/users')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-indigo-600" />
            </div>
            Create New User
          </h1>
          <p className="text-gray-600">Add a new team member to your company</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-blue-100 rounded">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter full name"
                    className="mt-1 bg-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address *
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                      className="pl-10 bg-white"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-green-100 rounded">
                  <Key className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Security</h3>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password *
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generatePassword}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Generate Secure Password
                  </Button>
                </div>
                <div className="relative mt-1">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter password"
                    className="pl-10 pr-10 bg-white"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use 8+ characters with uppercase, lowercase, numbers, and symbols
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-purple-100 rounded">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Role & Permissions</h3>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Select Role *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {roles.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <div
                        key={role.value}
                        onClick={() => handleInputChange('role', role.value)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                          formData.role === role.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded ${role.color}`}>
                            <RoleIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{role.label}</h4>
                            {formData.role === role.value && (
                              <Check className="h-4 w-4 text-indigo-600 float-right" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(formData.role === 'employee' || formData.role === 'manager') && (
                <div>
                  <Label htmlFor="manager" className="text-sm font-medium text-gray-700">
                    Assign Manager {formData.role === 'employee' ? '*' : '(Optional)'}
                  </Label>
                  <Select
                    value={formData.manager_id}
                    onValueChange={(value) => handleInputChange('manager_id', value)}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {managers.filter(manager => manager.id && manager.id !== '').length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          No managers available. Create manager users first.
                        </div>
                      ) : (
                        managers.filter(manager => manager.id && manager.id !== '').map((manager) => (
                          <SelectItem key={manager.id} value={String(manager.id)}>
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded text-xs ${
                                manager.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {manager.role}
                              </div>
                              {manager.full_name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.role === 'employee' && !formData.manager_id && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Employee should have a manager assigned
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/users')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || passwordStrength < 3}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating User...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreateUserPage;