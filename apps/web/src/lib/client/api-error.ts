export async function apiErrorMessage(
  response: Response,
  messages: Partial<Record<string, string>>,
  fallback: string
): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error ? messages[body.error] ?? fallback : fallback;
  } catch {
    return fallback;
  }
}
