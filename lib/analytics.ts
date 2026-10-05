export type AnalyticsOverview = {
  kpis: {netRevenue:number; occupancyRate:number; activeGuests:number; avgNightlyRate:number; revenueGrowthPercentage:number; occupancyGrowthPercentage:number};
  revenueDynamics: {date:string; value:number}[];
  fromDate:string; toDate:string;
  report: {payments:number; refunds:number; revPar:number; adr:number; receivables:number; guestCredits:number};
};
export function parseAnalytics(value: unknown): AnalyticsOverview {
  const data = value as AnalyticsOverview;
  const finite = (value:unknown) => typeof value === 'number' && Number.isFinite(value);
  if (!data || !data.kpis || !data.report ||
      !['netRevenue','occupancyRate','activeGuests','avgNightlyRate','revenueGrowthPercentage','occupancyGrowthPercentage'].every(key => finite(data.kpis[key as keyof AnalyticsOverview['kpis']])) ||
      !['payments','refunds','revPar','adr','receivables','guestCredits'].every(key => finite(data.report[key as keyof AnalyticsOverview['report']])) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(data.toDate) ||
      !Array.isArray(data.revenueDynamics) || !data.revenueDynamics.every(point => typeof point.date === 'string' && finite(point.value))) {
    throw new Error('The accounting report could not be read. Please refresh.');
  }
  return data;
}
