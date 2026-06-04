// TODO: replace all values here with live CRM / GHL / sheet data when wired in Phase 2.
// Each leaf { value, delta } maps directly to a single data-source field.

export type Period = "7d" | "mtd" | "qtd" | "ytd";

export interface KpiValue {
  value: number;
  delta: number | null; // pts or % change vs previous period; null = not enough history
  unit: "pct" | "count" | "usd";
}

export interface SetterData {
  name: string;
  color: string;
  contactRate: KpiValue;
  appointmentsBooked: KpiValue;
  showRate: KpiValue;
  conversionRate: KpiValue;
  cashCollected: KpiValue;
  dealsClosed: KpiValue;
}

export interface TrendWeek {
  week: string;
  closeRate: number;
  showUpRate: number;
  avgDealSize: number;
  studentResponse: number;
  sylis: number;
  izaiah: number;
  celest: number;
  revenue: number;
}

export interface MockData {
  overview: {
    teamCloseRate: KpiValue;
    teamShowUpRate: KpiValue;
    customerRetention: KpiValue;
    appointmentsBooked: KpiValue;
    teamConversionRate: KpiValue;
    avgDealSize: KpiValue;
    trainingCompletion: KpiValue;
    onboardingCompletion: KpiValue;
    totalCashCollected: KpiValue;
    totalDealsClosed: KpiValue;
  };
  director: {
    showUpRate: KpiValue;
    closeRate: KpiValue;
    customerRetention: KpiValue;
    trainingCompletion: KpiValue;
    avgDealSize: KpiValue;
    teamRevenue: KpiValue;
    totalDealsClosed: KpiValue;
  };
  setters: SetterData[];
  va: {
    contractCompletion: KpiValue;
    mastermindAttendance: KpiValue;
    tuesdayReminder: KpiValue;
    studentResponse: KpiValue;
    onboardingCompletion: KpiValue;
  };
  trends: TrendWeek[];
}

// TODO: connect live source — pull from sheet sync, GHL CRM, or manual entry API
export const MOCK: MockData = {
  overview: {
    teamCloseRate:        { value: 32,    delta: 2.4,  unit: "pct" },
    teamShowUpRate:       { value: 71,    delta: -1.0, unit: "pct" },
    customerRetention:    { value: 88,    delta: 3.0,  unit: "pct" },
    appointmentsBooked:   { value: 103,   delta: 9,    unit: "count" },
    teamConversionRate:   { value: 29,    delta: 1.5,  unit: "pct" },
    avgDealSize:          { value: 6290,  delta: 4.0,  unit: "usd" },
    trainingCompletion:   { value: 94,    delta: 1.0,  unit: "pct" },
    onboardingCompletion: { value: 86,    delta: 5.0,  unit: "pct" },
    totalCashCollected:   { value: 73200, delta: 8.5,  unit: "usd" },
    totalDealsClosed:     { value: 11,    delta: 2,    unit: "count" },
  },
  director: {
    showUpRate:       { value: 71,    delta: -1.0, unit: "pct" },
    closeRate:        { value: 32,    delta: 2.4,  unit: "pct" },
    customerRetention:{ value: 88,    delta: 3.0,  unit: "pct" },
    trainingCompletion:{ value: 94,   delta: 1.0,  unit: "pct" },
    avgDealSize:      { value: 6290,  delta: 4.0,  unit: "usd" },
    teamRevenue:      { value: 73200, delta: 8.5,  unit: "usd" },
    totalDealsClosed: { value: 11,    delta: 2,    unit: "count" },
  },
  setters: [
    {
      name: "Sylis", color: "#1D9E75",
      contactRate:        { value: 42, delta: 5,    unit: "pct" },
      appointmentsBooked: { value: 38, delta: 8,    unit: "count" },
      showRate:           { value: 71, delta: -2,   unit: "pct" },
      conversionRate:     { value: 28, delta: 3,    unit: "pct" },
      cashCollected:      { value: 27400, delta: 12.0, unit: "usd" },
      dealsClosed:        { value: 4,  delta: 1,    unit: "count" },
    },
    {
      name: "Izaiah", color: "#D8843A",
      contactRate:        { value: 38, delta: 2,    unit: "pct" },
      appointmentsBooked: { value: 35, delta: -3,   unit: "count" },
      showRate:           { value: 69, delta: 1,    unit: "pct" },
      conversionRate:     { value: 30, delta: 4,    unit: "pct" },
      cashCollected:      { value: 25800, delta: 6.2, unit: "usd" },
      dealsClosed:        { value: 4,  delta: null, unit: "count" },
    },
    {
      name: "Celest", color: "#D957A8",
      contactRate:        { value: 35, delta: -1,   unit: "pct" },
      appointmentsBooked: { value: 30, delta: 4,    unit: "count" },
      showRate:           { value: 73, delta: 3,    unit: "pct" },
      conversionRate:     { value: 29, delta: -1,   unit: "pct" },
      cashCollected:      { value: 20000, delta: 4.1, unit: "usd" },
      dealsClosed:        { value: 3,  delta: 1,    unit: "count" },
    },
  ],
  va: {
    contractCompletion:   { value: 91, delta: 1.0, unit: "pct" },
    mastermindAttendance: { value: 82, delta: 5.0, unit: "pct" },
    tuesdayReminder:      { value: 95, delta: 2.0, unit: "pct" },
    studentResponse:      { value: 78, delta: 3.0, unit: "pct" },
    onboardingCompletion: { value: 86, delta: 5.0, unit: "pct" },
  },
  // TODO: connect live source — weekly rollup query on calls + tracker sheet
  trends: [
    { week: "Wk 1", closeRate: 28, showUpRate: 74, avgDealSize: 5800, studentResponse: 72, sylis: 6, izaiah: 6, celest: 5, revenue: 52000 },
    { week: "Wk 2", closeRate: 29, showUpRate: 73, avgDealSize: 5950, studentResponse: 74, sylis: 7, izaiah: 5, celest: 6, revenue: 54600 },
    { week: "Wk 3", closeRate: 30, showUpRate: 72, avgDealSize: 6100, studentResponse: 75, sylis: 8, izaiah: 8, celest: 6, revenue: 61000 },
    { week: "Wk 4", closeRate: 31, showUpRate: 71, avgDealSize: 6200, studentResponse: 76, sylis: 8, izaiah: 8, celest: 7, revenue: 65100 },
    { week: "Wk 5", closeRate: 31, showUpRate: 71, avgDealSize: 6250, studentResponse: 77, sylis: 9, izaiah: 8, celest: 6, revenue: 70400 },
    { week: "Wk 6", closeRate: 32, showUpRate: 71, avgDealSize: 6290, studentResponse: 78, sylis: 0, izaiah: 0, celest: 0, revenue: 73200 },
  ],
};

export const TEAM_ROSTER = {
  director: { name: "Harneet", color: "#3B6FB5", role: "Sales Director" },
  setters: MOCK.setters,
  va: { name: "Chona", color: "#8A5BC7", role: "VA & Ops" },
};

export const PERIOD_LABELS: Record<Period, string> = {
  "7d":  "Last 7 days",
  "mtd": "Month to date",
  "qtd": "Quarter to date",
  "ytd": "Year to date",
};
