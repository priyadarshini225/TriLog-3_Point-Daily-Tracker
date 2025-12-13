import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subMonths } from 'date-fns'
import { AlertTriangle, ExternalLink, FileText, RefreshCw, Sparkles } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import './Summaries.css'

const buildErrorMessage = (error) => {
  const apiMessage = error?.response?.data?.message
  const details = error?.response?.data?.details

  if (apiMessage && details?.missing?.length) {
    return `${apiMessage} (Missing: ${details.missing.join(', ')})`
  }

  return apiMessage || error?.message || 'Something went wrong'
}

function Summaries() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const currentMonth = format(new Date(), 'yyyy-MM')
  const [month, setMonth] = useState(currentMonth)
  const [mode, setMode] = useState('ai')

  const [weekStartDate, setWeekStartDate] = useState('')

  const monthOptions = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }).map((_, i) => format(subMonths(now, i), 'yyyy-MM'))
  }, [])

  const summariesQuery = useQuery({
    queryKey: ['summaries', userId],
    queryFn: async () => {
      const res = await api.get('/summaries?limit=24')
      return res.data?.summaries || []
    },
    enabled: !!userId,
  })

  const weeklySummariesQuery = useQuery({
    queryKey: ['weeklySummaries', userId],
    queryFn: async () => {
      const res = await api.get('/summaries/weekly?limit=24')
      const list = res.data?.summaries || []
      return Array.isArray(list) ? list : []
    },
    enabled: !!userId,
  })

  const summaryQuery = useQuery({
    queryKey: ['summary', userId, month],
    queryFn: async () => {
      const res = await api.get(`/summaries/${month}`)
      return res.data?.summary
    },
    enabled: !!userId && !!month,
    retry: false,
  })

  const weeklySummaryQuery = useQuery({
    queryKey: ['weeklySummary', userId, weekStartDate],
    queryFn: async () => {
      const res = await api.get(`/summaries/weekly/${weekStartDate}`)
      return res.data?.summary
    },
    enabled: !!userId && !!weekStartDate,
    retry: false,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const qs = new URLSearchParams({ month })
      if (mode) qs.set('mode', mode)
      const res = await api.post(`/summaries/generate?${qs.toString()}`)
      return res.data?.summary
    },
    onSuccess: (summary) => {
      queryClient.setQueryData(['summary', userId, month], summary)
      queryClient.invalidateQueries({ queryKey: ['summaries', userId] })
    },
  })

  const generateWeeklyMutation = useMutation({
    mutationFn: async () => {
      const qs = new URLSearchParams()
      if (mode) qs.set('mode', mode)
      const res = await api.post(`/summaries/weekly/generate?${qs.toString()}`)
      return res.data?.summary
    },
    onSuccess: (summary) => {
      if (summary?.weekStartDate) setWeekStartDate(summary.weekStartDate)
      queryClient.setQueryData(['weeklySummary', userId, summary?.weekStartDate], summary)
      queryClient.invalidateQueries({ queryKey: ['weeklySummaries', userId] })
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['summary', userId, month] })
    await queryClient.invalidateQueries({ queryKey: ['summaries', userId] })
  }

  const refreshWeekly = async () => {
    await queryClient.invalidateQueries({ queryKey: ['weeklySummary', userId, weekStartDate] })
    await queryClient.invalidateQueries({ queryKey: ['weeklySummaries', userId] })
  }

  const isNotFound = summaryQuery.error?.response?.status === 404
  const summary = summaryQuery.data

  const weeklyList = weeklySummariesQuery.data || []
  const hasWeeklyList = Array.isArray(weeklyList) && weeklyList.length > 0
  const weeklyNotFound = weeklySummaryQuery.error?.response?.status === 404
  const weeklySummary = weeklySummaryQuery.data

  // Initialize selected week to most recent once list loads.
  if (!weekStartDate && hasWeeklyList) {
    const newest = weeklyList[0]
    if (newest?.weekStartDate) setWeekStartDate(newest.weekStartDate)
  }

  return (
    <div className="summaries">
      <div className="summaries-header">
        <div>
          <h1 className="page-title">Summaries</h1>
          <p className="page-subtitle">Monthly review + weekly update (last 7 days)</p>
        </div>
      </div>

      <div className="card summaries-controls">
        <div className="controls-grid">
          <div>
            <label className="label">Month</label>
            <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Generator</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="ai">AI (RAG)</option>
              <option value="heuristic">Basic (no AI)</option>
            </select>
          </div>

          <div className="controls-actions">
            <button
              className="btn btn-primary"
              onClick={() => generateMutation.mutate()}
              disabled={!month || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <span className="loading-spinner" />
              ) : (
                <Sparkles size={18} />
              )}
              Generate
            </button>

            <button className="btn btn-secondary" onClick={refresh} disabled={summaryQuery.isFetching}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {(summaryQuery.isError && !isNotFound) && (
          <div className="summaries-error">
            <AlertTriangle size={18} />
            <span>{buildErrorMessage(summaryQuery.error)}</span>
          </div>
        )}

        {generateMutation.isError && (
          <div className="summaries-error">
            <AlertTriangle size={18} />
            <span>{buildErrorMessage(generateMutation.error)}</span>
          </div>
        )}
      </div>

      <div className="summaries-body">
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title-inline">
              <FileText size={18} />
              {month}
            </h3>
            <div className="muted">{summary?.generator ? `Generator: ${summary.generator}` : ''}</div>
          </div>

          {summaryQuery.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : isNotFound ? (
            <div className="empty-state">
              <p>No summary exists for this month yet.</p>
              <p className="muted">Click Generate to create it.</p>
            </div>
          ) : summary ? (
            <div className="summary-content">
              {summary.narrative ? (
                <div className="summary-section">
                  <h4>Summary</h4>
                  <p className="summary-narrative">{summary.narrative}</p>
                </div>
              ) : null}

              {Array.isArray(summary.keyLearnings) && summary.keyLearnings.length > 0 ? (
                <div className="summary-section">
                  <h4>Key learnings</h4>
                  <ul className="bullets">
                    {summary.keyLearnings.map((k, idx) => (
                      <li key={`${k}-${idx}`}>{k}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.evaluation ? (
                <div className="summary-section">
                  <div className="eval-grid">
                    <div>
                      <h4>What worked</h4>
                      <ul className="bullets">
                        {(summary.evaluation.whatWorked || []).map((t, idx) => (
                          <li key={`${t}-${idx}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Improve</h4>
                      <ul className="bullets">
                        {(summary.evaluation.whatToImprove || []).map((t, idx) => (
                          <li key={`${t}-${idx}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Next focus</h4>
                      <ul className="bullets">
                        {(summary.evaluation.nextMonthFocus || []).map((t, idx) => (
                          <li key={`${t}-${idx}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="score-row">
                    <span className="muted">Effectiveness score</span>
                    <span className="score">{Number.isFinite(Number(summary.evaluation.score)) ? summary.evaluation.score : 0}/10</span>
                  </div>
                </div>
              ) : null}

              {Array.isArray(summary.recommendations) && summary.recommendations.length > 0 ? (
                <div className="summary-section">
                  <h4>Recommended resources</h4>
                  <div className="recs-grid">
                    {summary.recommendations.map((r, idx) => (
                      <a
                        key={`${r.title}-${idx}`}
                        className="rec-card"
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div className="rec-title">
                          <span>{r.title}</span>
                          <ExternalLink size={16} />
                        </div>
                        <div className="rec-reason">{r.reason}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {summary.stats ? (
                <div className="summary-section">
                  <h4>Stats</h4>
                  <div className="stats-grid">
                    <div className="stat"><span className="muted">Entry days</span><span>{summary.stats.entryDays || 0}</span></div>
                    <div className="stat"><span className="muted">Questions answered</span><span>{summary.stats.questionsAnswered || 0}</span></div>
                    <div className="stat"><span className="muted">Revise items created</span><span>{summary.stats.reviseItemsCreated || 0}</span></div>
                    <div className="stat"><span className="muted">Revisions completed</span><span>{summary.stats.revisionsCompleted || 0}</span></div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <p>No data.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title-inline">Recent generated months</h3>
            <div className="muted">Up to 24</div>
          </div>

          {summariesQuery.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : (
            <div className="recent-list">
              {(summariesQuery.data || []).length === 0 ? (
                <div className="empty-state">
                  <p>No summaries yet.</p>
                </div>
              ) : (
                (summariesQuery.data || []).map((s) => (
                  <button
                    key={s._id}
                    className={`recent-item ${s.month === month ? 'active' : ''}`}
                    onClick={() => setMonth(s.month)}
                  >
                    <div className="recent-month">{s.month}</div>
                    <div className="muted">{s.generator || 'heuristic'}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="weekly-divider" />

      <div className="summaries-body">
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title-inline">
              <FileText size={18} />
              Weekly update
            </h3>
            <div className="muted">{weeklySummary?.generator ? `Generator: ${weeklySummary.generator}` : ''}</div>
          </div>

          <div className="weekly-actions">
            <button
              className="btn btn-primary"
              onClick={() => generateWeeklyMutation.mutate()}
              disabled={generateWeeklyMutation.isPending}
            >
              {generateWeeklyMutation.isPending ? <span className="loading-spinner" /> : <Sparkles size={18} />}
              Generate (last 7 days)
            </button>
            <button className="btn btn-secondary" onClick={refreshWeekly} disabled={weeklySummaryQuery.isFetching}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          {generateWeeklyMutation.isError && (
            <div className="summaries-error">
              <AlertTriangle size={18} />
              <span>{buildErrorMessage(generateWeeklyMutation.error)}</span>
            </div>
          )}

          {(weeklySummaryQuery.isError && !weeklyNotFound) && (
            <div className="summaries-error">
              <AlertTriangle size={18} />
              <span>{buildErrorMessage(weeklySummaryQuery.error)}</span>
            </div>
          )}

          {weeklySummaryQuery.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : !hasWeeklyList ? (
            <div className="empty-state">
              <p>No weekly summaries yet.</p>
              <p className="muted">Click Generate to create one for the last 7 days.</p>
            </div>
          ) : weeklyNotFound ? (
            <div className="empty-state">
              <p>No summary exists for that week.</p>
            </div>
          ) : weeklySummary ? (
            <div className="summary-content">
              <div className="muted">
                Period: {weeklySummary?.period?.startDate} → {weeklySummary?.period?.endDate}
              </div>

              {weeklySummary.narrative ? (
                <div className="summary-section">
                  <h4>Summary</h4>
                  <p className="summary-narrative">{weeklySummary.narrative}</p>
                </div>
              ) : null}

              {Array.isArray(weeklySummary.keyLearnings) && weeklySummary.keyLearnings.length > 0 ? (
                <div className="summary-section">
                  <h4>Key learnings</h4>
                  <ul className="bullets">
                    {weeklySummary.keyLearnings.map((k, idx) => (
                      <li key={`${k}-${idx}`}>{k}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {weeklySummary.evaluation ? (
                <div className="summary-section">
                  <div className="eval-grid">
                    <div>
                      <h4>What worked</h4>
                      <ul className="bullets">
                        {(weeklySummary.evaluation.whatWorked || []).map((t, idx) => (
                          <li key={`${t}-${idx}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Improve</h4>
                      <ul className="bullets">
                        {(weeklySummary.evaluation.whatToImprove || []).map((t, idx) => (
                          <li key={`${t}-${idx}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Next week focus</h4>
                      <ul className="bullets">
                        {(weeklySummary.evaluation.nextWeekFocus || []).map((t, idx) => (
                          <li key={`${t}-${idx}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="score-row">
                    <span className="muted">Effectiveness score</span>
                    <span className="score">
                      {Number.isFinite(Number(weeklySummary.evaluation.score)) ? weeklySummary.evaluation.score : 0}/10
                    </span>
                  </div>
                </div>
              ) : null}

              {Array.isArray(weeklySummary.revisionPlan) && weeklySummary.revisionPlan.length > 0 ? (
                <div className="summary-section">
                  <h4>7-day revision plan</h4>
                  <ul className="bullets">
                    {weeklySummary.revisionPlan.map((t, idx) => (
                      <li key={`${t}-${idx}`}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(weeklySummary.recommendations) && weeklySummary.recommendations.length > 0 ? (
                <div className="summary-section">
                  <h4>Recommended resources</h4>
                  <div className="recs-grid">
                    {weeklySummary.recommendations.map((r, idx) => (
                      <a
                        key={`${r.title}-${idx}`}
                        className="rec-card"
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div className="rec-title">
                          <span>{r.title}</span>
                          <ExternalLink size={16} />
                        </div>
                        <div className="rec-reason">{r.reason}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {weeklySummary.stats ? (
                <div className="summary-section">
                  <h4>Stats</h4>
                  <div className="stats-grid">
                    <div className="stat"><span className="muted">Entry days</span><span>{weeklySummary.stats.entryDays || 0}</span></div>
                    <div className="stat"><span className="muted">Questions answered</span><span>{weeklySummary.stats.questionsAnswered || 0}</span></div>
                    <div className="stat"><span className="muted">Revise items created</span><span>{weeklySummary.stats.reviseItemsCreated || 0}</span></div>
                    <div className="stat"><span className="muted">Revisions completed</span><span>{weeklySummary.stats.revisionsCompleted || 0}</span></div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <p>No data.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title-inline">Recent generated weeks</h3>
            <div className="muted">Up to 24</div>
          </div>

          {weeklySummariesQuery.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : (
            <div className="recent-list">
              {!hasWeeklyList ? (
                <div className="empty-state">
                  <p>No weekly summaries yet.</p>
                </div>
              ) : (
                weeklyList.map((s) => (
                  <button
                    key={s._id}
                    className={`recent-item ${s.weekStartDate === weekStartDate ? 'active' : ''}`}
                    onClick={() => setWeekStartDate(s.weekStartDate)}
                  >
                    <div className="recent-month">{s.weekStartDate}</div>
                    <div className="muted">{s.generator || 'heuristic'}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Summaries
