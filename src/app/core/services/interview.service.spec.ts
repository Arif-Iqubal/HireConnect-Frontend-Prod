import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Interview } from '../models/interview.model';
import { InterviewService } from './interview.service';

describe('InterviewService', () => {
  let service: InterviewService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/interviews`;
  const interview = { interviewId: 'int-1', status: 'SCHEDULED' } as unknown as Interview;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InterviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps my interviews from page or array responses', () => {
    service.getMyInterviews().subscribe((result) => expect(result).toEqual([interview]));
    let request = httpMock.expectOne(`${apiUrl}/my`);
    request.flush({ data: { content: [interview] } });

    service.getMyInterviews().subscribe((result) => expect(result).toEqual([interview]));
    request = httpMock.expectOne(`${apiUrl}/my`);
    request.flush({ data: [interview] });
  });

  it('sends reschedule request parameters expected by the backend', () => {
    const payload = { newScheduledAt: '2026-06-01T10:00:00', rescheduleReason: 'Need another slot' };

    service.requestReschedule('int-1', payload).subscribe((result) => expect(result).toEqual(interview));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/int-1/request-reschedule`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    expect(request.request.params.get('newScheduledAt')).toBe(payload.newScheduledAt);
    expect(request.request.params.get('reason')).toBe(payload.rescheduleReason);
    expect(request.request.params.get('rescheduleReason')).toBe(payload.rescheduleReason);
    request.flush({ data: interview });
  });

  it('cancels with optional reason query parameter', () => {
    service.cancelInterview('int-1', 'Unavailable').subscribe();

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/int-1/cancel`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.params.get('reason')).toBe('Unavailable');
    request.flush(null);
  });
});
