import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import io from 'socket.io-client';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [config, setConfig] = useState(null);
  const [currentServing, setCurrentServing] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedShift, setSelectedShift] = useState('morning');
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({ maxTokensMorning: 30, maxTokensEvening: 30 });
  const fetchDashboardRef = useRef();

  const fetchDashboard = useCallback(async () => {
    try {
      console.log('Fetching dashboard, user role:', user?.role);
      const res = await api.get(`/doctor/dashboard?shift=${selectedShift}`);
      setTokens(res.data.tokens);
      setConfig(res.data.config);
      setCurrentServing(res.data.currentServing);
      setStats(res.data.stats);
    } catch (error) {
      console.error('Fetch dashboard error:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      if (error.response?.status === 403) {
        console.error('403 Forbidden - User role mismatch detected');
        alert(`Access Denied: You are logged in as '${user?.role || 'unknown'}'. Please log out and log in with a doctor account.`);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedShift, user]);

  // Keep ref updated with latest fetchDashboard
  useEffect(() => {
    fetchDashboardRef.current = fetchDashboard;
  }, [fetchDashboard]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    // Initialize Socket.IO connection (only once on mount)
    const newSocket = io('http://localhost:5000');

    newSocket.on('tokenGenerated', () => {
      if (fetchDashboardRef.current) {
        fetchDashboardRef.current();
      }
    });

    newSocket.on('tokenCompleted', () => {
      if (fetchDashboardRef.current) {
        fetchDashboardRef.current();
      }
    });

    newSocket.on('queueUpdate', () => {
      if (fetchDashboardRef.current) {
        fetchDashboardRef.current();
      }
    });

    newSocket.on('configUpdated', (data) => {
      setConfig(data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleMarkComplete = async (tokenId) => {
    try {
      await api.post('/doctor/complete', { tokenId });
      fetchDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark token as complete');
    }
  };

  const handlePauseResume = async () => {
    try {
      await api.post('/doctor/pause-resume');
      fetchDashboard();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    
    // Verify user is a doctor before making the request
    if (user?.role !== 'doctor') {
      alert(`Access Denied: You are logged in as '${user?.role || 'unknown'}'. Only doctors can update configuration.\n\nPlease log out and log in with a doctor account.`);
      return;
    }
    
    try {
      await api.put('/doctor/config', configForm);
      setShowConfigModal(false);
      fetchDashboard();
    } catch (error) {
      console.error('Update config error:', error);
      console.error('User role:', user?.role);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Failed to update config';
      const errorDetails = error.response?.data;
      
      if (error.response?.status === 403) {
        alert(`Access Denied: ${errorMessage}\n\nYour role: ${errorDetails?.current || user?.role || 'unknown'}\nRequired: ${errorDetails?.required?.join(' or ') || 'doctor'}\n\nPlease make sure you are logged in as a doctor account.`);
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const filteredTokens = tokens.filter(t => t.shift === selectedShift);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Queuease - Doctor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Dr. {user?.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Shift:</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </select>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePauseResume}
                className={`px-4 py-2 rounded-md ${
                  config?.isPaused
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {config?.isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => {
                  setConfigForm({
                    maxTokensMorning: config?.maxTokensMorning || 30,
                    maxTokensEvening: config?.maxTokensEvening || 30
                  });
                  setShowConfigModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Configure
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm text-gray-600">Serving</div>
              <div className="text-2xl font-bold text-blue-600">{stats.serving}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="text-sm text-gray-600">Emergency</div>
              <div className="text-2xl font-bold text-red-600">{stats.emergency}</div>
            </div>
          </div>
        )}

        {/* Current Serving */}
        {currentServing && (
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Currently Serving</div>
                <div className="text-3xl font-bold text-blue-600">
                  {currentServing.tokenNumber}
                </div>
                {currentServing.isEmergency && (
                  <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded">
                    EMERGENCY
                  </span>
                )}
              </div>
              <button
                onClick={() => handleMarkComplete(currentServing._id)}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Mark Complete
              </button>
            </div>
          </div>
        )}

        {/* Tokens List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Token Queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTokens.map((token) => (
                  <tr
                    key={token._id}
                    className={`${
                      token.isEmergency ? 'bg-red-50' :
                      token.status === 'serving' ? 'bg-blue-50' :
                      token.status === 'completed' ? 'bg-green-50' :
                      token.status === 'missed' ? 'bg-gray-100' :
                      ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-bold ${
                          token.isEmergency ? 'text-red-600' : 'text-indigo-600'
                        }`}>
                          {token.tokenNumber}
                        </span>
                        {token.isEmergency && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                            E
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{token.patientId?.name}</div>
                      <div className="text-sm text-gray-500">{token.patientId?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        token.status === 'completed' ? 'bg-green-100 text-green-800' :
                        token.status === 'serving' ? 'bg-blue-100 text-blue-800' :
                        token.status === 'missed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {token.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(token.generatedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {token.status === 'pending' || token.status === 'serving' ? (
                        <button
                          onClick={() => handleMarkComplete(token._id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Configure Max Tokens</h3>
              <form onSubmit={handleUpdateConfig}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens (Morning)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={configForm.maxTokensMorning}
                    onChange={(e) => setConfigForm({ ...configForm, maxTokensMorning: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens (Evening)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={configForm.maxTokensEvening}
                    onChange={(e) => setConfigForm({ ...configForm, maxTokensEvening: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;

