const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = 'gpt-oss:20b';

export interface ParsedTask {
  title: string;
  confidence: 'high' | 'medium' | 'low';
  parseWarning: boolean;
  parseErrors: string | null;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

export async function parseTaskInput(rawInput: string): Promise<ParsedTask> {
  const prompt = buildPrompt(rawInput);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 200,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    return parseResponse(data.response, rawInput);
  } catch (error) {
    console.error('LLM parsing failed:', error);
    return {
      title: cleanFallbackTitle(rawInput),
      confidence: 'low',
      parseWarning: true,
      parseErrors: `LLM parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

function buildPrompt(input: string): string {
  return `You are a task extraction assistant. Extract the task title from the user's voice input.

Rules:
1. Extract only the core task action (what needs to be done)
2. Remove filler words like "add", "create", "remind me to", "I need to"
3. Remove list references like "to my list", "to inbox", "to groceries"
4. Keep the task title concise but complete
5. Respond with ONLY a JSON object, no other text

Examples:
Input: "Add buy milk to my grocery list"
Output: {"title": "Buy milk"}

Input: "Remind me to call the dentist tomorrow"
Output: {"title": "Call the dentist"}

Input: "I need to finish the report by Friday"
Output: {"title": "Finish the report"}

Input: "Add task research health insurance options"
Output: {"title": "Research health insurance options"}

Input: "Buy eggs"
Output: {"title": "Buy eggs"}

Now extract the task from this input:
Input: "${input.replace(/"/g, '\\"')}"
Output:`;
}

function parseResponse(response: string, rawInput: string): ParsedTask {
  const jsonMatch = response.match(/\{[\s\S]*?\}/);

  if (!jsonMatch) {
    return {
      title: cleanFallbackTitle(rawInput),
      confidence: 'low',
      parseWarning: true,
      parseErrors: 'Could not parse LLM response as JSON',
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.title || typeof parsed.title !== 'string') {
      return {
        title: cleanFallbackTitle(rawInput),
        confidence: 'low',
        parseWarning: true,
        parseErrors: 'LLM response missing title field',
      };
    }

    const title = parsed.title.trim();

    if (title.length === 0) {
      return {
        title: cleanFallbackTitle(rawInput),
        confidence: 'low',
        parseWarning: true,
        parseErrors: 'LLM returned empty title',
      };
    }

    return {
      title,
      confidence: 'high',
      parseWarning: false,
      parseErrors: null,
    };
  } catch (e) {
    return {
      title: cleanFallbackTitle(rawInput),
      confidence: 'low',
      parseWarning: true,
      parseErrors: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown'}`,
    };
  }
}

function cleanFallbackTitle(input: string): string {
  return input
    .replace(/^(add|create|remind me to|i need to)\s+/i, '')
    .replace(/\s+(to my list|to inbox|to my inbox)$/i, '')
    .trim() || input;
}

export async function checkLLMHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) return false;

    const data = await response.json();
    const hasModel = data.models?.some((m: { name: string }) => m.name.startsWith('gpt-oss'));
    return hasModel;
  } catch {
    return false;
  }
}
