import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import EntryDetailModal from '../components/EntryDetailModal'
import './Calendar.css'

function Calendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEntry, setSelectedEntry] = useState(null)
  const userId = useAuthStore((s) => s.user?.id)
  
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  
  // Get entries for the current month
  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['entries', userId, format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await api.get(
        `/entries?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}&limit=100`
      )
      return response.data
    },
    enabled: !!userId,
  })

  // Get schedules for productive hours
  const { data: schedulesData } = useQuery({
    queryKey: ['schedules', userId, format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await api.get(
        `/schedules?startDate=${format(monthStart, 'yyyy-MM-dd')}&endDate=${format(monthEnd, 'yyyy-MM-dd')}`
      )
      return response.data
    },
    enabled: !!userId,
  })

  const entries = entriesData?.entries || []
  const schedules = schedulesData?.data || []
  
  const entriesByDate = {}
  entries.forEach(entry => {
    entriesByDate[entry.date] = entry
  })

  const schedulesByDate = {}
  schedules.forEach(schedule => {
    const dateStr = format(new Date(schedule.date), 'yyyy-MM-dd')
    schedulesByDate[dateStr] = schedule
  })

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDayClick = (dateStr, entry) => {
    if (entry) {
      setSelectedEntry(entry)
    } else {
      // Allow creating entry for today or past dates only
      const clickedDate = new Date(dateStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (clickedDate <= today) {
        navigate('/new', { state: { date: dateStr } })
      }
    }
  }

  const handleCloseModal = () => {
    setSelectedEntry(null)
  }

  // Generate calendar days
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = monthStart.getDay()
  const emptyDays = Array(firstDayOfWeek).fill(null)

  return (
    <div className="calendar-page fade-in">
      <div className="calendar-header">
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">Track your daily entries and progress</p>
      </div>

      <div className="calendar-layout">
        {/* Left Column - Calendar */}
        <div className="calendar-section">
          <div className="calendar-controls">
            <button className="btn btn-secondary btn-sm" onClick={goToToday}>
              Today
            </button>
            <div className="month-navigation">
              <button className="btn btn-secondary btn-sm" onClick={previousMonth}>
                <ChevronLeft size={20} />
              </button>
              <h2 className="month-title">{format(currentDate, 'MMMM yyyy')}</h2>
              <button className="btn btn-secondary btn-sm" onClick={nextMonth}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="calendar-container card glass-card">
            {isLoading ? (
              <div className="loading-state">Loading calendar...</div>
            ) : (
              <>
                <div className="calendar-weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="weekday">{day}</div>
                  ))}
                </div>

                <div className="calendar-grid">
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="calendar-day empty" />
                  ))}
                  
                  {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const entry = entriesByDate[dateStr]
                    const schedule = schedulesByDate[dateStr]
                    const hasEntry = !!entry
                    const hasSchedule = !!schedule
                    const isCurrentMonth = isSameMonth(day, currentDate)
                    const isCurrentDay = isToday(day)

                    // Compare dates without time component
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const compareDay = new Date(day)
                    compareDay.setHours(0, 0, 0, 0)
                    const isPastOrToday = compareDay <= today
                    const isFuture = compareDay > today
                    const isClickable = isCurrentMonth && (hasEntry || isPastOrToday)

                    const completedTasks = schedule?.tasks?.filter(t => t.completed) || []
                    const productiveHours = schedule?.productiveHours || 0

                    return (
                      <div
                        key={dateStr}
                        className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''} ${hasEntry ? 'has-entry' : ''} ${isClickable ? 'clickable' : ''} ${isFuture ? 'future' : ''}`}
                        onClick={() => isClickable && handleDayClick(dateStr, entry)}
                        title={hasEntry ? 'Click to edit entry' : (isClickable ? 'Click to create entry' : '')}
                      >
                        <div className="day-number">{format(day, 'd')}</div>
                        {hasEntry && (
                          <div className="entry-indicator">
                            <div className="entry-dot" />
                          </div>
                        )}
                        {hasSchedule && productiveHours > 0 && (
                          <div className="productive-info">
                            <div className="productive-hours" title={`${productiveHours.toFixed(1)} productive hours`}>
                              ⚡ {productiveHours.toFixed(1)}h
                            </div>
                            {completedTasks.length > 0 && (
                              <div className="completed-tasks" title={`${completedTasks.length} tasks completed`}>
                                ✓ {completedTasks.length}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="calendar-sidebar">
          <div className="calendar-stats">
            <div className="stat-card card glass-card">
              <div className="stat-value">{entries.length}</div>
              <div className="stat-label">Entries this month</div>
            </div>
            <div className="stat-card card glass-card">
              <div className="stat-value">
                {entries.length > 0 ? Math.round((entries.length / days.length) * 100) : 0}%
              </div>
              <div className="stat-label">Completion rate</div>
            </div>
            <div className="stat-card card glass-card">
              <div className="stat-value">
                {entries.reduce((sum, entry) => sum + (entry.reviseLater?.length || 0), 0)}
              </div>
              <div className="stat-label">Items to revise</div>
            </div>
          </div>

          <div className="calendar-legend card glass-card">
            <h3 className="legend-title">Legend</h3>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-indicator today-indicator"></div>
                <span>Today</span>
              </div>
              <div className="legend-item">
                <div className="legend-indicator has-entry-indicator"></div>
                <span>Has Entry</span>
              </div>
              <div className="legend-item">
                <div className="legend-indicator clickable-indicator"></div>
                <span>Can Create</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <EntryDetailModal entry={selectedEntry} onClose={handleCloseModal} />
      )}
    </div>
  )
}

export default Calendar
