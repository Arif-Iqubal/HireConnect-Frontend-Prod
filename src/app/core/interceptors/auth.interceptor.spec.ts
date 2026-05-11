import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const authService = jasmine.createSpyObj<AuthService>('AuthService', [
    'getAccessToken',
    'getCurrentUser',
    'refreshToken',
  ]);
  const router = jasmine.createSpyObj<Router>('Router', ['navigate'], { url: '/dashboard' });

  beforeEach(() => {
    localStorage.clear();
    authService.getAccessToken.calls.reset();
    authService.getCurrentUser.calls.reset();
    authService.refreshToken.calls.reset();
    router.navigate.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches auth and user headers to protected requests', () => {
    authService.getAccessToken.and.returnValue('access-token');
    authService.getCurrentUser.and.returnValue({
      userId: 'user-1',
      email: 'recruiter@example.com',
      fullName: 'Recruiter User',
      role: 'RECRUITER',
    });

    http.get(`${environment.apiUrl}/applications`).subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/applications`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    expect(request.request.headers.get('X-User-Id')).toBe('user-1');
    expect(request.request.headers.get('X-User-Role')).toBe('RECRUITER');
    expect(request.request.headers.get('X-User-Email')).toBe('recruiter@example.com');
    expect(request.request.headers.get('X-User-Name')).toBe('Recruiter User');

    request.flush({});
  });

  it('does not attach auth headers to public job search requests', () => {
    authService.getAccessToken.and.returnValue('access-token');

    http.get(`${environment.apiUrl}/jobs/search?title=Angular`).subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs/search?title=Angular`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(authService.getAccessToken).not.toHaveBeenCalled();

    request.flush({});
  });

  it('redirects to login on 401 when no refresh token exists', () => {
    authService.getAccessToken.and.returnValue('access-token');
    authService.getCurrentUser.and.returnValue(null);

    http.get(`${environment.apiUrl}/applications`).subscribe({
      error: (error) => expect(error.status).toBe(401),
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/applications`);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });
});
