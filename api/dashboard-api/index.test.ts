import * as Dashboard from '.';

describe('Api.Dashboard.Index', () => {
  it('Should have the exports which are required by the api generator', () => {
    expect(Dashboard).toHaveProperty('Container');
    expect(Dashboard).toHaveProperty('EndpointHandlers');
  });
});
