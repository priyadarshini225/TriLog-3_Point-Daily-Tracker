import EmbeddingChunk from '../models/EmbeddingChunk.model.js';
import DailyEntry from '../models/DailyEntry.model.js';
import DailyAnswer from '../models/DailyAnswer.model.js';
import RevisionSchedule from '../models/RevisionSchedule.model.js';
import { createEmbeddings } from './ai.service.js';

const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

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

const chunkText = (text, maxLen = 900) => {
  const t = String(text || '').trim();
  if (!t) return [];
  if (t.length <= maxLen) return [t];
  // Simple split by sentence/line boundaries.
  const parts = t.split(/\n+|(?<=[.!?])\s+/g).map((p) => p.trim()).filter(Boolean);
  const out = [];
  let buf = '';
  for (const p of parts) {
    if (!buf) {
      buf = p;
      continue;
    }
    if ((buf + ' ' + p).length <= maxLen) {
      buf = buf + ' ' + p;
    } else {
      out.push(buf);
      buf = p;
    }
  }
  if (buf) out.push(buf);
  return out.slice(0, 8);
};

export const upsertMonthlyEmbeddingChunks = async ({ userId, month }) => {
  const range = monthToDateRange(month);
  if (!range) {
    const err = new Error('Month must be in YYYY-MM format');
    err.statusCode = 400;
    throw err;
  }

  const { start, end, startDate, endDate } = range;

  const entries = await DailyEntry.find({ userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).lean();
  const answers = await DailyAnswer.find({ userId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 }).lean();
  const revisions = await RevisionSchedule.find({ userId, completedAt: { $gte: start, $lte: end }, responseText: { $exists: true, $ne: '' } }).lean();

  const docs = [];

  for (const e of entries) {
    const baseTags = Array.isArray(e.tags) ? e.tags : [];

    for (const t of chunkText(e.learned)) {
      docs.push({ userId, month, date: e.date, sourceType: 'dailyEntry.learned', sourceId: e._id, text: t, tags: baseTags });
    }

    for (const t of chunkText(e.completed)) {
      docs.push({ userId, month, date: e.date, sourceType: 'dailyEntry.completed', sourceId: e._id, text: t, tags: baseTags });
    }

    for (const item of e.reviseLater || []) {
      for (const t of chunkText(item?.text)) {
        docs.push({ userId, month, date: e.date, sourceType: 'dailyEntry.reviseLater', sourceId: e._id, text: t, tags: baseTags });
      }
    }
  }

  for (const a of answers) {
    const date = a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : null;
    for (const t of chunkText(a.text, 1100)) {
      docs.push({ userId, month, date, sourceType: 'dailyAnswer.text', sourceId: a._id, text: t, tags: [] });
    }
  }

  for (const r of revisions) {
    const date = r.completedAt ? new Date(r.completedAt).toISOString().slice(0, 10) : null;
    for (const t of chunkText(r.responseText, 900)) {
      docs.push({ userId, month, date, sourceType: 'revisionSchedule.responseText', sourceId: r._id, text: t, tags: [] });
    }
  }

  if (docs.length === 0) return { inserted: 0, updated: 0, total: 0 };

  // Embed in batches.
  const batchSize = Number(process.env.EMBED_BATCH_SIZE || 32);
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const { model, vectors } = await createEmbeddings({ inputs: batch.map((d) => d.text) });

    for (let j = 0; j < batch.length; j += 1) {
      const d = batch[j];
      const embedding = vectors[j];
      if (!embedding) continue;

      const res = await EmbeddingChunk.updateOne(
        {
          userId: d.userId,
          month: d.month,
          sourceType: d.sourceType,
          sourceId: d.sourceId,
          date: d.date,
          text: d.text,
        },
        {
          $set: {
            embeddingModel: model,
            embedding,
            tags: d.tags || [],
          },
        },
        { upsert: true }
      );

      if (res.upsertedCount && res.upsertedCount > 0) inserted += 1;
      else if (res.modifiedCount && res.modifiedCount > 0) updated += 1;
    }
  }

  return { inserted, updated, total: docs.length };
};

export const retrieveTopChunks = async ({ userId, month, queryText, topK = 10 }) => {
  const { vectors, model } = await createEmbeddings({ inputs: [queryText] });
  const queryVector = vectors?.[0];
  if (!queryVector) return [];

  const candidates = await EmbeddingChunk.find({ userId, month }).select({ text: 1, sourceType: 1, date: 1, tags: 1, embedding: 1 }).lean();

  const scored = candidates
    .map((c) => ({
      ...c,
      similarity: cosineSimilarity(queryVector, c.embedding),
    }))
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, topK);

  // Strip embeddings from return payload
  return scored.map(({ embedding, ...rest }) => rest);
};

const listMonthsBetween = (startDate, endDate) => {
  // dates are YYYY-MM-DD; months are YYYY-MM
  const startMonth = String(startDate).slice(0, 7);
  const endMonth = String(endDate).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(endMonth)) return [];

  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  if (!Number.isFinite(sy) || !Number.isFinite(sm) || !Number.isFinite(ey) || !Number.isFinite(em)) return [];

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

export const retrieveTopChunksForDateRange = async ({ userId, startDate, endDate, queryText, topK = 12 }) => {
  const { vectors } = await createEmbeddings({ inputs: [queryText] });
  const queryVector = vectors?.[0];
  if (!queryVector) return [];

  const months = listMonthsBetween(startDate, endDate);
  if (months.length === 0) return [];

  const candidates = await EmbeddingChunk.find({
    userId,
    month: { $in: months },
    date: { $gte: startDate, $lte: endDate },
  })
    .select({ text: 1, sourceType: 1, date: 1, tags: 1, embedding: 1 })
    .lean();

  const scored = candidates
    .map((c) => ({
      ...c,
      similarity: cosineSimilarity(queryVector, c.embedding),
    }))
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, topK);

  return scored.map(({ embedding, ...rest }) => rest);
};
