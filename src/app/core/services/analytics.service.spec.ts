import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/analytics`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps recruiter analytics into dashboard summary fields', () => {
    service.getRecruiterAnalytics().subscribe((summary) => {
      expect(summary.totalJobs).toBe(5);
      expect(summary.totalApplications).toBe(12);
      expect(summary.applicationsByStatus).toEqual({});
    });

    const request = httpMock.expectOne(`${apiUrl}/recruiter`);
    request.flush({
      data: {
        recruiterId: '7',
        totalJobsPosted: 5,
        totalApplicationsReceived: 12,
      },
    });
  });

  it('builds job analytics from job view counts', () => {
    service.getJobAnalytics('job-1').subscribe((result) => {
      expect(result).toEqual(jasmine.objectContaining({ jobId: 'job-1', views: 9, applications: 0 }));
    });

    const request = httpMock.expectOne(`${apiUrl}/jobs/job-1/views`);
    request.flush({ data: 9 });
  });

  it('unwraps platform analytics data', () => {
    service.getPlatformAnalytics().subscribe((result) => expect(result.totalUsers).toBe(10));

    const request = httpMock.expectOne(`${apiUrl}/admin`);
    request.flush({ data: { totalUsers: 10 } });
  });
});
