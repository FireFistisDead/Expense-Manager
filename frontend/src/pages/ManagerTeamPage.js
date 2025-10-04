import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Mail, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  ArrowRight,
  MoreVertical,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const ManagerTeamPage = () => {
  const { API, user } = useContext(AuthContext);
  const [teamData, setTeamData] = useState(null);
  const [teamExpenses, setTeamExpenses] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [filteredTeam, setFilteredTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeamData();
    fetchTeamExpenses();
    fetchPendingExpenses();
  }, []);

  useEffect(() => {
    if (teamData?.team_members) {
      filterTeamMembers();
    }
  }, [teamData, searchTerm]);

  const fetchTeamData = async () => {
    try {
      const response = await axios.get(`${API}/manager/team`);
      setTeamData(response.data);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      toast.error('Failed to load team information');
    }
  };

  const fetchTeamExpenses = async () => {
    try {
      const response = await axios.get(`${API}/manager/team/expenses`);
      setTeamExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch team expenses:', error);
    }
  };

  const fetchPendingExpenses = async () => {
    try {
      const response = await axios.get(`${API}/manager/team/pending`);
      setPendingExpenses(response.data.pending_expenses || []);
    } catch (error) {
      console.error('Failed to fetch pending expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTeamMembers = () => {
    if (!searchTerm) {
      setFilteredTeam(teamData.team_members);
      return;
    }

    const filtered = teamData.team_members.filter(member =>
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTeam(filtered);
  };

  const getTeamStats = () => {
    if (!teamData) return { totalMembers: 0, activeMembers: 0 };
    
    return {
      totalMembers: teamData.team_size || 0,
      activeMembers: teamData.team_members?.filter(m => m.is_active).length || 0,
      totalExpenses: teamExpenses.length,
      pendingApprovals: pendingExpenses.length,
      totalAmount: teamExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    };
  };

  const getMemberExpenseStats = (memberId) => {
    const memberExpenses = teamExpenses.filter(exp => exp.employee_id === memberId);
    const pendingCount = pendingExpenses.filter(exp => exp.employee_id === memberId).length;
    
    return {
      total: memberExpenses.length,
      pending: pendingCount,
      approved: memberExpenses.filter(exp => exp.status === 'approved').length,
      totalAmount: memberExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    };
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'employee': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      day: 'numeric'
    });
  };

  const stats = getTeamStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            My Team
          </h1>
          <p className="text-gray-600">
            Manage your direct reports and oversee team performance
          </p>
        </div>
        <Link to="/manager/team/expenses">
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg">
            <TrendingUp className="h-4 w-4 mr-2" />
            View All Expenses
          </Button>
        </Link>
      </div>

      {/* Manager Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Team Manager</h3>
              <div className="flex items-center gap-4 mt-1">
                <span className="font-medium text-blue-800">{teamData?.manager?.full_name}</span>
                <span className="text-blue-600 text-sm">{teamData?.manager?.email}</span>
                <Badge className="bg-blue-100 text-blue-700">
                  {user?.role}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Team Size</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalMembers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Team Members</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalMembers}</p>
                <p className="text-xs text-green-600 mt-1">{stats.activeMembers} active</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalExpenses}</p>
                <p className="text-xs text-blue-600 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Pending Approvals</p>
                <p className="text-2xl font-bold text-orange-900">{stats.pendingApprovals}</p>
                <p className="text-xs text-orange-600 mt-1">Awaiting review</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(stats.totalAmount)}
                </p>
                <p className="text-xs text-purple-600 mt-1">Team expenses</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1 bg-white/80 backdrop-blur-sm border-gray-200">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Link to="/approvals">
            <Button variant="outline" className="bg-white">
              <Clock className="h-4 w-4 mr-2" />
              Review Approvals
            </Button>
          </Link>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeam.map((member) => {
          const memberStats = getMemberExpenseStats(member.id);
          return (
            <Card 
              key={member.id} 
              className="bg-white/80 backdrop-blur-sm border-gray-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {member.full_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${getRoleColor(member.role)}`}
                    >
                      {member.role}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <div className="flex items-center gap-2">
                      {member.is_active ? (
                        <>
                          <Eye className="h-3 w-3 text-green-500" />
                          <span className="text-green-600 font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 text-red-500" />
                          <span className="text-red-600 font-medium">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expense Stats */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Expense Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="font-medium text-gray-900 ml-1">{memberStats.total}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pending:</span>
                        <span className="font-medium text-orange-600 ml-1">{memberStats.pending}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Approved:</span>
                        <span className="font-medium text-green-600 ml-1">{memberStats.approved}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <span className="font-medium text-blue-600 ml-1">
                          {formatCurrency(memberStats.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {memberStats.pending > 0 && (
                      <Link to="/approvals" className="flex-1">
                        <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                          <Clock className="h-3 w-3 mr-1" />
                          Review ({memberStats.pending})
                        </Button>
                      </Link>
                    )}
                    <Link to="/manager/team/expenses" className="flex-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full bg-white"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        View Expenses
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTeam.length === 0 && !loading && (
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No team members found' : 'No team members yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search criteria.' 
                : 'You don\'t have any direct reports assigned to you yet.'}
            </p>
            {!searchTerm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                <Building2 className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700">
                  Contact your administrator to assign team members to you.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      {teamData && teamData.team_size > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Team Expenses</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    View and analyze all team expense reports
                  </p>
                  <Link to="/manager/team/expenses">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      View All Expenses
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-orange-900 mb-2">Pending Approvals</h3>
                  <p className="text-sm text-orange-700 mb-4">
                    Review and approve pending expense requests
                  </p>
                  <Link to="/approvals">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                      Review Approvals
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManagerTeamPage;