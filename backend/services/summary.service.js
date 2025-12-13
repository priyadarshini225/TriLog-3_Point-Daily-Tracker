import DailyEntry from '../models/DailyEntry.model.js';
import DailyAnswer from '../models/DailyAnswer.model.js';
import RevisionSchedule from '../models/RevisionSchedule.model.js';
import MonthlySummary from '../models/MonthlySummary.model.js';
import { extractSignalsFromEntries, scoreResources } from './signal.service.js';
import { DEFAULT_RESOURCES } from './resourceCatalog.js';
import { getAiConfigStatus, createChatCompletion } from './ai.service.js';
import { retrieveTopChunks, upsertMonthlyEmbeddingChunks } from './rag.service.js';

const monthToDateRange = (month) => {
  const match = String(month || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  const toYmd = (d) => d.toISOString().slice(0, 10);
  return { start, end, startDate: toYmd(start), endDate: toYmd(end) };
};

const computeEvaluation = ({ stats, signals }) => {
  const whatWorked = [];
  const whatToImprove = [];
  const nextMonthFocus = [];

  const completionRate = Number(stats?.revisionsCompletionRate || 0);

  if ((stats?.entryDays || 0) >= 20) {
    whatWorked.push('Consistent daily entries built momentum and made progress visible.');
  } else if ((stats?.entryDays || 0) >= 10) {
    whatWorked.push('You maintained a steady cadence; keep reducing gaps between entry days.');
  } else {
    whatToImprove.push('Increase consistency: aim for smaller daily notes rather than skipping days.');
  }

  if ((stats?.reviseItemsCreated || 0) > 0) {
    whatWorked.push('You captured revision items, which is key for spaced repetition.');
  } else {
    whatToImprove.push('Add at least 1 “revise later” item when you learn something non-trivial.');
  }

  if (completionRate >= 0.7) {
    whatWorked.push('Revision follow-through was strong; spaced repetition is working.');
  } else if (completionRate >= 0.4) {
    whatToImprove.push('Try to complete more scheduled revisions; this is where retention improves.');
  } else if ((stats?.revisionsScheduled || 0) > 0) {
    whatToImprove.push('Revisions are being scheduled but rarely completed—reduce scope or set a fixed daily time.');
  }

  if ((stats?.questionsAnswered || 0) >= 15) {
    whatWorked.push('Daily reflection questions were answered frequently, supporting metacognition.');
  }

  const topFocus = [
    ...(signals?.algorithms || []).slice(0, 3),
    ...(signals?.subjects || []).slice(0, 2),
  ].filter(Boolean);

  if (topFocus.length) {
    nextMonthFocus.push(`Focus on: ${topFocus.join(', ')}.`);
  }

  // Score (0-10)
  let score = 0;
  score += Math.min(5, Math.floor((stats?.entryDays || 0) / 6));
  score += Math.min(3, Math.round(completionRate * 3));
  score += Math.min(2, Math.floor((stats?.questionsAnswered || 0) / 10));

  return {
    whatWorked,
    whatToImprove,
    nextMonthFocus,
    score: Math.max(0, Math.min(10, score)),
  };
};

const buildRecommendations = ({ signals }) => {
  const scored = scoreResources({ resources: DEFAULT_RESOURCES, signals });

  return scored
    .filter((r) => (r.score || 0) > 0)
    .slice(0, 5)
    .map((r) => {
      const reasonBits = [];
      if ((signals?.platforms || []).includes(r.title)) {
        reasonBits.push('You already used this platform recently.');
      }
      if (r.reasonTemplate) reasonBits.push(r.reasonTemplate);

      return {
        title: r.title,
        url: r.url,
        tags: r.tags || [],
        score: r.score || 0,
        reason: reasonBits.join(' '),
      };
    });
};

const safeJsonParse = (text) => {
  if (!text) return null;
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to extract JSON from a fenced block.
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

const normalizeRecommendations = ({ recs, fallbackSignals }) => {
  if (!Array.isArray(recs)) return [];
  const out = [];
  for (const r of recs) {
    const title = String(r?.title || '').trim();
    const url = String(r?.url || '').trim();
    const reason = String(r?.reason || '').trim();
    if (!title || !url || !reason) continue;
    out.push({
      title,
      url,
      reason,
      tags: coerceStringArray(r?.tags, 10),
      score: Number.isFinite(Number(r?.score)) ? Number(r.score) : 0,
    });
  }

  // Keep it tight.
  return out.slice(0, 6);
};

const buildHeuristicNarrative = ({ month, stats, signals, evaluation }) => {
  const focus = [
    ...(signals?.algorithms || []).slice(0, 4),
    ...(signals?.subjects || []).slice(0, 3),
    ...(signals?.topics || []).slice(0, 4),
  ].filter(Boolean);

  const lines = [];
  lines.push(`Monthly review for ${month}.`);
  lines.push(`You logged ${stats?.entryDays || 0} day(s) of entries and answered ${stats?.questionsAnswered || 0} daily question(s).`);
  lines.push(`You created ${stats?.reviseItemsCreated || 0} revise-later item(s) and completed ${stats?.revisionsCompleted || 0}/${stats?.revisionsScheduled || 0} scheduled revision(s).`);
  if (focus.length) lines.push(`Main themes: ${focus.join(', ')}.`);
  if ((evaluation?.whatWorked || []).length) lines.push(`What worked: ${evaluation.whatWorked[0]}`);
  if ((evaluation?.whatToImprove || []).length) lines.push(`Next improvement: ${evaluation.whatToImprove[0]}`);
  return lines.join(' ');
};

const buildRagQuery = ({ month, signals, stats }) => {
  const topSignals = [
    ...(signals?.algorithms || []).slice(0, 6),
    ...(signals?.subjects || []).slice(0, 4),
    ...(signals?.topics || []).slice(0, 6),
    ...(signals?.platforms || []).slice(0, 4),
  ].filter(Boolean);

  return [
    `Summarize what I learned in ${month} from my daily logs and reflections.`,
    `Evaluate my approach and suggest specific improvements based on these stats: entryDays=${stats?.entryDays || 0}, reviseItemsCreated=${stats?.reviseItemsCreated || 0}, revisionsCompleted=${stats?.revisionsCompleted || 0}, revisionsScheduled=${stats?.revisionsScheduled || 0}, questionsAnswered=${stats?.questionsAnswered || 0}.`,
    topSignals.length ? `Key signals: ${topSignals.join(', ')}.` : '',
    'Recommend 4-6 platforms/websites/resources that fit my month, with reasons.',
  ]
    .filter(Boolean)
    .join('\n');
};

const generateAiMonthlySummary = async ({ userId, month, period, stats, signals, evaluation, heuristicRecommendations }) => {
  const config = getAiConfigStatus();
  if (!config.ok) {
    const err = new Error(config.reason || 'AI_DISABLED');
    err.statusCode = 503;
    err.details = config;
    throw err;
  }

  // Build/refresh embeddings for the month then retrieve relevant context.
  await upsertMonthlyEmbeddingChunks({ userId, month });

  const ragQuery = buildRagQuery({ month, signals, stats });
  const topChunks = await retrieveTopChunks({ userId, month, queryText: ragQuery, topK: 12 });

  const context = topChunks
    .map((c, idx) => {
      const date = c.date ? ` (${c.date})` : '';
      return `#${idx + 1}${date} [${c.sourceType}] ${c.text}`;
    })
    .join('\n');

  const resources = DEFAULT_RESOURCES.map((r) => ({ title: r.title, url: r.url, tags: r.tags || [] }));

  const messages = [
    {
      role: 'system',
      content:
        'You are TriLog AI Coach. Produce a helpful, specific monthly review. Output MUST be valid JSON only (no markdown), matching the schema described by the user message.',
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          task:
            'Create an end-of-month learning summary and effectiveness evaluation. Use the provided context snippets (RAG) and stats. Recommend resources from the provided catalog (or close matches).',
          month,
          period,
          stats,
          signals,
          evaluationDraft: evaluation,
          contextSnippets: topChunks,
          resourceCatalog: resources,
          outputSchema: {
            narrative: 'string (short paragraph)',
            keyLearnings: 'string[] (3-8 items)',
            evaluation: {
              whatWorked: 'string[] (2-6)',
              whatToImprove: 'string[] (2-6)',
              nextMonthFocus: 'string[] (2-6)',
              score: 'number 0-10',
            },
            recommendations: [
              {
                title: 'string',
                url: 'string',
                reason: 'string (specific to my month)',
                tags: 'string[]',
                score: 'number (optional)',
              },
            ],
          },
          constraints: [
            'Use only facts that are present in the stats/signals/context; if uncertain, phrase as a hypothesis.',
            'Do NOT invent daily events or achievements.',
            'Prefer recommendations that match the topics/signals.',
            'Keep narrative concise and actionable.',
          ],
          rawContextText: context,
          fallbackRecommendations: heuristicRecommendations,
        },
        null,
        2
      ),
    },
  ];

  const { model, content } = await createChatCompletion({ messages, temperature: 0.2 });
  const parsed = safeJsonParse(content);

  if (!parsed || typeof parsed !== 'object') {
    const err = new Error('AI_OUTPUT_INVALID');
    err.statusCode = 502;
    err.details = { model, sample: String(content || '').slice(0, 800) };
    throw err;
  }

  const narrative = String(parsed.narrative || '').trim();
  const keyLearnings = coerceStringArray(parsed.keyLearnings, 10);

  const evalObj = parsed.evaluation || {};
  const aiEvaluation = {
    whatWorked: coerceStringArray(evalObj.whatWorked, 10),
    whatToImprove: coerceStringArray(evalObj.whatToImprove, 10),
    nextMonthFocus: coerceStringArray(evalObj.nextMonthFocus, 10),
    score: Number.isFinite(Number(evalObj.score)) ? Math.max(0, Math.min(10, Number(evalObj.score))) : evaluation.score,
  };

  const recommendations = normalizeRecommendations({ recs: parsed.recommendations, fallbackSignals: signals });

  // If model returns too few, blend in heuristic as fallback (still real).
  const blendedRecommendations = recommendations.length >= 3 ? recommendations : [...recommendations, ...heuristicRecommendations].slice(0, 6);

  return {
    model,
    narrative,
    keyLearnings,
    evaluation: {
      ...evaluation,
      ...aiEvaluation,
      whatWorked: aiEvaluation.whatWorked.length ? aiEvaluation.whatWorked : evaluation.whatWorked,
      whatToImprove: aiEvaluation.whatToImprove.length ? aiEvaluation.whatToImprove : evaluation.whatToImprove,
      nextMonthFocus: aiEvaluation.nextMonthFocus.length ? aiEvaluation.nextMonthFocus : evaluation.nextMonthFocus,
    },
    recommendations: blendedRecommendations,
  };
};

export const generateMonthlySummaryForUser = async ({ userId, month, upsert = true, mode }) => {
  const range = monthToDateRange(month);
  if (!range) {
    const error = new Error('Month must be in YYYY-MM format');
    error.statusCode = 400;
    throw error;
  }

  const { start, end, startDate, endDate } = range;

  // Entries are stored with date as YYYY-MM-DD string.
  const entries = await DailyEntry.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();

  const reviseItemsCreated = entries.reduce((sum, e) => sum + (e.reviseLater?.length || 0), 0);

  const revisionsScheduled = await RevisionSchedule.countDocuments({
    userId,
    scheduledAt: { $gte: start, $lte: end },
  });

  const revisionsCompleted = await RevisionSchedule.countDocuments({
    userId,
    status: 'completed',
    completedAt: { $gte: start, $lte: end },
  });

  const questionsAnswered = await DailyAnswer.countDocuments({
    userId,
    createdAt: { $gte: start, $lte: end },
  });

  const signals = extractSignalsFromEntries(entries);
  const stats = {
    entryDays: entries.length,
    reviseItemsCreated,
    revisionsScheduled,
    revisionsCompleted,
    revisionsCompletionRate: revisionsScheduled > 0 ? revisionsCompleted / revisionsScheduled : 0,
    questionsAnswered,
  };

  const evaluation = computeEvaluation({ stats, signals });
  const heuristicRecommendations = buildRecommendations({ signals });

  const requestedMode = String(mode || '').trim().toLowerCase();
  const aiConfig = getAiConfigStatus();

  // mode:
  // - 'ai' (or 'ai-rag'): require AI configured; error if not.
  // - 'heuristic': always generate without AI
  // - ''/undefined: auto -> AI if enabled/configured else heuristic
  const effectiveMode = requestedMode || (aiConfig.ok ? 'ai' : 'heuristic');

  let narrative = '';
  let keyLearnings = [];
  let generator = 'heuristic';
  let recommendations = heuristicRecommendations;
  let finalEvaluation = evaluation;

  if (effectiveMode === 'ai' || effectiveMode === 'ai-rag') {
    if (!aiConfig.ok) {
      const err = new Error(aiConfig.reason || 'AI_DISABLED');
      err.statusCode = 503;
      err.details = aiConfig;
      throw err;
    }

    const ai = await generateAiMonthlySummary({
      userId,
      month,
      period: { startDate, endDate },
      stats,
      signals,
      evaluation,
      heuristicRecommendations,
    });

    narrative = ai.narrative;
    keyLearnings = ai.keyLearnings;
    generator = 'ai-rag';
    recommendations = ai.recommendations;
    finalEvaluation = ai.evaluation;
  } else {
    narrative = buildHeuristicNarrative({ month, stats, signals, evaluation });
    keyLearnings = (signals?.highlights || []).slice(0, 8);
  }

  const doc = {
    userId,
    month,
    period: { startDate, endDate },
    stats,
    signals,
    narrative,
    keyLearnings,
    evaluation: finalEvaluation,
    recommendations,
    generator,
    generatedAt: new Date(),
  };

  if (upsert) {
    return await MonthlySummary.findOneAndUpdate(
      { userId, month },
      { $set: doc },
      { upsert: true, new: true }
    ).lean();
  }

  const created = await MonthlySummary.create(doc);
  return created.toObject();
};

export const listMonthlySummaries = async ({ userId, limit = 24 }) => {
  return await MonthlySummary.find({ userId })
    .sort({ month: -1 })
    .limit(limit)
    .lean();
};

export const getMonthlySummary = async ({ userId, month }) => {
  return await MonthlySummary.findOne({ userId, month }).lean();
};
