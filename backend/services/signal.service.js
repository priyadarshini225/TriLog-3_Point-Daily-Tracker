const normalizeToken = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const uniqTopN = (items, n = 10) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = String(item).trim();
    if (!key) continue;
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(key);
    if (out.length >= n) break;
  }
  return out;
};

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'can',
  'did',
  'do',
  'does',
  'doing',
  'done',
  'for',
  'from',
  'had',
  'has',
  'have',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'like',
  'me',
  'my',
  'not',
  'of',
  'on',
  'or',
  'our',
  'so',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'to',
  'today',
  'tomorrow',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'will',
  'with',
  'you',
  'your',
]);

const extractKeywordsFromText = (text, { max = 12 } = {}) => {
  const normalized = normalizeToken(text);
  if (!normalized) return [];

  const tokens = normalized
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 3)
    .filter((t) => !STOPWORDS.has(t))
    .filter((t) => !/^\d+$/.test(t));

  const counts = new Map();
  for (const t of tokens) {
    counts.set(t, (counts.get(t) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, max))
    .map(([t]) => t);
};

const PLATFORM_PATTERNS = [
  { key: 'LeetCode', patterns: [/\bleetcode\b/i] },
  { key: 'HackerRank', patterns: [/\bhackerrank\b/i] },
  { key: 'Codeforces', patterns: [/\bcodeforces\b/i] },
  { key: 'CodeChef', patterns: [/\bcodechef\b/i] },
  { key: 'GeeksforGeeks', patterns: [/\bgeeksforgeeks\b|\bgfg\b/i] },
  { key: 'YouTube', patterns: [/\byoutube\b/i] },
  { key: 'Coursera', patterns: [/\bcoursera\b/i] },
  { key: 'Udemy', patterns: [/\budemy\b/i] },
  { key: 'freeCodeCamp', patterns: [/\bfreecodecamp\b/i] },
  { key: 'GitHub', patterns: [/\bgithub\b/i] },
  { key: 'Stack Overflow', patterns: [/\bstack\s*overflow\b/i] },
];

const ALGO_KEYWORDS = [
  'binary search',
  'two pointers',
  'sliding window',
  'hashing',
  'prefix sum',
  'sorting',
  'greedy',
  'recursion',
  'backtracking',
  'dynamic programming',
  'dp',
  'graphs',
  'bfs',
  'dfs',
  'dijkstra',
  'topological sort',
  'tries',
  'heap',
  'priority queue',
  'stack',
  'queue',
  'linked list',
  'tree',
  'segment tree',
];

const SUBJECT_KEYWORDS = [
  'javascript',
  'typescript',
  'react',
  'node',
  'express',
  'mongodb',
  'mongoose',
  'sql',
  'postgres',
  'mysql',
  'system design',
  'backend',
  'frontend',
  'data structures',
  'algorithms',
  'leetcode',
];

export const extractSignalsFromEntries = (entries) => {
  const subjects = [];
  const algorithms = [];
  const platforms = [];
  const topics = [];
  const highlights = [];
  const keywordTexts = [];

  for (const entry of entries || []) {
    const learned = normalizeToken(entry.learned);
    const completed = normalizeToken(entry.completed);

    const reviseTexts = (entry.reviseLater || [])
      .map((x) => normalizeToken(x?.text))
      .filter(Boolean);

    const allText = [learned, completed, ...reviseTexts].join(' ').trim();

    if (allText) keywordTexts.push(allText);

    // Platforms
    for (const p of PLATFORM_PATTERNS) {
      if (p.patterns.some((re) => re.test(allText))) platforms.push(p.key);
    }

    // Algorithms
    for (const kw of ALGO_KEYWORDS) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(allText)) algorithms.push(kw);
    }

    // Subjects
    for (const kw of SUBJECT_KEYWORDS) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(allText)) subjects.push(kw);
    }

    // Topics from tags if available
    const tagList = Array.isArray(entry.tags) ? entry.tags : [];
    for (const t of tagList) topics.push(String(t));

    if (tagList.length) keywordTexts.push(tagList.join(' '));

    // Highlights: keep a short learned snippet if present
    if (entry.learned) {
      highlights.push(String(entry.learned).trim().slice(0, 180));
    }
  }

  const keywords = extractKeywordsFromText(keywordTexts.join(' '), { max: 14 });

  return {
    subjects: uniqTopN(subjects, 12),
    algorithms: uniqTopN(algorithms, 12),
    platforms: uniqTopN(platforms, 10),
    topics: uniqTopN(topics, 12),
    keywords: uniqTopN(keywords, 14),
    highlights: uniqTopN(highlights, 10),
  };
};

export const scoreResources = ({ resources, signals }) => {
  const subjectSet = new Set((signals?.subjects || []).map((s) => s.toLowerCase()));
  const algoSet = new Set((signals?.algorithms || []).map((s) => s.toLowerCase()));
  const platformSet = new Set((signals?.platforms || []).map((s) => s.toLowerCase()));
  const topicSet = new Set((signals?.topics || []).map((s) => s.toLowerCase()));
  const keywordSet = new Set((signals?.keywords || []).map((s) => s.toLowerCase()));

  const scoreTag = (tag) => {
    const t = String(tag || '').toLowerCase();
    if (!t) return 0;
    if (platformSet.has(t)) return 5;
    if (algoSet.has(t)) return 4;
    if (subjectSet.has(t)) return 3;
    if (topicSet.has(t)) return 2;
    if (keywordSet.has(t)) return 2;
    return 0;
  };

  return (resources || [])
    .map((r) => {
      const tags = Array.isArray(r.tags) ? r.tags : [];
      const rawScore = tags.reduce((sum, t) => sum + scoreTag(t), 0);
      return { ...r, score: rawScore };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
};
