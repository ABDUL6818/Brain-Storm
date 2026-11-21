import * as leaderboard from './index';

describe('leaderboard module public surface (#1470)', () => {
  it('exports the module, controller and services', () => {
    expect(leaderboard.LeaderboardModule).toBeDefined();
    expect(leaderboard.LeaderboardController).toBeDefined();
    expect(leaderboard.LeaderboardService).toBeDefined();
    expect(leaderboard.RedisLeaderboardService).toBeDefined();
  });
});
