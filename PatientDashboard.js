import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import io from 'socket.io-client';

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchTokenData = useCallback(async () => {
    try {
      const res = await api.get('/tokens/my-token');
      setToken(res.data.token);
      setQueueStatus(res.data.queueStatus);
    } catch (error) {
      console.error('Fetch token error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokenData();

    const socket = io('http://localhost:5000');

    socket.on('tokenCompleted', fetchTokenData);
    socket.on('queueUpdate', fetchTokenData);

    socket.on('doctorStatus', (data) => {
      setStatusMessage(data.message);
      setTimeout(() => setStatusMessage(''), 5000);
    });

    return () => {
      socket.close();
    };
  }, [fetchTokenData]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">Queuease</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {statusMessage && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
            {statusMessage}
          </div>
        )}

        {/* No Token */}
        {!token ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Token Generated
            </h2>
            <p className="text-gray-600 mb-6">
              Generate a token to get started
            </p>
            <button
              onClick={() => navigate('/patient/generate-token')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Generate Token
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Token Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Your Token
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600">Token Number</div>
                  <div
                    className={`text-3xl font-bold ${
                      token.isEmergency ? 'text-red-600' : 'text-indigo-600'
                    }`}
                  >
                    {token.tokenNumber}
                  </div>
                  {token.isEmergency && (
                    <div className="mt-2 inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded">
                      EMERGENCY
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-gray-600">Shift</div>
                  <div className="text-xl font-semibold text-gray-900 capitalize">
                    {token.shift}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <div
                    className={`text-xl font-semibold ${
                      token.status === 'completed'
                        ? 'text-green-600'
                        : token.status === 'missed'
                        ? 'text-red-600'
                        : token.status === 'serving'
                        ? 'text-blue-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {token.status.toUpperCase()}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {new Date(token.date).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {token.status === 'missed' && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                  <p className="font-semibold">Your token was missed</p>
                  <p className="text-sm">
                    You cannot generate a new token for this shift today.
                  </p>
                </div>
              )}
            </div>

            {/* Queue Status */}
            {queueStatus &&
              token.status !== 'missed' &&
              token.status !== 'completed' && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Queue Status
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm text-gray-600">
                        Current Serving
                      </div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {queueStatus.currentServing?.tokenNumber || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600">
                        Your Position
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {queueStatus.waitingPosition !== null
                          ? queueStatus.waitingPosition
                          : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600">
                        Estimated Wait
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {typeof queueStatus.estimatedWait === 'number'
                          ? `${queueStatus.estimatedWait} min`
                          : queueStatus.estimatedWait || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Disabled Generate Button */}
            {token.status !== 'missed' && token.status !== 'completed' && (
              <div className="text-center">
                <button
                  disabled
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md cursor-not-allowed"
                >
                  Generate New Token (One per shift per day)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
