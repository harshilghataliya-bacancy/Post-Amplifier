// Simple bigram-based similarity check
function getBigrams(str: string): Set<string> {
  const s = str.toLowerCase().replace(/\s+/g, " ").trim();
  const bigrams = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.substring(i, i + 2));
  }
  return bigrams;
}

function diceCoefficient(a: string, b: string): number {
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

export function deduplicateTexts(
  texts: string[],
  threshold: number = 0.8
): string[] {
  const unique: string[] = [];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    const isDuplicate = unique.some(
      (existing) => diceCoefficient(existing, trimmed) >= threshold
    );
    if (!isDuplicate) {
      unique.push(trimmed);
    }
  }
  return unique;
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
