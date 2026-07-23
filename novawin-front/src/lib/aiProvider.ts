export function getAiProvider(): string {
  if (typeof document === 'undefined') return 'gemini';
  const match = document.cookie.match(/(?:^|; )ai_provider=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : 'gemini';
}

export function setAiProvider(provider: string) {
  document.cookie = `ai_provider=${provider}; path=/; max-age=${60 * 60 * 24 * 365}`;
}