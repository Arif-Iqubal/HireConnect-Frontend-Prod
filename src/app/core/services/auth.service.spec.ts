import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const user: User = {
    userId: 'user-1',
    email: 'candidate@example.com',
    fullName: 'Candidate User',
    role: 'CANDIDATE',
    provider: 'LOCAL',
  };

  const authResponse = {
    data: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      ...user,
    },
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('stores tokens and publishes the user after login', () => {
    service.login({ email: user.email, password: 'Password@123' }).subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: user.email,
      password: 'Password@123',
    });

    request.flush(authResponse);

    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    expect(service.getCurrentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.hasRole('CANDIDATE')).toBeTrue();
  });

  it('loads a stored user during construction', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('accessToken', 'stored-token');
    localStorage.setItem('user', JSON.stringify(user));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const freshService = TestBed.inject(AuthService);
    const freshHttpMock = TestBed.inject(HttpTestingController);

    expect(freshService.getCurrentUser()).toEqual(user);
    expect(freshService.getAccessToken()).toBe('stored-token');

    freshHttpMock.verify();
  });

  it('clears invalid stored user data', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('accessToken', 'stored-token');
    localStorage.setItem('refreshToken', 'stored-refresh-token');
    localStorage.setItem('user', '{bad-json');
    spyOn(console, 'error');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const freshService = TestBed.inject(AuthService);
    const freshHttpMock = TestBed.inject(HttpTestingController);

    expect(freshService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();

    freshHttpMock.verify();
  });

  it('clears auth data on logout', () => {
    service.handleOAuthLogin({
      accessToken: 'oauth-access-token',
      refreshToken: 'oauth-refresh-token',
      ...user,
    });

    service.logout();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
  });

  it('sends the refresh token when refreshing auth data', () => {
    localStorage.setItem('refreshToken', 'refresh-token');

    service.refreshToken().subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });

    request.flush(authResponse);
    expect(localStorage.getItem('accessToken')).toBe('access-token');
  });
});
