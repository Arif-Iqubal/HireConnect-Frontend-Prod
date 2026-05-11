import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ApplicationService } from '../../../core/services/application.service';
import { InterviewService } from '../../../core/services/interview.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Job } from '../../../core/models/job.model';
import { Interview } from '../../../core/models/interview.model';
import { Invoice } from '../../../core/models/subscription.model';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;
  let adminService: jasmine.SpyObj<AdminService>;
  let subscriptionService: jasmine.SpyObj<SubscriptionService>;
  let applicationService: jasmine.SpyObj<ApplicationService>;
  let interviewService: jasmine.SpyObj<InterviewService>;
  let cdr: jasmine.SpyObj<ChangeDetectorRef>;

  const users = [
    user({ id: '1', userId: '1', role: 'CANDIDATE', joinedAt: isoDate(3), createdAt: isoDate(3) }),
    user({ id: '2', userId: '2', role: 'RECRUITER', joinedAt: isoDate(1), lastLogin: isoDate(0) }),
    user({ id: '3', userId: '3', role: 'ADMIN', joinedAt: 'not-a-date', permissions: 'Full' }),
  ];
  const jobs = [
    job({ jobId: '10', status: 'ACTIVE', postedAt: isoDate(0), applicationsCount: 2 }),
    job({ jobId: '11', status: 'CLOSED', postedAt: isoDate(2), applicationsCount: 0 }),
  ];
  const invoices = [
    { invoiceId: 'i1', totalAmount: 1200, paymentDate: isoDate(0) },
    { invoiceId: 'i2', amount: 300, createdAt: isoDate(35) },
  ] as unknown as Invoice[];
  const interviews = [
    { interviewId: 'a', applicationId: 'app-1', scheduledAt: isoDate(0) },
    { interviewId: 'a', applicationId: 'app-1', scheduledAt: isoDate(0) },
    { applicationId: 'app-2', createdAt: isoDate(35) },
  ] as unknown as Interview[];
  const analytics = {
    totalApplications: 9,
    totalOffered: 3,
    totalInterviews: 4,
    applicationsByStatus: {
      INTERVIEW_SCHEDULED: 2,
      OFFERED: 3,
    },
  };

  beforeEach(() => {
    analyticsService = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['getPlatformAnalytics']);
    adminService = jasmine.createSpyObj<AdminService>('AdminService', ['getUsers', 'getJobs']);
    subscriptionService = jasmine.createSpyObj<SubscriptionService>('SubscriptionService', ['getInvoicesByRecruiter']);
    applicationService = jasmine.createSpyObj<ApplicationService>('ApplicationService', ['countApplicationsByJob']);
    interviewService = jasmine.createSpyObj<InterviewService>('InterviewService', ['getInterviewsByRecruiter']);
    cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);

    adminService.getUsers.and.returnValue(of(pageOf(users)));
    adminService.getJobs.and.returnValue(of(jobs));
    analyticsService.getPlatformAnalytics.and.returnValue(of(analytics as any));
    subscriptionService.getInvoicesByRecruiter.and.returnValue(of(invoices));
    applicationService.countApplicationsByJob.and.returnValues(of(5), throwError(() => new Error('count failed')));
    interviewService.getInterviewsByRecruiter.and.returnValue(of(interviews));

    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: AdminService, useValue: adminService },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: ApplicationService, useValue: applicationService },
        { provide: InterviewService, useValue: interviewService },
        { provide: ChangeDetectorRef, useValue: cdr },
      ],
    });

    component = new AdminDashboardComponent(
      analyticsService,
      adminService,
      subscriptionService,
      applicationService,
      interviewService,
      cdr,
    );
  });

  it('loads and aggregates dashboard data with recruiter invoices and interviews', () => {
    component.ngOnInit();

    expect(component.isLoading).toBeFalse();
    expect(component.platformAnalytics).toBe(analytics);
    expect(component.platformStats.totalUsers).toBe(3);
    expect(component.platformStats.totalCandidates).toBe(1);
    expect(component.platformStats.totalRecruiters).toBe(1);
    expect(component.platformStats.totalJobs).toBe(2);
    expect(component.platformStats.activeJobs).toBe(1);
    expect(component.platformStats.totalApplications).toBe(5);
    expect(component.platformStats.totalInterviews).toBe(2);
    expect(component.platformStats.totalOffers).toBe(3);
    expect(component.platformStats.conversionRate).toBe(60);
    expect(component.recentUsers[0].id).toBe('2');
    expect(component.recentJobs[0].jobId).toBe('10');
    expect(component.userGrowthData).toHaveSize(12);
    expect(component.revenuePipelineData).toHaveSize(6);
    expect(component.trendStats.successRate).toBe(60);
    expect(cdr.detectChanges).toHaveBeenCalled();
  });

  it('handles empty recruiters and service fallbacks', () => {
    const candidateOnly = [users[0]];
    adminService.getUsers.and.returnValue(of(pageOf(candidateOnly)));
    adminService.getJobs.and.returnValue(throwError(() => new Error('jobs failed')));
    analyticsService.getPlatformAnalytics.and.returnValue(throwError(() => new Error('analytics failed')));

    component.loadDashboardData();

    expect(component.platformStats.totalUsers).toBe(1);
    expect(component.platformStats.totalJobs).toBe(0);
    expect(component.platformStats.totalApplications).toBe(0);
    expect(subscriptionService.getInvoicesByRecruiter).not.toHaveBeenCalled();
    expect(interviewService.getInterviewsByRecruiter).not.toHaveBeenCalled();
  });

  it('exports a CSV report and exposes trend display helpers', () => {
    const appendSpy = spyOn(document.body, 'appendChild').and.callThrough();
    const removeSpy = spyOn(document.body, 'removeChild').and.callThrough();
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    component.platformStats = {
      totalUsers: 3,
      totalCandidates: 1,
      totalRecruiters: 1,
      totalJobs: 2,
      activeJobs: 1,
      totalApplications: 5,
      totalInterviews: 2,
      totalOffers: 3,
      revenue: 1200,
      conversionRate: 60,
    };

    component.exportDashboardReport();

    const link = appendSpy.calls.mostRecent().args[0] as HTMLAnchorElement;
    expect(decodeURIComponent(link.href)).toContain('"Total Users","3"');
    expect(link.download).toMatch(/^admin-dashboard-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(link);

    expect(component.getGrowthIndicator(1)).toBe('↑');
    expect(component.getGrowthIndicator(-1)).toBe('↓');
    expect(component.getGrowthIndicator(0)).toBe('→');
    expect(component.getGrowthClass(1)).toBe('positive');
    expect(component.getGrowthClass(-1)).toBe('negative');
    expect(component.getGrowthClass(0)).toBe('neutral');
    expect(component.getTrendLabel(5)).toBe('+5%');
    expect(component.getTrendLabel(-2)).toBe('-2%');
    expect(component.getTrendBadgeClass(5)).toContain('green');
    expect(component.getTrendBadgeClass(-1)).toContain('red');
    expect(component.getTrendBadgeClass(0)).toContain('gray');
    expect(component.getTrendPath(1)).toContain('M5 10');
    expect(component.getTrendPath(-1)).toContain('M19 14');
    expect(component.getTrendPath(0)).toBe('M5 12h14');
  });

  it('covers private aggregation edge cases', () => {
    const api = component as any;

    expect(api.getAnalyticsInterviewCount({ COMPLETED: 2, UNKNOWN: 5 })).toBe(2);
    expect(api.uniqueInterviews([
      { applicationId: 'same', scheduledAt: '2026-05-01' },
      { applicationId: 'same', scheduledAt: '2026-05-01' },
      { applicationId: 'new', scheduledAt: '2026-05-01' },
    ])).toHaveSize(2);
    expect(api.percentChange(5, 0)).toBe(100);
    expect(api.percentChange(0, 0)).toBe(0);
    expect(api.percentChange(5, 10)).toBe(-50);
    expect(api.roundMoney(10.126)).toBe(10.13);
    expect(api.getDateTime('bad-date')).toBe(0);
    expect(api.toChartPoints(['A', 'B'], [0, 10])).toEqual([
      { label: 'A', value: 0, height: 3 },
      { label: 'B', value: 10, height: 100 },
    ]);
  });

  function pageOf(content: AdminUser[]) {
    return {
      content,
      totalElements: content.length,
      totalPages: 1,
      size: content.length,
      number: 0,
    };
  }

  function user(overrides: Partial<AdminUser>): AdminUser {
    return {
      id: '0',
      userId: '0',
      name: 'User',
      fullName: 'User',
      email: 'user@example.com',
      role: 'CANDIDATE',
      status: 'ACTIVE',
      isActive: true,
      joinedAt: isoDate(0),
      createdAt: isoDate(0),
      ...overrides,
    };
  }

  function job(overrides: Partial<Job>): Job {
    return {
      jobId: '0',
      title: 'Developer',
      companyName: 'HireConnect',
      location: 'Remote',
      status: 'ACTIVE',
      postedAt: isoDate(0),
      applicationsCount: 0,
      ...overrides,
    } as Job;
  }

  function isoDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }
});
