import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CandidateProfile } from '../models/candidate.model';
import { RecruiterProfile } from '../models/recruiter.model';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/profiles`;
  const candidate = { fullName: 'Candidate', email: 'candidate@example.com' } as CandidateProfile;
  const recruiter = { fullName: 'Recruiter', email: 'recruiter@example.com', companyName: 'HireConnect' } as RecruiterProfile;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads the current candidate profile', () => {
    service.getCandidateProfile().subscribe((result) => expect(result).toEqual(candidate));

    const request = httpMock.expectOne(`${apiUrl}/candidate/me`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: candidate });
  });

  it('uploads resumes as multipart form data', () => {
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' });

    service.uploadResume(file).subscribe((result) => expect(result.resumeUrl).toBe('/uploads/resume.pdf'));

    const request = httpMock.expectOne(`${apiUrl}/candidate/resume`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBeTrue();
    expect(request.request.body.get('resume')).toBe(file);
    request.flush({ data: { resumeUrl: '/uploads/resume.pdf' } });
  });

  it('returns an empty resume URL when the backend has no data', () => {
    service.getCandidateResumeUrl('5').subscribe((result) => expect(result).toBe(''));

    const request = httpMock.expectOne(`${apiUrl}/candidate/5/resume-url`);
    request.flush({ data: null });
  });

  it('creates and updates recruiter profiles', () => {
    service.createRecruiterProfile(recruiter).subscribe((result) => expect(result).toEqual(recruiter));
    let request = httpMock.expectOne(`${apiUrl}/recruiter`);
    expect(request.request.method).toBe('POST');
    request.flush({ data: recruiter });

    service.updateRecruiterProfile({ companyName: 'NewCo' }).subscribe((result) => expect(result.companyName).toBe('NewCo'));
    request = httpMock.expectOne(`${apiUrl}/recruiter`);
    expect(request.request.method).toBe('PUT');
    request.flush({ data: { ...recruiter, companyName: 'NewCo' } });
  });
});
