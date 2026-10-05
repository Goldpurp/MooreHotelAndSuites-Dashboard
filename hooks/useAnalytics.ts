import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AnalyticsOverview, parseAnalytics } from '../lib/analytics';

export function useAnalytics(period: string, revision: unknown) {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let disposed = false;
    setAnalytics(null); setError(''); setLoading(true);
    api.get<unknown>('/api/analytics/overview', {params: {period}})
      .then(parseAnalytics)
      .then(data => { if (!disposed) setAnalytics(data); })
      .catch(error => { if (!disposed) setError(error instanceof Error ? error.message : 'Accounting data is unavailable.'); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [period, revision]);
  return {analytics, error, loading};
}
