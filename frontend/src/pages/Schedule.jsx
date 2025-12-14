import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Clock, Plus, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../lib/api'
import './Schedule.css'

function Schedule() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [wakeTime, setWakeTime] = useState('06:00')
  const [bedTime, setBedTime] = useState('22:00')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [newTask, setNewTask] = useState({
    taskName: '',
    startTime: '',
    endTime: '',
    priority: 'medium',
    notes: ''
  })

  const dateStr = selectedDate.toISOString().split('T')[0]

  // Fetch schedule for selected date
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', dateStr],
    queryFn: async () => {
      const response = await api.get(`/schedules/${dateStr}`)
      return response.data.data
    }
  })

  // Update wake/bed times when schedule loads
  useEffect(() => {
    if (schedule) {
      setWakeTime(schedule.wakeTime)
      setBedTime(schedule.bedTime)
    }
  }, [schedule])

  // Save schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/schedules', data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', dateStr])
      toast.success('Schedule updated!')
    },
    onError: () => {
      toast.error('Failed to update schedule')
    }
  })

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task) => {
      const response = await api.post(`/schedules/${dateStr}/tasks`, task)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', dateStr])
      toast.success('Task added!')
      setShowTaskModal(false)
      resetTaskForm()
    },
    onError: () => {
      toast.error('Failed to add task')
    }
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }) => {
      const response = await api.put(`/schedules/${dateStr}/tasks/${taskId}`, updates)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', dateStr])
      toast.success('Task updated!')
      setEditingTask(null)
      setShowTaskModal(false)
    },
    onError: () => {
      toast.error('Failed to update task')
    }
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      const response = await api.delete(`/schedules/${dateStr}/tasks/${taskId}`)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', dateStr])
      toast.success('Task deleted!')
    },
    onError: () => {
      toast.error('Failed to delete task')
    }
  })

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      console.log('Toggling task:', taskId, 'for date:', dateStr);
      const response = await api.patch(`/schedules/${dateStr}/tasks/${taskId}/toggle`);
      console.log('Toggle response:', response.data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', dateStr]);
      toast.success('Task updated!');
    },
    onError: (error) => {
      console.error('Toggle error:', error);
      toast.error('Failed to update task');
    }
  });

  const handleSaveTimes = () => {
    saveScheduleMutation.mutate({
      date: dateStr,
      wakeTime,
      bedTime,
      tasks: schedule?.tasks || []
    })
  }

  const resetTaskForm = () => {
    setNewTask({
      taskName: '',
      startTime: '',
      endTime: '',
      priority: 'medium',
      notes: ''
    })
  }

  const handleAddTask = () => {
    if (!newTask.taskName || !newTask.startTime || !newTask.endTime) {
      toast.error('Please fill in all required fields')
      return
    }

    if (editingTask) {
      updateTaskMutation.mutate({
        taskId: editingTask._id,
        updates: newTask
      })
    } else {
      addTaskMutation.mutate(newTask)
    }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setNewTask({
      taskName: task.taskName,
      startTime: task.startTime,
      endTime: task.endTime,
      priority: task.priority,
      notes: task.notes || ''
    })
    setShowTaskModal(true)
  }

  const calculateTimelineHours = () => {
    const [wakeHour] = wakeTime.split(':').map(Number)
    const [bedHour] = bedTime.split(':').map(Number)
    const hours = []
    for (let hour = wakeHour; hour <= bedHour; hour++) {
      hours.push(hour)
    }
    return hours
  }

  const getTaskPosition = (task) => {
    const [wakeHour] = wakeTime.split(':').map(Number)
    const [taskStartHour, taskStartMin] = task.startTime.split(':').map(Number)
    const [taskEndHour, taskEndMin] = task.endTime.split(':').map(Number)

    const wakeMinutes = wakeHour * 60
    const taskStartMinutes = taskStartHour * 60 + taskStartMin
    const taskEndMinutes = taskEndHour * 60 + taskEndMin

    const top = ((taskStartMinutes - wakeMinutes) / 60) * 80 // 80px per hour
    const height = ((taskEndMinutes - taskStartMinutes) / 60) * 80

    return { top, height }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc2626' // red
      case 'medium':
        return '#f59e0b' // orange
      case 'low':
        return '#2F6D2F' // green
      default:
        return '#2F6D2F'
    }
  }

  const changeDate = (days) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const timelineHours = calculateTimelineHours()

  if (isLoading) {
    return <div className="schedule-page"><div className="loading">Loading schedule...</div></div>
  }

  return (
    <div className="schedule-page">
      <div className="schedule-header">
        <div className="header-top">
          <h1>Daily Schedule</h1>
          <div className="date-nav">
            <button onClick={() => changeDate(-1)} className="date-btn">
              <ChevronLeft size={20} />
            </button>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="date-input"
            />
            <button onClick={() => changeDate(1)} className="date-btn">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="time-settings">
          <div className="time-group">
            <label>
              <Clock size={18} />
              Wake Time
            </label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
            />
          </div>
          <div className="time-group">
            <label>
              <Clock size={18} />
              Bed Time
            </label>
            <input
              type="time"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
            />
          </div>
          <button
            onClick={handleSaveTimes}
            className="save-times-btn"
            disabled={saveScheduleMutation.isPending}
          >
            Save Times
          </button>
          <button
            onClick={() => {
              resetTaskForm()
              setEditingTask(null)
              setShowTaskModal(true)
            }}
            className="add-task-btn"
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>

        {schedule?.productiveHours > 0 && (
          <div className="productive-hours">
            Productive Hours: <strong>{schedule.productiveHours.toFixed(1)}h</strong>
          </div>
        )}
      </div>

      <div className="timeline-container">
        <div className="timeline">
          <div className="hours-column">
            {timelineHours.map((hour) => (
              <div key={hour} className="hour-slot">
                <span className="hour-label">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          <div className="tasks-column">
            <div className="timeline-grid">
              {timelineHours.map((hour) => (
                <div key={hour} className="hour-line" />
              ))}
            </div>

            <div className="tasks-overlay">
              {schedule?.tasks?.map((task) => {
                const { top, height } = getTaskPosition(task)
                return (
                  <div
                    key={task._id}
                    className={`task-block ${task.completed ? 'completed' : ''}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: getPriorityColor(task.priority),
                      opacity: task.completed ? 0.8 : 1
                    }}
                  >
                    <div className="task-content">
                      <div className="task-header">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Checkbox clicked for task:', task._id);
                            toggleTaskMutation.mutate(task._id);
                          }}
                          className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                          title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {task.completed && <Check size={16} />}
                        </button>
                        <span className="task-time">
                          {task.startTime} - {task.endTime}
                        </span>
                        <div className="task-actions">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="icon-btn"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this task?')) {
                                deleteTaskMutation.mutate(task._id)
                              }
                            }}
                            className="icon-btn"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="task-name">{task.taskName}</div>
                      {task.notes && <div className="task-notes">{task.notes}</div>}
                      <div className="task-duration">{(task.duration / 60).toFixed(1)}h</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
              <button
                onClick={() => {
                  setShowTaskModal(false)
                  setEditingTask(null)
                  resetTaskForm()
                }}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Task Name *</label>
                <input
                  type="text"
                  value={newTask.taskName}
                  onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                  placeholder="Enter task name"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    value={newTask.startTime}
                    onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    value={newTask.endTime}
                    onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <div className="priority-buttons">
                  <button
                    type="button"
                    className={`priority-btn ${newTask.priority === 'low' ? 'active' : ''}`}
                    onClick={() => setNewTask({ ...newTask, priority: 'low' })}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    className={`priority-btn ${newTask.priority === 'medium' ? 'active' : ''}`}
                    onClick={() => setNewTask({ ...newTask, priority: 'medium' })}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    className={`priority-btn ${newTask.priority === 'high' ? 'active' : ''}`}
                    onClick={() => setNewTask({ ...newTask, priority: 'high' })}
                  >
                    High
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  placeholder="Add notes (optional)"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowTaskModal(false)
                  setEditingTask(null)
                  resetTaskForm()
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="submit-btn"
                disabled={addTaskMutation.isPending || updateTaskMutation.isPending}
              >
                {editingTask ? 'Update Task' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedule
