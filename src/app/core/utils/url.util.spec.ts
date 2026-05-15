import { environment } from '../../../environments/environment';

describe('url.util', () => {

  it('returns configured API origin', () => {
    expect(getApiOrigin()).toBe(environment.apiUrl);
  });

  it('uses API origin as gateway origin', () => {
    expect(getGatewayOrigin()).toBe(getApiOrigin());
  });

});