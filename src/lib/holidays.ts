// src/lib/holidays.ts

// Public holidays observed broadly across major shipping markets.
// Format: 'MM-DD' (recurring yearly) or 'YYYY-MM-DD' (specific date)
const RECURRING_HOLIDAYS: string[] = [
  '01-01', // New Year's Day
  '12-25', // Christmas Day
  '12-26', // Boxing Day (UK, EU, Commonwealth)
  '07-04', // US Independence Day
  '11-11', // Veterans / Armistice Day (US, EU)
  '05-01', // International Workers Day (most countries)
];

// Movable holidays — must be specific dates
// Add more as needed each year
const SPECIFIC_HOLIDAYS: string[] = [
  // 2026
  '2026-01-01', // New Year
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-25', // Memorial Day (US)
  '2026-07-04', // Independence Day (US)
  '2026-09-07', // Labor Day (US)
  '2026-11-26', // Thanksgiving (US)
  '2026-12-25', // Christmas Day
  '2026-12-26', // Boxing Day
  // 2027
  '2027-01-01',
  '2027-03-26', // Good Friday
  '2027-03-29', // Easter Monday
  '2027-05-31', // Memorial Day
  '2027-07-04',
  '2027-09-06', // Labor Day
  '2027-11-25', // Thanksgiving
  '2027-12-25',
  '2027-12-26',
];

const recurringSet = new Set(RECURRING_HOLIDAYS);
const specificSet = new Set(SPECIFIC_HOLIDAYS);

export function isHoliday(date: Date): boolean {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  if (specificSet.has(`${yyyy}-${mm}-${dd}`)) return true;
  if (recurringSet.has(`${mm}-${dd}`)) return true;
  return false;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

// Add N business days to a starting date, skipping weekends + holidays
export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
}