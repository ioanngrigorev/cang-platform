/**
 * Vietnamese public holidays, used to dress the site for a few days around each one.
 *
 * Four of them sit on fixed Gregorian dates. Tet and Hung Kings follow the lunar calendar, so
 * they are tabulated rather than computed: the table below is taken from published calendars and
 * only covers the years listed. An unknown year simply gets no dressing, which is the safe failure.
 */

export type HolidayId = "newyear" | "tet" | "hungkings" | "reunification" | "labour" | "national";

export type Holiday = {
  id: HolidayId;
  /** English and Vietnamese greeting shown in the band. */
  title: string;
  titleVi: string;
  /** Days before and after the date on which the dressing shows. */
  before: number;
  after: number;
};

const HOLIDAYS: Record<HolidayId, Holiday> = {
  newyear: { id: "newyear", title: "Happy New Year", titleVi: "Chúc mừng năm mới", before: 2, after: 1 },
  tet: { id: "tet", title: "Happy Lunar New Year", titleVi: "Chúc mừng năm mới", before: 7, after: 6 },
  hungkings: { id: "hungkings", title: "Hùng Kings' Commemoration Day", titleVi: "Giỗ Tổ Hùng Vương", before: 2, after: 1 },
  reunification: { id: "reunification", title: "Reunification Day", titleVi: "Ngày Giải phóng miền Nam", before: 2, after: 0 },
  labour: { id: "labour", title: "International Labour Day", titleVi: "Ngày Quốc tế Lao động", before: 1, after: 1 },
  national: { id: "national", title: "Vietnam National Day", titleVi: "Quốc khánh Việt Nam", before: 3, after: 2 },
};

/** Lunar dates, confirmed against published Vietnamese holiday calendars. Extend as years are announced. */
const LUNAR: Record<number, { tet: string; hungkings: string }> = {
  2026: { tet: "2026-02-17", hungkings: "2026-04-26" },
  2027: { tet: "2027-02-06", hungkings: "2027-04-16" },
  2028: { tet: "2028-01-26", hungkings: "2028-04-04" },
};

const FIXED: Array<{ id: HolidayId; month: number; day: number }> = [
  { id: "newyear", month: 1, day: 1 },
  { id: "reunification", month: 4, day: 30 },
  { id: "labour", month: 5, day: 1 },
  { id: "national", month: 9, day: 2 },
];

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const parse = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return utc(y, m, d); };
const DAY = 86_400_000;

/** The holiday whose window covers `now`, or null. Windows never overlap in practice. */
export function activeHoliday(now: Date = new Date()): Holiday | null {
  const today = utc(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  const candidates: Array<{ id: HolidayId; at: number }> = [];
  for (const year of [now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
    for (const f of FIXED) candidates.push({ id: f.id, at: utc(year, f.month, f.day) });
    const lunar = LUNAR[year];
    if (lunar) {
      candidates.push({ id: "tet", at: parse(lunar.tet) });
      candidates.push({ id: "hungkings", at: parse(lunar.hungkings) });
    }
  }
  for (const c of candidates) {
    const h = HOLIDAYS[c.id];
    if (today >= c.at - h.before * DAY && today <= c.at + h.after * DAY) return h;
  }
  return null;
}
