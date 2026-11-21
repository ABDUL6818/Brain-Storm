import * as notifications from './index';

describe('notifications module public surface (#1468)', () => {
  it('exports the module, controller, service and router', () => {
    expect(notifications.NotificationsModule).toBeDefined();
    expect(notifications.NotificationsController).toBeDefined();
    expect(notifications.NotificationsService).toBeDefined();
    expect(notifications.NotificationRouterService).toBeDefined();
  });
});
