import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';

import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  if (isPublicRequest(req)) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const user = authService.getCurrentUser();

  // Attach token
  if (token || user) {
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (user) {
      headers['X-User-Id'] = String(user.userId);
      headers['X-User-Role'] = user.role;
      headers['X-User-Email'] = user.email;

      if (user.fullName) {
        headers['X-User-Name'] = user.fullName;
      }
    }

    req = req.clone({
      setHeaders: headers
    });
  }

  return next(req).pipe(

    catchError((error: HttpErrorResponse) => {

      // Only refresh on 401
      if (error.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url },
          });
          return throwError(() => error);
        }

        return authService.refreshToken().pipe(

          switchMap((response) => {

            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`
              }
            });

            return next(newReq);
          }),

          catchError((refreshError) => {

            // Clear auth immediately
            localStorage.clear();

            router.navigate(['/auth/login']);

            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

function isPublicRequest(req: Parameters<HttpInterceptorFn>[0]): boolean {
  return isPublicJobsGet(req) || isAuthEndpoint(req.url);
}

function isPublicJobsGet(req: Parameters<HttpInterceptorFn>[0]): boolean {
  return req.method === 'GET' && /\/api\/v1\/jobs(\/search|\/\d+)?(\?|$)/.test(req.url);
}

function isAuthEndpoint(url: string): boolean {
  return [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
  ].some((path) => url.includes(path));
}
