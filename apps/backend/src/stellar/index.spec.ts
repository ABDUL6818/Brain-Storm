import * as stellar from './index';

describe('stellar module public surface (#1467)', () => {
  it('exports the module, controller and service', () => {
    expect(stellar.StellarModule).toBeDefined();
    expect(stellar.StellarController).toBeDefined();
    expect(stellar.StellarService).toBeDefined();
  });
});
