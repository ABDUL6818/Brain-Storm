import { Controller, Get, MessageEvent, Sse, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable, from, interval, map, startWith, switchMap } from 'rxjs';
import { CacheInterceptor } from '../cache/cache.interceptor';
import { Cacheable } from '../cache/cache.decorators';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@Controller('leaderboard')
// Read-heavy public route: the CacheInterceptor serves GETs from cache (#1482).
@UseInterceptors(CacheInterceptor)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @Cacheable(60, 'leaderboard')
  @ApiOperation({ summary: 'Get the top 50 BST holders' })
  @ApiResponse({ status: 200, description: 'Returns leaderboard entries' })
  getLeaderboard() {
    return this.leaderboardService.getTopUsers();
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream leaderboard updates over SSE' })
  stream(): Observable<MessageEvent> {
    return interval(30_000).pipe(
      startWith(0),
      switchMap(() => from(this.leaderboardService.getTopUsers())),
      map((data) => ({ data }))
    );
  }
}
