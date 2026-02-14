import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';

type CopilotChatResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

class CopilotError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'CopilotError';
    if (status !== undefined) {
      this.status = status;
    }
    if (details !== undefined) {
      this.details = details;
    }
  }
}

const DEFAULT_COPILOT_API_URL = 'https://models.github.ai/inference/chat/completions';
const COPILOT_API_URL = process.env.COPILOT_API_URL || DEFAULT_COPILOT_API_URL;

const getCopilotApiKey = (): string => {
  const key = process.env.COPILOT_API_KEY;
  if (!key) {
    throw new Error('COPILOT_API_KEY is not set.');
  }
  return key;
};

const http = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'User-Agent': 'log-detective/1.0'
  }
});

axiosRetry(http, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    error.code === 'ECONNABORTED' ||
    error.response?.status === 429 ||
    (error.response?.status ?? 0) >= 500
});

const askCopilot = async (errorLog: string): Promise<string> => {
  try {
    const response = await http.post<CopilotChatResponse>(
      COPILOT_API_URL,
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a senior DevOps log analyzer.' },
          { role: 'user', content: `Analyze this log: ${errorLog}` }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${getCopilotApiKey()}`
        },
        timeout: 30000
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new CopilotError('Empty response from Copilot API.', 502);
    }

    return content;
  } catch (error: unknown) {
    const err = error as AxiosError;
    if (err.code === 'ECONNABORTED') {
      console.error('❌ The request timed out. GitHub is being slow.');
      throw new CopilotError('Detective timed out. Please try again.', 504, { code: 'TIMEOUT' });
    }

    const status = err.response?.status ?? 502;
    const data = err.response?.data ?? err.message;
    console.error('❌ Detective Error:', data);
    throw new CopilotError('The AI Detective hit a wall.', status, data);
  }
};

export { askCopilot, CopilotError };