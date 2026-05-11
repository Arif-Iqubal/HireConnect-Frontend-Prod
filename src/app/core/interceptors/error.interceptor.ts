// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // 🚨 Skip 401 (handled by auth interceptor)
      if (
        error.status === 401 ||
        (error.status === 404 && req.method === 'GET' && req.url.includes('/profiles/candidate/me')) ||
        (error.status === 404 && req.method === 'GET' && req.url.includes('/profiles/recruiter/me'))
      ) {
        return throwError(() => error);
      }

      const errorMessage = getErrorMessage(error);
      
      toastr.error(errorMessage, 'Error');
      return throwError(() => error);
    })
  );
};

function getErrorMessage(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    return error.error.message;
  }

  switch (error.status) {
    case 400:
      return error.error?.message || 'Bad request';
    case 403:
      return 'You do not have permission to perform this action';
    case 404:
      return 'Resource not found';
    case 409:
      return error.error?.message || 'Conflict occurred';
    case 500:
      return 'Internal server error. Please try again later.';
    default:
      return error.error?.message || `Error: ${error.status}`;
  }
}
