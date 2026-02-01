
export const honestyFilter = (response: string, contextFound: boolean): string => {
  let filtered = response;

  // Rule: If price is mentioned but no product context was found, warn user
  if (!contextFound && (filtered.includes('TND') || filtered.includes('prix'))) {
    filtered += "\n\n(Note: Je n'ai pas pu confirmer les prix exacts en temps réel, je vérifie sous 24h avec Adel).";
  }

  // Rule: Add professional Tunis signature if missing
  if (!filtered.includes('Tunis')) {
    // optional subtle addition
  }

  return filtered;
};

export const checkDomainSafety = (query: string): boolean => {
  const allowedKeywords = ['pâtisserie', 'glace', 'machine', 'four', 'prix', 'stock', 'vitrine', 'iceteam', 'clabo', 'gemm', 'tunis'];
  return allowedKeywords.some(k => query.toLowerCase().includes(k));
};
