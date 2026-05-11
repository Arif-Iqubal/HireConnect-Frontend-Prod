import { getApiOrigin, getGatewayOrigin } from './url.util';

describe('url.util', () => {
  it('returns the configured API origin for absolute API URLs', () => {
    expect(getApiOrigin()).toBe('http://localhost:8080');
  });

  it('uses the API origin as the gateway origin', () => {
    expect(getGatewayOrigin()).toBe(getApiOrigin());
  });
});
