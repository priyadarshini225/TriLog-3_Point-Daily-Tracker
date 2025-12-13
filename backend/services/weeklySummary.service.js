import DailyEntry from '../models/DailyEntry.model.js';
import DailyAnswer from '../models/DailyAnswer.model.js';
import RevisionSchedule from '../models/RevisionSchedule.model.js';
import WeeklySummary from '../models/WeeklySummary.model.js';
import { DEFAULT_RESOURCES } from './resourceCatalog.js';
import { extractSignalsFromEntries, scoreResources } from './signal.service.js';
import { getAiConfigStatus, createChatCompletion } from './ai.service.js';
import { retrieveTopChunksForDateRange, upsertMonthlyEmbeddingChunks } from './rag.service.js';

const parseYmd = (ymd) => {
  const s = String(ymd || '').trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
  // Ensure round-trip.
  if (d.toISOString().slice(0, 10) !== s) return null;
  return d;
};

const toYmd = (d) => new Date(d).toISOString().slice(0, 10);

const startOfUtcDay = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const endOfUtcDay = (d) => {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
};

const getTodayUtc = (now = new Date()) => {
  return startOfUtcDay(now);
};

const getWeekRange = ({ endDateYmd }) => {
  const endDate = endDateYmd ? parseYmd(endDateYmd) : getTodayUtc();
  if (!endDate) {
    const err = new Error('end must be in YYYY-MM-DD format');
    err.statusCode = 400;
    throw err;
  }

  const end = startOfUtcDay(endDate);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);

  const startDate = toYmd(start);
  const endDateStr = toYmd(end);

  return {
    start,
    end,
    startDate,
    endDate: endDateStr,
    weekStartDate: startDate,
    weekEndDate: endDateStr,
  };
};

const safeJsonParse = (text) => {
  if (!text) return null;
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
};

const coerceStringArray = (value, max = 12) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .slice(0, max);
};

const buildRecommendations = ({ signals }) => {
  const scored = scoreResources({ resources: DEFAULT_RESOURCES, signals });
  return scored
    .filter((r) => (r.score || 0) > 0)
    .slice(0, 6)
    .map((r) => ({
      title: r.title,
      url: r.url,
      tags: r.tags || [],
      score: r.score || 0,
      reason: r.reasonTemplate || 'Matches your recent focus areas.',
    }));
};

const computeWeeklyEvaluation = ({ stats, signals }) => {
  const whatWorked = [];
  const whatToImprove = [];
  const nextWeekFocus = [];

  const entryDays = stats?.entryDays || 0;
  const completionRate = Number(stats?.revisionsCompletionRate || 0);

  if (entryDays >= 6) whatWorked.push('Excellent consistency this week — keep the streak mindset.');
  else if (entryDays >= 4) whatWorked.push('Good cadence — try to avoid 2+ day gaps.');
  else whatToImprove.push('Increase consistency: aim for 5–7 days of short entries next week.');

  if ((stats?.reviseItemsCreated || 0) > 0) whatWorked.push('You captured revise-later items, which makes review sessions effective.');
  else whatToImprove.push('Add at least 1 revise-later item on days you learn something non-trivial.');

  if ((stats?.revisionsScheduled || 0) > 0 && completionRate >= 0.6) whatWorked.push('Revision follow-through was strong.');
  else if ((stats?.revisionsScheduled || 0) > 0) whatToImprove.push('Complete more scheduled revisions — set a fixed 15–20 min daily slot.');

  const focus = [
    ...(signals?.algorithms || []).slice(0, 4),
    ...(signals?.subjects || []).slice(0, 3),
    ...(signals?.topics || []).slice(0, 4),
  ].filter(Boolean);

  if (focus.length) nextWeekFocus.push(`Focus on: ${focus.join(', ')}.`);

  let score = 0;
  score += Math.min(6, Math.round((entryDays / 7) * 6));
  score += Math.min(3, Math.round(completionRate * 3));
  score += Math.min(1, Math.floor((stats?.questionsAnswered || 0) / 5));

  return {
    whatWorked,
    whatToImprove,
    nextWeekFocus,
    score: Math.max(0, Math.min(10, score)),
  };
};

const buildWeeklyRagQuery = ({ startDate, endDate, stats, signals }) => {
  const topSignals = [
    ...(signals?.algorithms || []).slice(0, 6),
    ...(signals?.subjects || []).slice(0, 4),
    ...(signals?.topics || []).slice(0, 6),
    ...(signals?.platforms || []).slice(0, 4),
  ].filter(Boolean);

  return [
    `Create a weekly learning review for ${startDate} to ${endDate}.`,
    `Use these stats: entryDays=${stats?.entryDays || 0}, reviseItemsCreated=${stats?.reviseItemsCreated || 0}, revisionsCompleted=${stats?.revisionsCompleted || 0}, revisionsScheduled=${stats?.revisionsScheduled || 0}, questionsAnswered=${stats?.questionsAnswered || 0}.`,
    topSignals.length ? `Key signals: ${topSignals.join(', ')}.` : '',
    'Give a 7-day revision plan (daily 15–30 minutes) with specific guidance.',
    'Recommend 4-6 platforms/websites/resources with reasons.',
  ]
    .filter(Boolean)
    .join('\n');
};

const listMonthsBetween = (startDate, endDate) => {
  const startMonth = String(startDate).slice(0, 7);
  const endMonth = String(endDate).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(endMonth)) return [];

  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);

  const out = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    if (out.length > 24) break;
  }

  return out;
};

const generateAiWeeklySummary = async ({ userId, startDate, endDate, stats, signals, evaluation, heuristicRecommendations }) => {
  const config = getAiConfigStatus();
  if (!config.ok) {
    const err = new Error(config.reason || 'AI_DISABLED');
    err.statusCode = 503;
    err.details = config;
    throw err;
  }

  // Ensure embeddings exist for months in range so retrieval works.
  const months = listMonthsBetween(startDate, endDate);
  for (const m of months) {
    // best-effort; errors bubble (we want to know if embeddings fail)
    // eslint-disable-next-line no-await-in-loop
    await upsertMonthlyEmbeddingChunks({ userId, month: m });
  }

  const ragQuery = buildWeeklyRagQuery({ startDate, endDate, stats, signals });
  const topChunks = await retrieveTopChunksForDateRange({ userId, startDate, endDate, queryText: ragQuery, topK: 14 });

  const resources = DEFAULT_RESOURCES.map((r) => ({ title: r.title, url: r.url, tags: r.tags || [] }));

  const messages = [
    {
      role: 'system',
      content:
        'You are TriLog AI Coach. Output MUST be valid JSON only (no markdown). Be specific and actionable; do not invent facts that are not in the provided context/stats.',
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          task: 'Weekly learning summary + effectiveness + 7-day revision plan + resource recommendations',
          period: { startDate, endDate },
          stats,
          signals,
          evaluationDraft: evaluation,
          contextSnippets: topChunks,
          resourceCatalog: resources,
          outputSchema: {
            narrative: 'string (short paragraph)',
            keyLearnings: 'string[] (3-8)',
            evaluation: {
              whatWorked: 'string[] (2-6)',
              whatToImprove: 'string[] (2-6)',
              nextWeekFocus: 'string[] (2-6)',
              score: 'number 0-10',
            },
            revisionPlan: 'string[] (7 items, Day 1..Day 7, each actionable)',
            recommendations: [
              { title: 'string', url: 'string', reason: 'string', tags: 'string[]', score: 'number(optional)' },
            ],
          },
          constraints: [
            'Do NOT invent events or achievements.',
            'Use only facts supported by stats/signals/context; otherwise label as a hypothesis.',
          ],
          fallbackRecommendations: heuristicRecommendations,
        },
        null,
        2
      ),
    },
  ];

  const { content } = await createChatCompletion({ messages, temperature: 0.2 });
  const parsed = safeJsonParse(content);
  if (!parsed || typeof parsed !== 'object') {
    const err = new Error('AI_OUTPUT_INVALID');
    err.statusCode = 502;
    throw err;
  }

  const narrative = String(parsed.narrative || '').trim();
  const keyLearnings = coerceStringArray(parsed.keyLearnings, 10);

  const evalObj = parsed.evaluation || {};
  const aiEvaluation = {
    whatWorked: coerceStringArray(evalObj.whatWorked, 10),
    whatToImprove: coerceStringArray(evalObj.whatToImprove, 10),
    nextWeekFocus: coerceStringArray(evalObj.nextWeekFocus, 10),
    score: Number.isFinite(Number(evalObj.score)) ? Math.max(0, Math.min(10, Number(evalObj.score))) : evaluation.score,
  };

  const revisionPlan = coerceStringArray(parsed.revisionPlan, 7);

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .map((r) => ({
          title: String(r?.title || '').trim(),
          url: String(r?.url || '').trim(),
          reason: String(r?.reason || '').trim(),
          tags: coerceStringArray(r?.tags, 10),
          score: Number.isFinite(Number(r?.score)) ? Number(r.score) : 0,
        }))
        .filter((r) => r.title && r.url && r.reason)
        .slice(0, 6)
    : [];

  const blendedRecommendations = recommendations.length >= 3
    ? recommendations
    : [...recommendations, ...heuristicRecommendations].slice(0, 6);

  return {
    narrative,
    keyLearnings,
    evaluation: {
      whatWorked: aiEvaluation.whatWorked.length ? aiEvaluation.whatWorked : evaluation.whatWorked,
      whatToImprove: aiEvaluation.whatToImprove.length ? aiEvaluation.whatToImprove : evaluation.whatToImprove,
      nextWeekFocus: aiEvaluation.nextWeekFocus.length ? aiEvaluation.nextWeekFocus : evaluation.nextWeekFocus,
      score: aiEvaluation.score,
    },
    revisionPlan,
    recommendations: blendedRecommendations,
  };
};

const buildHeuristicNarrative = ({ startDate, endDate, stats, evaluation }) => {
  const lines = [];
  lines.push(`Weekly review for ${startDate} to ${endDate}.`);
  lines.push(`You logged ${stats?.entryDays || 0} entry day(s) and answered ${stats?.questionsAnswered || 0} daily question(s).`);
  lines.push(`You created ${stats?.reviseItemsCreated || 0} revise-later item(s) and completed ${stats?.revisionsCompleted || 0}/${stats?.revisionsScheduled || 0} scheduled revision(s).`);
  if ((evaluation?.whatWorked || []).length) lines.push(`What worked: ${evaluation.whatWorked[0]}`);
  if ((evaluation?.whatToImprove || []).length) lines.push(`Improve: ${evaluation.whatToImprove[0]}`);
  return lines.join(' ');
};

export const generateWeeklySummaryForUser = async ({ userId, end, upsert = true, mode }) => {
  const { start, end: endUtc, startDate, endDate, weekStartDate, weekEndDate } = getWeekRange({ endDateYmd: end });

  const entries = await DailyEntry.find({ userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).lean();
  const reviseItemsCreated = entries.reduce((sum, e) => sum + (e.reviseLater?.length || 0), 0);

  const revisionsScheduled = await RevisionSchedule.countDocuments({ userId, scheduledAt: { $gte: startOfUtcDay(start), $lte: endOfUtcDay(endUtc) } });
  const revisionsCompleted = await RevisionSchedule.countDocuments({ userId, status: 'completed', completedAt: { $gte: startOfUtcDay(start), $lte: endOfUtcDay(endUtc) } });
  const questionsAnswered = await DailyAnswer.countDocuments({ userId, createdAt: { $gte: startOfUtcDay(start), $lte: endOfUtcDay(endUtc) } });

  const signals = extractSignalsFromEntries(entries);

  const stats = {
    entryDays: entries.length,
    reviseItemsCreated,
    revisionsScheduled,
    revisionsCompleted,
    revisionsCompletionRate: revisionsScheduled > 0 ? revisionsCompleted / revisionsScheduled : 0,
    questionsAnswered,
  };

  const hasAnyActivity =
    (stats.entryDays || 0) > 0 ||
    (stats.questionsAnswered || 0) > 0 ||
    (stats.revisionsScheduled || 0) > 0 ||
    (stats.revisionsCompleted || 0) > 0 ||
    (stats.reviseItemsCreated || 0) > 0;

  if (!hasAnyActivity) {
    const err = new Error('No past performances to summarize for the last 7 days.');
    err.statusCode = 404;
    err.errorCode = 'NO_ACTIVITY';
    err.details = { startDate, endDate };
    throw err;
  }

  const evaluation = computeWeeklyEvaluation({ stats, signals });
  const heuristicRecommendations = buildRecommendations({ signals });

  const requestedMode = String(mode || '').trim().toLowerCase();
  const aiConfig = getAiConfigStatus();
  const effectiveMode = requestedMode || (aiConfig.ok ? 'ai' : 'heuristic');

  let narrative = '';
  let keyLearnings = [];
  let generator = 'heuristic';
  let recommendations = heuristicRecommendations;
  let finalEvaluation = evaluation;

  // Not stored in schema yet, but we still generate and include it in return payload.
  let revisionPlan = [];

  if (effectiveMode === 'ai' || effectiveMode === 'ai-rag') {
    if (!aiConfig.ok) {
      const err = new Error(aiConfig.reason || 'AI_DISABLED');
      err.statusCode = 503;
      err.details = aiConfig;
      throw err;
    }

    const ai = await generateAiWeeklySummary({
      userId,
      startDate,
      endDate,
      stats,
      signals,
      evaluation,
      heuristicRecommendations,
    });

    narrative = ai.narrative;
    keyLearnings = ai.keyLearnings;
    finalEvaluation = ai.evaluation;
    recommendations = ai.recommendations;
    revisionPlan = ai.revisionPlan;
    generator = 'ai-rag';
  } else {
    narrative = buildHeuristicNarrative({ startDate, endDate, stats, evaluation });
    keyLearnings = (signals?.highlights || []).slice(0, 8);
  }

  const doc = {
    userId,
    weekStartDate,
    weekEndDate,
    period: { startDate, endDate },
    stats,
    narrative,
    keyLearnings,
    signals,
    evaluation: finalEvaluation,
    recommendations,
    generator,
    generatedAt: new Date(),
  };

  let saved;
  if (upsert) {
    saved = await WeeklySummary.findOneAndUpdate({ userId, weekStartDate }, { $set: doc }, { upsert: true, new: true }).lean();
  } else {
    const created = await WeeklySummary.create(doc);
    saved = created.toObject();
  }

  return { ...saved, revisionPlan };
};

export const listWeeklySummaries = async ({ userId, limit = 24 }) => {
  return await WeeklySummary.find({ userId }).sort({ weekStartDate: -1 }).limit(limit).lean();
};

export const getWeeklySummary = async ({ userId, weekStartDate }) => {
  return await WeeklySummary.findOne({ userId, weekStartDate }).lean();
};

export const markWeeklySummaryEmailed = async ({ userId, weekStartDate }) => {
  return await WeeklySummary.updateOne({ userId, weekStartDate }, { $set: { emailedAt: new Date() } });
};
