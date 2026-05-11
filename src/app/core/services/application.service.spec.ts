import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Application } from '../models/application.model';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/applications`;
  const application = {
    applicationId: 'app-1',
    jobId: '101',
    status: 'APPLIED',
  } as unknown as Application;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApplicationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('submits an application with a numeric job id', () => {
    service
      .submitApplication('101', { coverLetter: 'Hello' } as Partial<Application>)
      .subscribe((result) => {
        expect(result).toEqual(application);
      });

    const request = httpMock.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ jobId: 101, coverLetter: 'Hello' });
    request.flush({ data: application });
  });

  it('maps paged application responses to arrays', () => {
    service.getMyApplications().subscribe((result) => expect(result).toEqual([application]));

    const request = httpMock.expectOne(`${apiUrl}/my`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: { content: [application] } });
  });

  it('requests recruiter applications with the configured page size', () => {
    service
      .getApplicationsByRecruiter('77', 50)
      .subscribe((result) => expect(result).toEqual([application]));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/recruiter/77`);
    expect(request.request.params.get('size')).toBe('50');
    request.flush({ data: [application] });
  });

  it('maps missing count responses to zero', () => {
    service.countApplicationsByJob('101').subscribe((result) => expect(result).toBe(0));

    const request = httpMock.expectOne(`${apiUrl}/job/101/count`);
    request.flush({ data: null });
  });

  it('uses status helper methods for shortlist and reject actions', () => {
    service.shortlistCandidate('app-1').subscribe();
    let request = httpMock.expectOne(`${apiUrl}/app-1/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'SHORTLISTED' });
    request.flush({ data: application });

    service.rejectCandidate('app-1').subscribe();
    request = httpMock.expectOne(`${apiUrl}/app-1/status`);
    expect(request.request.body).toEqual({ status: 'REJECTED' });
    request.flush({ data: application });
  });

  it('gets applications by job', () => {
    service.getApplicationsByJob('101').subscribe((result) => {
      expect(result).toEqual([application]);
    });

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/job/101`);

    expect(request.request.params.get('size')).toBe('200');

    request.flush({ data: [application] });
  });

  it('gets applications by candidate', () => {
    service.getApplicationsByCandidate('55').subscribe((result) => {
      expect(result).toEqual([application]);
    });

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/candidate/55`);

    request.flush({
      data: {
        content: [application],
      },
    });
  });

  it('counts candidate applications from totalElements', () => {
    service.countApplicationsByCandidate('55').subscribe((result) => {
      expect(result).toBe(10);
    });

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/candidate/55`);

    request.flush({
      data: {
        totalElements: 10,
      },
    });
  });

  it('gets application by id', () => {
    service.getApplicationById('app-1').subscribe((result) => {
      expect(result).toEqual(application);
    });

    const request = httpMock.expectOne(`${apiUrl}/app-1`);

    request.flush({
      data: application,
    });
  });

  it('updates application status', () => {
    service.updateApplicationStatus('app-1', { status: 'SHORTLISTED' }).subscribe();

    const request = httpMock.expectOne(`${apiUrl}/app-1/status`);

    expect(request.request.method).toBe('PATCH');

    request.flush({
      data: application,
    });
  });

  it('sends message to candidate', () => {
    service.sendMessageToCandidate('app-1', 'Hello').subscribe((result) => {
      expect(result).toBeUndefined();
    });

    const request = httpMock.expectOne(`${apiUrl}/app-1/messages`);

    expect(request.request.method).toBe('POST');

    request.flush({});
  });

  it('withdraws application', () => {
    service.withdrawApplication('app-1').subscribe((result) => {
      expect(result).toBeUndefined();
    });

    const request = httpMock.expectOne(`${apiUrl}/app-1/withdraw`);

    expect(request.request.method).toBe('DELETE');

    request.flush({});
  });

  it('returns empty array for invalid payload', () => {
    service.getMyApplications().subscribe((result) => {
      expect(result).toEqual([]);
    });

    const request = httpMock.expectOne(`${apiUrl}/my`);

    request.flush({
      data: null,
    });
  });
});
