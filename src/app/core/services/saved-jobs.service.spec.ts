import { TestBed } from '@angular/core/testing';
import { SavedJobsService } from './saved-jobs.service';

describe('SavedJobsService', () => {
  let service: SavedJobsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavedJobsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when no jobs are saved', () => {
    expect(service.getSavedJobIds()).toEqual([]);
  });

  it('normalizes saved job ids to strings', () => {
    localStorage.setItem('savedJobs', JSON.stringify([1, '2']));

    expect(service.getSavedJobIds()).toEqual(['1', '2']);
  });

  it('clears invalid storage data', () => {
    localStorage.setItem('savedJobs', '{bad-json');

    expect(service.getSavedJobIds()).toEqual([]);
    expect(localStorage.getItem('savedJobs')).toBeNull();
  });

  it('toggles and removes saved jobs', () => {
    expect(service.toggle('job-1')).toBeTrue();
    expect(service.isSaved('job-1')).toBeTrue();

    expect(service.toggle('job-1')).toBeFalse();
    expect(service.isSaved('job-1')).toBeFalse();

    service.toggle('job-2');
    service.remove('job-2');
    expect(service.getSavedJobIds()).toEqual([]);
  });
});
