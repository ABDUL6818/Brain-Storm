import * as search from './index';

describe('search module public surface (#1471)', () => {
  it('exports the module, controller and service', () => {
    expect(search.SearchModule).toBeDefined();
    expect(search.SearchController).toBeDefined();
    expect(search.SearchService).toBeDefined();
  });
});
