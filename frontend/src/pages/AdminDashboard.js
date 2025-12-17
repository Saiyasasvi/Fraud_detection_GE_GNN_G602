import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState({
    pending: true,
    approved: true,
    feedback: true
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData('pending');
    fetchData('approved');
    fetchData('feedback');
  }, [user, navigate]);

  const fetchData = async (type) => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
      let endpoint = '';
      
      switch(type) {
        case 'pending':
          endpoint = '/api/access-requests?status=pending';
          break;
        case 'approved':
          endpoint = '/api/approved-users';
          break;
        case 'feedback':
          endpoint = '/api/feedback';
          break;
        default:
          return;
      }

      const response = await fetch(`${BACKEND_URL}${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      switch(type) {
        case 'pending':
          setPendingRequests(data);
          break;
        case 'approved':
          setApprovedUsers(data);
          break;
        case 'feedback':
          setFeedbacks(data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleApprove = async (username) => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${BACKEND_URL}/api/access-requests/${username}/approve`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to approve request');
      
      // Refresh the pending requests and approved users
      fetchData('pending');
      fetchData('approved');
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleDeny = async (username) => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${BACKEND_URL}/api/access-requests/${username}/deny`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to deny request');
      
      // Refresh the pending requests
      fetchData('pending');
    } catch (error) {
      console.error('Error denying request:', error);
    }
  };

  if (!user || user.role !== 'admin') {
    return null; // Or a loading/unauthorized message
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <Button onClick={logout} variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
            Logout
          </Button>
        </div>

        {/* Custom Tabs */}
        <div className="mb-6">
          <div className="flex space-x-2 border-b border-slate-800">
            {['pending', 'approved', 'feedback'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-all ${
                  activeTab === tab
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab === 'pending' && 'Pending Requests'}
                {tab === 'approved' && 'Approved Users'}
                {tab === 'feedback' && 'User Feedback'}
              </button>
            ))}
          </div>
        </div>

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <div className="rounded-md border border-slate-800 bg-slate-900/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300">Username</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Requested At</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.pending ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={4} className="text-center py-4 text-slate-400">Loading...</TableCell>
                  </TableRow>
                ) : pendingRequests.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={4} className="text-center py-4 text-slate-400">No pending requests</TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((request) => (
                    <TableRow key={request._id} className="border-slate-800">
                      <TableCell className="text-slate-300">{request.username}</TableCell>
                      <TableCell className="text-slate-300">{request.email}</TableCell>
                      <TableCell className="text-slate-400">{new Date(request.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" onClick={() => handleApprove(request.username)} className="bg-green-600 hover:bg-green-700">
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeny(request.username)}>
                          Deny
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Approved Users Tab */}
        {activeTab === 'approved' && (
          <div className="rounded-md border border-slate-800 bg-slate-900/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300">Username</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.approved ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={3} className="text-center py-4 text-slate-400">Loading...</TableCell>
                  </TableRow>
                ) : approvedUsers.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={3} className="text-center py-4 text-slate-400">No approved users found</TableCell>
                  </TableRow>
                ) : (
                  approvedUsers.map((user) => (
                    <TableRow key={user._id} className="border-slate-800">
                      <TableCell className="text-slate-300">{user.username}</TableCell>
                      <TableCell className="text-slate-300">{user.email}</TableCell>
                      <TableCell className="text-slate-300">{user.role || 'user'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="rounded-md border border-slate-800 bg-slate-900/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300">Username</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Rating</TableHead>
                  <TableHead className="text-slate-300">Comments</TableHead>
                  <TableHead className="text-slate-300">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.feedback ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={5} className="text-center py-4 text-slate-400">Loading feedback...</TableCell>
                  </TableRow>
                ) : feedbacks.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={5} className="text-center py-4 text-slate-400">No feedback available</TableCell>
                  </TableRow>
                ) : (
                  feedbacks.map((feedback) => (
                    <TableRow key={feedback._id} className="border-slate-800">
                      <TableCell className="text-slate-300">{feedback.username || 'Anonymous'}</TableCell>
                      <TableCell className="text-slate-300">{feedback.email || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                              key={star} 
                              className={`${star <= (feedback.rating || 0) ? 'text-yellow-400' : 'text-slate-600'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-xs overflow-hidden text-ellipsis">
                        {feedback.comments}
                      </TableCell>
                      <TableCell className="text-slate-400 whitespace-nowrap">
                        {feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
