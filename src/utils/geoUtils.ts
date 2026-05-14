/**
 * Detects the visitor's country code based on their browser settings.
 * Uses a combination of Language Region Tags and Timezone mapping.
 */
export const getVisitorCountry = (): string | undefined => {
  try {
    // 1. Try to get country from browser language (e.g. "en-AU" -> "AU")
    const lang = navigator.language;
    if (lang && lang.includes('-')) {
      const parts = lang.split('-');
      const country = parts[parts.length - 1].toUpperCase();
      if (country.length === 2) return country;
    }

    // 2. Fallback to timezone detection for common locations
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Colombo')) return 'LK';
    if (timezone.includes('Sydney') || timezone.includes('Melbourne') || timezone.includes('Perth') || timezone.includes('Australia')) return 'AU';
    if (timezone.includes('London')) return 'GB';
    if (timezone.includes('New_York') || timezone.includes('Los_Angeles')) return 'US';
    
    return undefined;
  } catch (e) {
    return undefined;
  }
};
