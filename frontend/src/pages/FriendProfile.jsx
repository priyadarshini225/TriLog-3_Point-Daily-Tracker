import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle,
  TrendingUp,
  Activity,
  List,
  Brain
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import './FriendProfile.css';

export default function FriendProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Helper function to safely format dates
  const formatDate = (date, formatStr) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return isValid(dateObj) ? format(dateObj, formatStr) : 'N/A';
  };

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['friend-profile', userId],
    queryFn: async () => {
      const response = await api.get(`/friends/profile/${userId}`);
      return response.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-state">
          <p>Unable to load profile. Make sure you are friends with this user.</p>
          <button className="btn-back" onClick={() => navigate('/friends')}>
            Back to Friends
          </button>
        </div>
      </div>
    );
  }

  const { user, stats, recentEntries, recentSchedules, recentRevisions } = profileData;

  return (
    <div className="profile-container">
      <button className="btn-back-nav" onClick={() => navigate('/friends')}>
        <ArrowLeft size={20} />
        Back to Friends
      </button>

      <div className="profile-header">
        <div className="profile-avatar-large">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-header-info">
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon entries">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalEntries}</div>
            <div className="stat-label">Total Entries</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon productive">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalProductiveHours.toFixed(1)}h</div>
            <div className="stat-label">Productive Hours</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revisions">
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalRevisions}</div>
            <div className="stat-label">Topics Revised</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon streak">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.currentStreak || 0}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>
      </div>

      <div className="activity-section">
        <div className="section-header">
          <Activity size={20} />
          <h2>Recent Activity</h2>
          <span className="activity-count">Last 7 days</span>
        </div>

        {recentEntries.length === 0 ? (
          <div className="empty-activity">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="activity-timeline">
            {recentEntries.map((entry) => (
              <div key={entry._id} className="activity-item">
                <div className="activity-date">
                  <div className="date-badge">
                    {formatDate(entry.date, 'MMM dd')}
                  </div>
                  <div className="date-line"></div>
                </div>
                <div className="activity-content">
                  <div className="activity-header">
                    <CheckCircle size={16} className="check-icon" />
                    <span className="activity-title">Daily Entry Completed</span>
                    <span className="activity-time">
                      {formatDate(entry.createdAt, 'h:mm a')}
                    </span>
                  </div>
                  
                  <div className="activity-questions">
                    {entry.answers && entry.answers.slice(0, 3).map((answer, index) => (
                      <div key={index} className="activity-question">
                        <div className="question-label">Q{index + 1}</div>
                        <div className="question-preview">
                          {answer.answer.length > 100 
                            ? answer.answer.substring(0, 100) + '...' 
                            : answer.answer}
                        </div>
                      </div>
                    ))}
                    {entry.answers && entry.answers.length > 3 && (
                      <div className="more-answers">
                        +{entry.answers.length - 3} more answers
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Schedules Section */}
      <div className="activity-section">
        <div className="section-header">
          <List size={20} />
          <h2>Daily Schedules</h2>
          <span className="activity-count">Last 7 days</span>
        </div>

        {!recentSchedules || recentSchedules.length === 0 ? (
          <div className="empty-activity">
            <p>No recent schedules</p>
          </div>
        ) : (
          <div className="schedules-grid">
            {recentSchedules.map((schedule) => (
              <div key={schedule._id} className="schedule-card">
                <div className="schedule-header">
                  <div className="schedule-date">
                    {formatDate(schedule.date, 'MMM dd, yyyy')}
                  </div>
                  <div className="schedule-time">
                    {schedule.wakeTime} - {schedule.bedTime}
                  </div>
                </div>
                
                {schedule.tasks && schedule.tasks.length > 0 ? (
                  <div className="schedule-tasks">
                    {schedule.tasks.map((task) => (
                      <div key={task._id} className={`schedule-task ${task.completed ? 'completed' : ''}`}>
                        <CheckCircle size={14} className={task.completed ? 'check-completed' : 'check-pending'} />
                        <div className="task-details">
                          <span className="task-title">{task.taskName}</span>
                          <span className="task-timing">{task.startTime} - {task.endTime}</span>
                        </div>
                        <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                      </div>
                    ))}
                    <div className="schedule-summary">
                      ⚡ {schedule.productiveHours?.toFixed(1) || 0}h productive · 
                      ✓ {schedule.tasks.filter(t => t.completed).length}/{schedule.tasks.length} completed
                    </div>
                  </div>
                ) : (
                  <div className="empty-tasks">No tasks scheduled</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revisions Section */}
      <div className="activity-section">
        <div className="section-header">
          <Brain size={20} />
          <h2>Revised Topics</h2>
          <span className="activity-count">Recent revisions</span>
        </div>

        {!recentRevisions || recentRevisions.length === 0 ? (
          <div className="empty-activity">
            <p>No recent revisions</p>
          </div>
        ) : (
          <div className="revisions-list">
            {recentRevisions.map((revision) => (
              <div key={revision._id} className="revision-card">
                <div className="revision-header">
                  <BookOpen size={18} className="revision-icon" />
                  <div className="revision-info">
                    <h4>{revision.originalText || 'No topic text'}</h4>
                  </div>
                  <span className={`status-badge ${revision.status || 'pending'}`}>
                    {revision.status || 'pending'}
                  </span>
                </div>
                
                <div className="revision-details">
                  <div className="revision-meta">
                    <span>📅 Type: Day {revision.revisionType}</span>
                    <span>🗓️ Scheduled: {formatDate(revision.scheduledAt, 'MMM dd, yyyy')}</span>
                  </div>
                  {revision.completedAt && (
                    <div className="revision-completed">
                      ✅ Completed: {formatDate(revision.completedAt, 'MMM dd, yyyy')}
                    </div>
                  )}
                  {revision.responseText && (
                    <div className="revision-response">
                      <strong>Response:</strong> {revision.responseText}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
