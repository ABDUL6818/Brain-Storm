import * as analytics from './index';

describe('analytics module public surface (#1469)', () => {
  it('exports the module, controller and services', () => {
    expect(analytics.AnalyticsModule).toBeDefined();
    expect(analytics.AnalyticsController).toBeDefined();
    expect(analytics.AnalyticsService).toBeDefined();
    expect(analytics.AdminAnalyticsService).toBeDefined();
    expect(analytics.InstructorAnalyticsService).toBeDefined();
    expect(analytics.PlatformAnalyticsService).toBeDefined();
    expect(analytics.ProtocolMetricsService).toBeDefined();
  });
});
