import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Job } from '../models/job.model';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  const authUrl = `${environment.apiUrl}/auth`;
  const jobsUrl = `${environment.apiUrl}/jobs`;
  const job = { jobId: 'job-1', title: 'Developer', status: 'ACTIVE' } as Job;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads users with filters and normalizes admin user fields', () => {
    service.getUsers({ page: 2, size: 25, role: 'ADMIN', active: true, search: 'root' }).subscribe((page) => {
      expect(page.content[0]).toEqual(jasmine.objectContaining({
        id: '9',
        userId: '9',
        name: 'root',
        status: 'ACTIVE',
        permissions: 'Full',
      }));
    });

    const request = httpMock.expectOne((req) => req.url === `${authUrl}/users`);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('25');
    expect(request.request.params.get('role')).toBe('ADMIN');
    expect(request.request.params.get('active')).toBe('true');
    expect(request.request.params.get('search')).toBe('root');
    request.flush({ data: { content: [{ userId: 9, email: 'root@example.com', role: 'ADMIN', isActive: true }] } });
  });

  it('does not send ALL status when loading admin jobs', () => {
    service.getJobs('ALL').subscribe((jobs) => expect(jobs).toEqual([job]));

    const request = httpMock.expectOne((req) => req.url === `${jobsUrl}/admin`);
    expect(request.request.params.get('size')).toBe('200');
    expect(request.request.params.has('status')).toBeFalse();
    request.flush({ data: { content: [job] } });
  });

  it('updates user activity and job status', () => {
    service.setUserActive('9', false).subscribe((user) => expect(user.status).toBe('SUSPENDED'));
    let request = httpMock.expectOne((req) => req.url === `${authUrl}/users/9/active`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.params.get('active')).toBe('false');
    request.flush({ data: { id: 9, email: 'user@example.com', role: 'CANDIDATE', isActive: false } });

    service.setJobStatus('job-1', 'PAUSED').subscribe((updatedJob) => expect(updatedJob.status).toBe('PAUSED'));
    request = httpMock.expectOne((req) => req.url === `${jobsUrl}/job-1/status`);
    expect(request.request.params.get('status')).toBe('PAUSED');
    request.flush({ data: { ...job, status: 'PAUSED' } });
  });
});
