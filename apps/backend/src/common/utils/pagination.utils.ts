import { MAX_PAGE_LIMIT } from '../dto/pagination.dto';

export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface SkipTake {
  skip: number;
  take: number;
}

/**
 * Converts 1-based page/limit query values into the skip/take pair TypeORM
 * expects (#1476). Missing values use the defaults, and the limit is capped
 * at MAX_PAGE_LIMIT, the same cap PaginationDto validates against.
 */
export function toSkipTake(query: PageQuery, defaultLimit = 20): SkipTake {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const take = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(query.limit ?? defaultLimit)));
  return { skip: (page - 1) * take, take };
}
