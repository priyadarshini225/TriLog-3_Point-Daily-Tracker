import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Users, UserPlus, UserCheck, Trophy, Search, X, Check } from 'lucide-react';
import './Friends.css';

export default function Friends() {
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch friends
  const { data: friendsData = [], isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await api.get('/friends');
      return response.data.data;
    }
  });

  // Fetch friend requests
  const { data: requestsData = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: async () => {
      const response = await api.get('/friends/requests');
      return response.data.data;
    }
  });

  // Fetch leaderboard
  const { data: leaderboardData = [], isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await api.get('/friends/leaderboard');
      return response.data.data;
    }
  });

  // Search users
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await api.get(`/friends/search?q=${searchQuery}`);
      return response.data.data;
    },
    enabled: searchQuery.trim().length > 0
  });

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (userId) => {
      await api.post(`/friends/request/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['search-users']);
      queryClient.invalidateQueries(['friends']);
    }
  });

  // Accept request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: async (friendshipId) => {
      await api.put(`/friends/accept/${friendshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-requests']);
      queryClient.invalidateQueries(['friends']);
      queryClient.invalidateQueries(['leaderboard']);
    }
  });

  // Reject request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async (friendshipId) => {
      await api.put(`/friends/reject/${friendshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-requests']);
    }
  });

  // Unfriend mutation
  const unfriendMutation = useMutation({
    mutationFn: async (friendshipId) => {
      await api.delete(`/friends/${friendshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friends']);
      queryClient.invalidateQueries(['leaderboard']);
    }
  });

  const handleSendRequest = (userId) => {
    sendRequestMutation.mutate(userId);
  };

  const handleAcceptRequest = (friendshipId) => {
    acceptRequestMutation.mutate(friendshipId);
  };

  const handleRejectRequest = (friendshipId) => {
    rejectRequestMutation.mutate(friendshipId);
  };

  const handleUnfriend = (friendshipId) => {
    if (confirm('Are you sure you want to unfriend this user?')) {
      unfriendMutation.mutate(friendshipId);
    }
  };

  const renderFriends = () => {
    if (loadingFriends) return <div className="loading">Loading friends...</div>;
    
    if (friendsData.length === 0) {
      return <div className="empty-state">No friends yet. Add some friends to get started!</div>;
    }

    return (
      <div className="friends-grid">
        {friendsData.map((friend) => (
          <div key={friend.friendshipId} className="friend-card">
            <div className="friend-avatar">
              {friend.name.charAt(0).toUpperCase()}
            </div>
            <div className="friend-info">
              <h3>{friend.name}</h3>
              <p>{friend.email}</p>
            </div>
            <div className="friend-actions">
              <button
                className="btn-view"
                onClick={() => navigate(`/friends/${friend.friendId}`)}
              >
                View Profile
              </button>
              <button
                className="btn-unfriend"
                onClick={() => handleUnfriend(friend.friendshipId)}
              >
                <X size={16} /> Unfriend
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRequests = () => {
    if (loadingRequests) return <div className="loading">Loading requests...</div>;

    if (requestsData.length === 0) {
      return <div className="empty-state">No pending friend requests</div>;
    }

    return (
      <div className="requests-list">
        {requestsData.map((request) => (
          <div key={request._id} className="request-card">
            <div className="friend-avatar">
              {request.requester.name.charAt(0).toUpperCase()}
            </div>
            <div className="request-info">
              <h3>{request.requester.name}</h3>
              <p>{request.requester.email}</p>
            </div>
            <div className="request-actions">
              <button
                className="btn-accept"
                onClick={() => handleAcceptRequest(request._id)}
                disabled={acceptRequestMutation.isLoading}
              >
                <Check size={16} /> Accept
              </button>
              <button
                className="btn-reject"
                onClick={() => handleRejectRequest(request._id)}
                disabled={rejectRequestMutation.isLoading}
              >
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSearch = () => {
    return (
      <div className="search-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searching && <div className="loading">Searching...</div>}

        {searchQuery.trim() && !searching && (
          <div className="search-results">
            {searchResults.length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <div className="users-list">
                {searchResults.map((user) => (
                  <div key={user._id} className="user-card">
                    <div className="friend-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <h3>{user.name}</h3>
                      <p>{user.email}</p>
                    </div>
                    <div className="user-actions">
                      {user.friendshipStatus === 'none' && (
                        <button
                          className="btn-add"
                          onClick={() => handleSendRequest(user._id)}
                          disabled={sendRequestMutation.isLoading}
                        >
                          <UserPlus size={16} /> Add Friend
                        </button>
                      )}
                      {user.friendshipStatus === 'pending' && (
                        <span className="status-badge pending">Request Sent</span>
                      )}
                      {user.friendshipStatus === 'accepted' && (
                        <span className="status-badge accepted">Friends</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLeaderboard = () => {
    if (loadingLeaderboard) return <div className="loading">Loading leaderboard...</div>;

    if (leaderboardData.length === 0) {
      return <div className="empty-state">No leaderboard data available</div>;
    }

    return (
      <div className="leaderboard-section">
        <div className="leaderboard-table">
          <div className="table-header">
            <div className="header-cell rank">Rank</div>
            <div className="header-cell name">User</div>
            <div className="header-cell stat">Entries</div>
            <div className="header-cell stat">Productive Hours</div>
            <div className="header-cell stat">Revisions</div>
            <div className="header-cell stat">Streak</div>
          </div>
          <div className="table-body">
            {leaderboardData.map((entry, index) => (
              <div 
                key={entry.userId} 
                className={`table-row ${entry.isCurrentUser ? 'current-user' : ''} ${index < 3 ? `rank-${index + 1}` : ''}`}
              >
                <div className="cell rank">
                  {index === 0 && <Trophy size={20} className="trophy gold" />}
                  {index === 1 && <Trophy size={20} className="trophy silver" />}
                  {index === 2 && <Trophy size={20} className="trophy bronze" />}
                  {index > 2 && <span>#{index + 1}</span>}
                </div>
                <div className="cell name">
                  <div className="leaderboard-avatar">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{entry.name} {entry.isCurrentUser && '(You)'}</span>
                </div>
                <div className="cell stat">{entry.totalEntries}</div>
                <div className="cell stat">{entry.totalProductiveHours.toFixed(1)}h</div>
                <div className="cell stat">{entry.totalRevisions}</div>
                <div className="cell stat">
                  {entry.streak > 0 ? (
                    <span className="streak">🔥 {entry.streak} days</span>
                  ) : (
                    <span>0 days</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="friends-container">
      <div className="friends-header">
        <h1>Friends</h1>
        <p>Connect with friends and compete together</p>
      </div>

      <div className="friends-tabs">
        <button
          className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <Users size={18} />
          My Friends ({friendsData.length})
        </button>
        <button
          className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <UserCheck size={18} />
          Requests ({requestsData.length})
        </button>
        <button
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <UserPlus size={18} />
          Add Friends
        </button>
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy size={18} />
          Leaderboard
        </button>
      </div>

      <div className="friends-content">
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'leaderboard' && renderLeaderboard()}
      </div>
    </div>
  );
}
