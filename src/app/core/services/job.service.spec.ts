import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Job } from '../models/job.model';
import { JobService } from './job.service';

describe('JobService', () => {
  let service: JobService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/jobs`;
  const job: Job = {
    jobId: 'job-1',
    title: 'Frontend Developer',
    category: 'Engineering',
    jobType: 'FULL_TIME',
    location: 'Remote',
    salaryMin: 100000,
    salaryMax: 150000,
    skills: ['Angular'],
    experienceRequired: 3,
    description: 'Build UI',
    postedBy: 'recruiter-1',
    companyName: 'HireConnect',
    vacancies: 2,
    isRemote: true,
    expiresAt: '2026-12-31',
    status: 'ACTIVE',
    postedAt: '2026-01-01',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(JobService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads jobs with a default page size when no filters are provided', () => {
    service.getJobs().subscribe((jobs) => expect(jobs).toEqual([job]));

    const request = httpMock.expectOne((req) => req.url === apiUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('size')).toBe('200');

    request.flush({ data: { content: [job] } });
  });

  it('uses the search endpoint and omits empty filters when filters are provided', () => {
    service
      .getJobs({ title: 'Angular', location: '', salaryMin: 90000 })
      .subscribe((jobs) => expect(jobs).toEqual([job]));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/search`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('title')).toBe('Angular');
    expect(request.request.params.get('salaryMin')).toBe('90000');
    expect(request.request.params.has('location')).toBeFalse();

    request.flush({ data: [job] });
  });

  it('maps job detail responses from the data property', () => {
    service.getJobById('job-1').subscribe((result) => expect(result).toEqual(job));

    const request = httpMock.expectOne(`${apiUrl}/job-1`);
    expect(request.request.method).toBe('GET');

    request.flush({ data: job });
  });

  it('creates, updates and deletes jobs through the jobs API', () => {
    service.createJob(job).subscribe((result) => expect(result).toEqual(job));
    let request = httpMock.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    request.flush({ data: job });

    service.updateJob('job-1', { title: 'Updated' }).subscribe((result) => expect(result.title).toBe('Updated'));
    request = httpMock.expectOne(`${apiUrl}/job-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ title: 'Updated' });
    request.flush({ data: { ...job, title: 'Updated' } });

    service.deleteJob('job-1').subscribe((result) => expect(result).toBeNull());
    request = httpMock.expectOne(`${apiUrl}/job-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('searches jobs and maps nested payload shapes', () => {
    service.searchJobs('Angular').subscribe((jobs) => expect(jobs).toEqual([job]));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/search`);
    expect(request.request.params.get('title')).toBe('Angular');
    expect(request.request.params.get('size')).toBe('200');

    request.flush({ data: { data: { content: [job] } } });
  });

  it('loads recruiter jobs with optional status and counts jobs', () => {
    service.getRecruiterJobs('ACTIVE', 25).subscribe((jobs) => expect(jobs).toEqual([job]));
    let request = httpMock.expectOne((req) => req.url === `${apiUrl}/recruiter`);
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('size')).toBe('25');
    request.flush({ content: [job] });

    service.countJobsByRecruiter('recruiter-1').subscribe((count) => expect(count).toBe(7));
    request = httpMock.expectOne(`${apiUrl}/recruiter/recruiter-1/count`);
    request.flush({ data: 7 });
  });

  it('pauses, resumes and closes jobs with lifecycle endpoints', () => {
    service.pauseJob('job-1').subscribe((result) => expect(result.status).toBe('PAUSED'));
    let request = httpMock.expectOne(`${apiUrl}/job-1/pause`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ data: { ...job, status: 'PAUSED' } });

    service.resumeJob('job-1').subscribe((result) => expect(result.status).toBe('ACTIVE'));
    request = httpMock.expectOne((req) => req.url === `${apiUrl}/job-1/status`);
    expect(request.request.params.get('status')).toBe('ACTIVE');
    request.flush({ data: job });

    service.closeJob('job-1').subscribe((result) => expect(result.status).toBe('CLOSED'));
    request = httpMock.expectOne(`${apiUrl}/job-1/close`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ data: { ...job, status: 'CLOSED' } });
  });

  it('updates job status using the status endpoint', () => {
    service.updateJobStatus('job-1', 'PAUSED').subscribe((result) => expect(result.status).toBe('PAUSED'));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/job-1/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.params.get('status')).toBe('PAUSED');

    request.flush({ data: { ...job, status: 'PAUSED' } });
  });

  it('returns an empty list for unrecognized job payloads', () => {
    service.getJobs({ title: 'Angular' }).subscribe((jobs) => expect(jobs).toEqual([]));

    const request = httpMock.expectOne((req) => req.url === `${apiUrl}/search`);
    request.flush({ data: { records: [job] } });
  });
});
