export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Returns ISO date strings (YYYY-MM-DD) for the first and last day of a month. */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month + 1).padStart(2, "0");
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getCurrentMonthIndex(): number {
  return new Date().getMonth();
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}
