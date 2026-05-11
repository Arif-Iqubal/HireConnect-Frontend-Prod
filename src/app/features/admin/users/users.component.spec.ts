import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';
import { UsersComponent } from './users.component';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let adminService: jasmine.SpyObj<AdminService>;
  let applicationService: jasmine.SpyObj<ApplicationService>;
  let jobService: jasmine.SpyObj<JobService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let cdr: jasmine.SpyObj<ChangeDetectorRef>;

  const candidate = buildUser({
    id: '1',
    userId: '1',
    name: 'Alice Candidate',
    email: 'alice@example.com',
    role: 'CANDIDATE',
    status: 'ACTIVE',
    createdAt: '2026-05-01T10:00:00Z',
  });

  const recruiter = buildUser({
    id: '2',
    userId: '2',
    name: 'Ravi Recruiter',
    email: 'ravi@example.com',
    role: 'RECRUITER',
    status: 'SUSPENDED',
    lastLogin: '2026-05-03T10:00:00Z',
  });

  const admin = buildUser({
    id: '3',
    userId: '3',
    name: 'Ada Admin',
    email: 'ada@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    permissions: 'Full',
    joinedAt: 'bad-date',
  });

  beforeEach(async () => {
    adminService = jasmine.createSpyObj<AdminService>('AdminService', [
      'getUsers',
      'setUserActive',
      'deleteUser',
    ]);
    applicationService = jasmine.createSpyObj<ApplicationService>('ApplicationService', [
      'countApplicationsByCandidate',
    ]);
    jobService = jasmine.createSpyObj<JobService>('JobService', ['countJobsByRecruiter']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success']);
    cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);

    adminService.getUsers.and.returnValue(of(pageOf(candidate, recruiter, admin)));
    applicationService.countApplicationsByCandidate.and.returnValue(of(4));
    jobService.countJobsByRecruiter.and.returnValue(of(7));

    await TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: ApplicationService, useValue: applicationService },
        { provide: JobService, useValue: jobService },
        { provide: ToastrService, useValue: toastr },
        { provide: ChangeDetectorRef, useValue: cdr },
      ],
    }).compileComponents();

    component = TestBed.runInInjectionContext(
      () => new UsersComponent(adminService, applicationService, jobService),
    );
  });

  it('loads users, sorts by activity, applies filters and enriches activity counts', () => {
    component.ngOnInit();

    expect(component.isLoading).toBeFalse();
    expect(component.users.map((user) => user.id)).toEqual(['2', '1', '3']);
    expect(component.users.find((user) => user.id === '1')?.applications).toBe(4);
    expect(component.users.find((user) => user.id === '2')?.jobsPosted).toBe(7);

    component.searchControl.setValue('alice');
    component.roleFilter.setValue('CANDIDATE');
    component.statusFilter.setValue('ACTIVE');

    expect(component.filteredUsers).toEqual([jasmine.objectContaining({ id: '1' })]);
    expect(applicationService.countApplicationsByCandidate).toHaveBeenCalledWith('1');
    expect(jobService.countJobsByRecruiter).toHaveBeenCalledWith('2');
  });

  it('handles load and count failures without blocking the table', () => {
    adminService.getUsers.and.returnValue(of(pageOf(candidate, recruiter)));
    applicationService.countApplicationsByCandidate.and.returnValue(throwError(() => new Error('count failed')));
    jobService.countJobsByRecruiter.and.returnValue(throwError(() => new Error('count failed')));

    component.loadUsers();

    expect(component.users.find((user) => user.id === '1')?.applications).toBe(0);
    expect(component.users.find((user) => user.id === '2')?.jobsPosted).toBe(0);

    adminService.getUsers.and.returnValue(throwError(() => new Error('load failed')));
    component.loadUsers();

    expect(component.users).toEqual([]);
    expect(component.filteredUsers).toEqual([]);
    expect(component.isLoading).toBeFalse();
  });

  it('updates users for suspend, activate and delete actions after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.users = [candidate, recruiter];
    component.filteredUsers = [candidate, recruiter];

    adminService.setUserActive.and.returnValues(
      of({ ...candidate, status: 'SUSPENDED', isActive: false }),
      of({ ...recruiter, status: 'ACTIVE', isActive: true }),
    );
    adminService.deleteUser.and.returnValue(of(undefined));

    component.suspendUser('1');
    component.activateUser('2');
    component.deleteUser('1');

    expect(component.users).toEqual([jasmine.objectContaining({ id: '2', status: 'ACTIVE' })]);
    expect(adminService.setUserActive.calls.allArgs()).toEqual([
      ['1', false],
      ['2', true],
    ]);
    expect(adminService.deleteUser).toHaveBeenCalledWith('1');
    expect(toastr.success.calls.allArgs()).toEqual([
      ['User suspended successfully'],
      ['User activated successfully'],
      ['User deleted successfully'],
    ]);
  });

  it('skips destructive actions when confirmation is rejected', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.suspendUser('1');
    component.deleteUser('1');

    expect(adminService.setUserActive).not.toHaveBeenCalled();
    expect(adminService.deleteUser).not.toHaveBeenCalled();
  });

  it('exports filtered users and exposes display helpers', () => {
    const appendSpy = spyOn(document.body, 'appendChild').and.callThrough();
    const removeSpy = spyOn(document.body, 'removeChild').and.callThrough();
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    component.filteredUsers = [candidate];
    component.users = [candidate, recruiter, admin];

    component.exportUsers();

    const link = appendSpy.calls.mostRecent().args[0] as HTMLAnchorElement;
    expect(decodeURIComponent(link.href)).toContain('"Alice Candidate","alice@example.com","CANDIDATE","ACTIVE"');
    expect(link.download).toMatch(/^admin-users-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(link);
    expect(toastr.success).toHaveBeenCalledWith('Users exported successfully');

    expect(component.getRoleCount('ADMIN')).toBe(1);
    expect(component.getStatusCount('ACTIVE')).toBe(2);
    expect(component.getActivityLabel(candidate)).toBe('Joined');
    expect(component.getActivityLabel(recruiter)).toBe('Last login');
    expect(component.getActivityDate(recruiter)).toBe(recruiter.lastLogin as string);
    expect(component.getActivitySummary(candidate)).toBe('0 applications');
    expect(component.getActivitySummary(recruiter)).toBe('0 jobs posted');
    expect(component.getActivitySummary(admin)).toBe('Full access');
    expect(component.getUserInitial({ ...candidate, name: '', email: '' })).toBe('U');
  });

  function buildUser(overrides: Partial<AdminUser>): AdminUser {
    return {
      id: '0',
      userId: '0',
      name: 'User',
      fullName: 'User',
      email: 'user@example.com',
      role: 'CANDIDATE',
      status: 'ACTIVE',
      isActive: true,
      joinedAt: '2026-05-01T10:00:00Z',
      createdAt: '2026-05-01T10:00:00Z',
      ...overrides,
    };
  }

  function pageOf(...content: AdminUser[]) {
    return {
      content,
      totalElements: content.length,
      totalPages: 1,
      size: content.length,
      number: 0,
    };
  }
});
