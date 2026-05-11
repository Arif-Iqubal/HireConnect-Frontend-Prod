import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { JobService } from '../../../core/services/job.service';
import { Job } from '../../../core/models/job.model';
import { SavedJobsService } from '../../../core/services/saved-jobs.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';

type SortOption = 'recent' | 'salaryHigh' | 'salaryLow' | 'title' | 'experience';

interface JobFilters {
  title: string;
  location: string;
  category: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceRange: { min: number; max: number } | null;
}

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.scss'],
})
export class JobListComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  allJobs: Job[] = [];
  filterForm: FormGroup;
  sortControl = new FormControl<SortOption>('recent', { nonNullable: true });
  isLoading = true;
  totalJobs = 0;
  currentPage = 1;
  pageSize = 10;
  appliedJobIds = new Set<string>();

  categories: string[] = [];
  jobTypes: string[] = [];
  experienceLevels = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Executive'];
  locations: string[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private savedJobsService: SavedJobsService,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.filterForm = this.fb.group({
      title: [''],
      location: [''],
      category: [''],
      type: [''],
      salaryMin: [''],
      salaryMax: [''],
      experienceLevel: [''],
    });
  }

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.filterForm.patchValue({
          title: params['title'] || params['q'] || '',
          location: params['location'] || '',
          category: params['category'] || '',
          type: params['type'] || params['jobType'] || '',
          salaryMin: params['salaryMin'] || params['minSalary'] || '',
          salaryMax: params['salaryMax'] || params['maxSalary'] || '',
          experienceLevel: params['experienceLevel'] || '',
        }, { emitEvent: false });

        this.sortControl.setValue((params['sort'] as SortOption) || 'recent', { emitEvent: false });
        this.currentPage = Math.max(Number(params['page'] || 1), 1);
        this.applyJobView();
      });

    this.loadJobs();
    this.loadAppliedJobs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobs(): void {
    this.isLoading = true;

    this.jobService.getJobs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: jobs => {
          this.allJobs = (jobs || []).filter(job => !job.status || job.status === 'ACTIVE');
          this.buildFilterOptions();
          this.applyJobView();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: err => {
          console.error('Unable to load jobs', err);
          this.allJobs = [];
          this.jobs = [];
          this.totalJobs = 0;
          this.buildFilterOptions();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.applyJobView();
    this.updateQueryParams();
  }

  resetFilters(): void {
    this.filterForm.reset({
      title: '',
      location: '',
      category: '',
      type: '',
      salaryMin: '',
      salaryMax: '',
      experienceLevel: '',
    }, { emitEvent: false });
    this.sortControl.setValue('recent', { emitEvent: false });
    this.currentPage = 1;
    this.applyJobView();
    this.router.navigate(['/jobs']);
  }

  changeSort(): void {
    this.applyFilters();
  }

  goToPage(page: number): void {
    const nextPage = Math.min(Math.max(page, 1), this.totalPages || 1);
    if (nextPage === this.currentPage) {
      return;
    }

    this.currentPage = nextPage;
    this.applyJobView();
    this.updateQueryParams();
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalJobs / this.pageSize), 1);
  }

  get showingFrom(): number {
    if (!this.totalJobs) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalJobs);
  }

  updateQueryParams(): void {
    const filters = this.filterForm.value;
    const params: Record<string, string | number> = {};

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value;
      }
    });

    if (this.sortControl.value !== 'recent') {
      params['sort'] = this.sortControl.value;
    }

    if (this.currentPage > 1) {
      params['page'] = this.currentPage;
    }

    this.router.navigate([], { queryParams: params });
  }

  saveJob(jobId: string): void {
    this.savedJobsService.toggle(jobId);
  }

  isJobSaved(jobId: string): boolean {
    return this.savedJobsService.isSaved(jobId);
  }

  hasApplied(jobId: string): boolean {
    return this.appliedJobIds.has(String(jobId));
  }

  formatJobType(jobType?: string): string {
    return (jobType || '')
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  salaryLabel(job: Job): string {
    if (!job.salaryMin && !job.salaryMax) {
      return 'Salary not disclosed';
    }

    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    if (job.salaryMin && job.salaryMax) {
      return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
    }

    return formatter.format(job.salaryMin || job.salaryMax);
  }

  companyInitial(job: Job): string {
    return (job.companyName || job.title || 'H').trim().charAt(0).toUpperCase();
  }

  trackByJobId(_: number, job: Job): string {
    return job.jobId;
  }

  private loadAppliedJobs(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'CANDIDATE') {
      this.appliedJobIds.clear();
      return;
    }

    this.applicationService.getMyApplications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: applications => {
          this.appliedJobIds = new Set(
            (applications || [])
              .filter(application => !application.isWithdrawn && application.status !== 'WITHDRAWN')
              .map(application => String(application.jobId))
          );
          this.cdr.detectChanges();
        },
        error: () => {
          this.appliedJobIds.clear();
          this.cdr.detectChanges();
        },
      });
  }

  private applyJobView(): void {
    const filteredJobs = this.sortJobs(this.filterJobs(this.allJobs));
    this.totalJobs = filteredJobs.length;

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    this.jobs = filteredJobs.slice(start, start + this.pageSize);
  }

  private filterJobs(jobs: Job[]): Job[] {
    const filters = this.getActiveFilters();
    return jobs.filter(job => this.matchesFilters(job, filters));
  }

  private getActiveFilters(): JobFilters {
    const filters = this.filterForm.value;

    return {
      title: this.normalize(filters.title),
      location: this.normalize(filters.location),
      category: this.normalize(filters.category),
      type: filters.type || '',
      salaryMin: this.toNumber(filters.salaryMin),
      salaryMax: this.toNumber(filters.salaryMax),
      experienceRange: this.experienceRange(filters.experienceLevel),
    };
  }

  private matchesFilters(job: Job, filters: JobFilters): boolean {
    return this.matchesSearch(job, filters.title)
      && this.matchesLocation(job, filters.location)
      && this.matchesCategory(job, filters.category)
      && this.matchesType(job, filters.type)
      && this.matchesSalary(job, filters.salaryMin, filters.salaryMax)
      && this.matchesExperience(job, filters.experienceRange);
  }

  private matchesSearch(job: Job, title: string): boolean {
    if (!title) {
      return true;
    }

    const searchableText = [
      job.title,
      job.companyName,
      job.category,
      job.description,
      ...(job.skills || []),
    ].map(value => this.normalize(value)).join(' ');

    return searchableText.includes(title);
  }

  private matchesLocation(job: Job, location: string): boolean {
    if (!location) {
      return true;
    }

    const jobLocation = this.normalize(job.location);
    const isRemoteSearch = location.includes('remote');
    const isRemoteJob = job.isRemote || job.jobType === 'REMOTE' || jobLocation.includes('remote');
    return jobLocation.includes(location) || (isRemoteSearch && isRemoteJob);
  }

  private matchesCategory(job: Job, category: string): boolean {
    return !category || this.normalize(job.category) === category;
  }

  private matchesType(job: Job, type: string): boolean {
    return !type || job.jobType === type;
  }

  private matchesSalary(job: Job, salaryMin: number | null, salaryMax: number | null): boolean {
    const meetsMin = salaryMin === null || (!!job.salaryMax && job.salaryMax >= salaryMin);
    const meetsMax = salaryMax === null || (!!job.salaryMin && job.salaryMin <= salaryMax);
    return meetsMin && meetsMax;
  }

  private matchesExperience(job: Job, experienceRange: { min: number; max: number } | null): boolean {
    if (!experienceRange) {
      return true;
    }

    const exp = job.experienceRequired ?? 0;
    return exp >= experienceRange.min && exp <= experienceRange.max;
  }

  private sortJobs(jobs: Job[]): Job[] {
    const sorted = [...jobs];

    switch (this.sortControl.value) {
      case 'salaryHigh':
        return sorted.sort((a, b) => (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0));
      case 'salaryLow':
        return sorted.sort((a, b) => (a.salaryMin || a.salaryMax || 0) - (b.salaryMin || b.salaryMax || 0));
      case 'title':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'experience':
        return sorted.sort((a, b) => (a.experienceRequired || 0) - (b.experienceRequired || 0));
      case 'recent':
      default:
        return sorted.sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
    }
  }

  private buildFilterOptions(): void {
    this.categories = this.uniqueSorted(this.allJobs.map(job => job.category));
    this.jobTypes = this.uniqueSorted(this.allJobs.map(job => job.jobType));
    this.locations = this.uniqueSorted(this.allJobs.map(job => job.location)).slice(0, 12);
  }

  private uniqueSorted(values: Array<string | undefined | null>): string[] {
    return Array.from(new Set(values.map(value => value?.trim()).filter((value): value is string => !!value)))
      .sort((a, b) => a.localeCompare(b));
  }

  private normalize(value: unknown): string {
    return String(value || '').trim().toLowerCase();
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private experienceRange(level: string): { min: number; max: number } | null {
    switch (level) {
      case 'Entry Level':
        return { min: 0, max: 1 };
      case 'Mid Level':
        return { min: 2, max: 4 };
      case 'Senior Level':
        return { min: 5, max: 6 };
      case 'Lead':
        return { min: 7, max: 9 };
      case 'Executive':
        return { min: 10, max: Number.MAX_SAFE_INTEGER };
      default:
        return null;
    }
  }
}
