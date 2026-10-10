import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AnalyticsOverview, parseAnalytics } from '../lib/analytics';

type AnalyticsState = {
  period: string;
  analytics: AnalyticsOverview | null;
  error: string;
  pending: boolean;
};

export function useAnalytics(period: string, revision: unknown) {
  const [state, setState] = useState<AnalyticsState>(() => ({
    period, analytics: null, error: '', pending: true,
  }));

  useEffect(() => {
    let disposed = false;
    // A background sync must not blank a report that is already on screen.
    // Keep a failed-refresh warning until a successful response replaces it.
    setState(previous => previous.period === period
      ? { ...previous, pending: true }
      : { period, analytics: null, error: '', pending: true });
    api.get<unknown>('/api/analytics/overview', { params: { period } })
      .then(parseAnalytics)
      .then(analytics => {
        if (!disposed) setState({ period, analytics, error: '', pending: false });
      })
      .catch(error => {
        if (!disposed) setState(previous => ({
          ...previous,
          error: error instanceof Error ? error.message : 'Accounting data is unavailable.',
          pending: false,
        }));
      });
    return () => { disposed = true; };
  }, [period, revision]);

  // Mask the old period immediately, including the render before its effect runs.
  const current = state.period === period;
  const analytics = current ? state.analytics : null;
  const pending = !current || state.pending;
  return {
    analytics,
    error: current ? state.error : '',
    loading: pending && !analytics,
    refreshing: pending && Boolean(analytics),
  };
}
