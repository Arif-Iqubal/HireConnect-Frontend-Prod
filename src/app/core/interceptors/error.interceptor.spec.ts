import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['error']);

  beforeEach(() => {
    toastr.error.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: toastr },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows a friendly forbidden message for 403 responses', () => {
    http.post(`${environment.apiUrl}/jobs`, {}).subscribe({
      error: (error) => expect(error.status).toBe(403),
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs`);
    request.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(toastr.error).toHaveBeenCalledWith(
      'You do not have permission to perform this action',
      'Error',
    );
  });

  it('does not show a toast for candidate profile 404 lookups', () => {
    http.get(`${environment.apiUrl}/profiles/candidate/me`).subscribe({
      error: (error) => expect(error.status).toBe(404),
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/profiles/candidate/me`);
    request.flush({}, { status: 404, statusText: 'Not Found' });

    expect(toastr.error).not.toHaveBeenCalled();
  });

  it('shows backend message for 400 errors', () => {
    http.post(`${environment.apiUrl}/jobs`, {}).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs`);

    request.flush(
      { message: 'Bad request data' },
      {
        status: 400,
        statusText: 'Bad Request',
      },
    );

    expect(toastr.error).toHaveBeenCalledWith('Bad request data', 'Error');
  });

  it('shows resource not found message for normal 404 errors', () => {
    http.get(`${environment.apiUrl}/jobs/1`).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs/1`);

    request.flush(
      {},
      {
        status: 404,
        statusText: 'Not Found',
      },
    );

    expect(toastr.error).toHaveBeenCalledWith('Resource not found', 'Error');
  });

  it('shows backend conflict message for 409 errors', () => {
    http.post(`${environment.apiUrl}/jobs`, {}).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs`);

    request.flush(
      { message: 'Conflict occurred' },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );

    expect(toastr.error).toHaveBeenCalledWith('Conflict occurred', 'Error');
  });

  it('shows generic message for 500 errors', () => {
    http.get(`${environment.apiUrl}/jobs`).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs`);

    request.flush(
      {},
      {
        status: 500,
        statusText: 'Server Error',
      },
    );

    expect(toastr.error).toHaveBeenCalledWith(
      'Internal server error. Please try again later.',
      'Error',
    );
  });

  it('shows fallback message for unknown errors', () => {
    http.get(`${environment.apiUrl}/jobs`).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs`);

    request.flush(
      {},
      {
        status: 418,
        statusText: 'Unknown',
      },
    );

    expect(toastr.error).toHaveBeenCalledWith('Error: 418', 'Error');
  });

  it('does not show toast for 401 errors', () => {
    http.get(`${environment.apiUrl}/jobs`).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs`);

    request.flush(
      {},
      {
        status: 401,
        statusText: 'Unauthorized',
      },
    );

    expect(toastr.error).not.toHaveBeenCalled();
  });

  it('does not show toast for recruiter profile 404 lookups', () => {
    http.get(`${environment.apiUrl}/profiles/recruiter/me`).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/profiles/recruiter/me`);

    request.flush(
      {},
      {
        status: 404,
        statusText: 'Not Found',
      },
    );

    expect(toastr.error).not.toHaveBeenCalled();
  });

  it('handles client-side ErrorEvent errors', () => {
    http.get(`${environment.apiUrl}/jobs`).subscribe({
      error: () => {},
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/jobs`);

    request.error(
      new ErrorEvent('NetworkError', {
        message: 'Client-side error',
      }),
    );

    expect(toastr.error).toHaveBeenCalledWith('Client-side error', 'Error');
  });
});
