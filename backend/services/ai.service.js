const boolFromEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getAiConfigStatus = () => {
  const enabled = boolFromEnv(process.env.AI_ENABLED, false);
  if (!enabled) return { enabled: false, ok: false, reason: 'AI_DISABLED' };

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  const missing = [];
  if (!apiKey) missing.push('OPENAI_API_KEY');

  if (missing.length) return { enabled: true, ok: false, reason: 'AI_INCOMPLETE', missing };
  return { enabled: true, ok: true };
};

const getBaseUrl = () => String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

const getHeaders = () => {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
};

export const createEmbeddings = async ({ inputs }) => {
  const status = getAiConfigStatus();
  if (!status.ok) {
    const err = new Error(status.reason || 'AI_DISABLED');
    err.statusCode = 503;
    err.details = status;
    throw err;
  }

  const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 30000);

  const url = `${getBaseUrl()}/embeddings`;

  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ model, input: inputs }),
    }),
    timeoutMs,
    `OpenAI embeddings timed out after ${timeoutMs}ms`
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`OpenAI embeddings error: ${res.status}`);
    err.statusCode = 502;
    err.responseBody = text;
    throw err;
  }

  const data = await res.json();
  const vectors = (data.data || []).map((d) => d.embedding);
  return { model, vectors };
};

export const createChatCompletion = async ({ messages, temperature = 0.2 }) => {
  const status = getAiConfigStatus();
  if (!status.ok) {
    const err = new Error(status.reason || 'AI_DISABLED');
    err.statusCode = 503;
    err.details = status;
    throw err;
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 30000);

  const url = `${getBaseUrl()}/chat/completions`;

  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ model, messages, temperature }),
    }),
    timeoutMs,
    `OpenAI chat completion timed out after ${timeoutMs}ms`
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`OpenAI chat completion error: ${res.status}`);
    err.statusCode = 502;
    err.responseBody = text;
    throw err;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { model, content, raw: data };
};
