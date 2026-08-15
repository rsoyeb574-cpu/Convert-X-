/**
 * Safe API response parser that guards against non-JSON / HTML responses.
 */
export async function safeParseJson<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!text || text.trim() === '') {
    return {} as T;
  }

  // Check if JSON
  if (contentType.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Server returned malformed JSON (HTTP ${response.status})`);
    }
  }

  // If HTML or plain text error was returned (e.g. 502/504 Bad Gateway from CDN proxy)
  if (!response.ok) {
    // Strip HTML tags for clean error message
    const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const shortMessage = cleanText.length > 150 ? cleanText.substring(0, 150) + '...' : cleanText;
    throw new Error(shortMessage || `Server returned HTTP ${response.status}`);
  }

  throw new Error(`Unexpected non-JSON response received from server (${contentType || 'plain text'})`);
}
