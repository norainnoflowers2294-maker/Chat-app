export interface ZodiacInfo {
  name: string;
  symbol: string;
  element: string;
}

export function calculateZodiacSign(month: number, day: number): ZodiacInfo | null {
  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return { name: 'Aries', symbol: '♈', element: 'Fire' };
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return { name: 'Taurus', symbol: '♉', element: 'Earth' };
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return { name: 'Gemini', symbol: '♊', element: 'Air' };
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return { name: 'Cancer', symbol: '♋', element: 'Water' };
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return { name: 'Leo', symbol: '♌', element: 'Fire' };
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return { name: 'Virgo', symbol: '♍', element: 'Earth' };
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return { name: 'Libra', symbol: '♎', element: 'Air' };
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return { name: 'Scorpio', symbol: '♏', element: 'Water' };
  }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return { name: 'Sagittarius', symbol: '♐', element: 'Fire' };
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return { name: 'Capricorn', symbol: '♑', element: 'Earth' };
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return { name: 'Aquarius', symbol: '♒', element: 'Air' };
  }
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
    return { name: 'Pisces', symbol: '♓', element: 'Water' };
  }

  return null;
}

export function parseBirthdayToZodiac(birthdayStr: string): ZodiacInfo | null {
  if (!birthdayStr) return null;

  // Handles "MM/DD", "MM-DD", "Month DD", "MM/DD/YYYY"
  const cleanStr = birthdayStr.trim();

  // Check MM/DD or MM-DD pattern
  const monthDayMatch = cleanStr.match(/^(\d{1,2})[/-](\d{1,2})/);
  if (monthDayMatch) {
    const m = parseInt(monthDayMatch[1], 10);
    const d = parseInt(monthDayMatch[2], 10);
    return calculateZodiacSign(m, d);
  }

  // Month name lookup
  const monthNames: Record<string, number> = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  };

  const nameMatch = cleanStr.toLowerCase().match(/([a-z]+)\s+(\d{1,2})/);
  if (nameMatch) {
    const m = monthNames[nameMatch[1]];
    const d = parseInt(nameMatch[2], 10);
    if (m) return calculateZodiacSign(m, d);
  }

  return null;
}

export function calculateAgeFromBirthYear(birthYearStr: string, birthdayStr?: string): string {
  const year = parseInt(birthYearStr, 10);
  if (isNaN(year) || year < 1000 || year > 3000) return '';

  const now = new Date();
  let age = now.getFullYear() - year;

  if (birthdayStr) {
    const monthDayMatch = birthdayStr.match(/^(\d{1,2})[/-](\d{1,2})/);
    if (monthDayMatch) {
      const m = parseInt(monthDayMatch[1], 10) - 1;
      const d = parseInt(monthDayMatch[2], 10);
      const bdate = new Date(now.getFullYear(), m, d);
      if (now < bdate) {
        age -= 1;
      }
    }
  }

  return age > 0 ? String(age) : '';
}
