import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Calendar.css'

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
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

  const entries = entriesData?.entries || []
  const entriesByDate = {}
  entries.forEach(entry => {
    entriesByDate[entry.date] = entry
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

  // Generate calendar days
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = monthStart.getDay()
  const emptyDays = Array(firstDayOfWeek).fill(null)

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <h1 className="page-title">Calendar</h1>
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
      </div>

      <div className="calendar-container card">
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
                const hasEntry = !!entry
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isCurrentDay = isToday(day)

                return (
                  <div
                    key={dateStr}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''} ${hasEntry ? 'has-entry' : ''}`}
                  >
                    <div className="day-number">{format(day, 'd')}</div>
                    {hasEntry && (
                      <div className="entry-indicator">
                        <div className="entry-dot" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="calendar-stats">
        <div className="stat-card card">
          <div className="stat-value">{entries.length}</div>
          <div className="stat-label">Entries this month</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">
            {entries.length > 0 ? Math.round((entries.length / days.length) * 100) : 0}%
          </div>
          <div className="stat-label">Completion rate</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">
            {entries.reduce((sum, entry) => sum + (entry.reviseLater?.length || 0), 0)}
          </div>
          <div className="stat-label">Items to revise</div>
        </div>
      </div>
    </div>
  )
}

export default Calendar
