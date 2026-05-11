import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { ApplicationService } from '../../../core/services/application.service';
import { JobService } from '../../../core/services/job.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  isLoading = true;
  searchControl = new FormControl('');
  roleFilter = new FormControl('ALL');
  statusFilter = new FormControl('ALL');

  roles = ['ALL', 'CANDIDATE', 'RECRUITER', 'ADMIN'];
  statuses = ['ALL', 'ACTIVE', 'SUSPENDED'];

  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private adminService: AdminService,
    private applicationService: ApplicationService,
    private jobService: JobService,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
    this.roleFilter.valueChanges.subscribe(() => this.applyFilters());
    this.statusFilter.valueChanges.subscribe(() => this.applyFilters());
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getUsers({ size: 200 }).subscribe({
      next: (page) => {
        this.users = this.sortByActivity(page.content);
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
        this.loadUserActivityCounts();
      },
      error: () => {
        this.users = [];
        this.filteredUsers = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    const search = this.searchControl.value?.toLowerCase() || '';
    const role = this.roleFilter.value;
    const status = this.statusFilter.value;

    this.filteredUsers = this.users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search);
      const matchesRole = role === 'ALL' || user.role === role;
      const matchesStatus = status === 'ALL' || user.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  suspendUser(userId: string): void {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    this.adminService.setUserActive(userId, false).subscribe({
      next: (updatedUser) => {
        this.users = this.users.map((user) => user.id === userId ? updatedUser : user);
        this.applyFilters();
        this.toastr.success('User suspended successfully');
        this.cdr.detectChanges();
      },
    });
  }

  activateUser(userId: string): void {
    this.adminService.setUserActive(userId, true).subscribe({
      next: (updatedUser) => {
        this.users = this.users.map((user) => user.id === userId ? updatedUser : user);
        this.applyFilters();
        this.toastr.success('User activated successfully');
        this.cdr.detectChanges();
      },
    });
  }

  deleteUser(userId: string): void {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    this.adminService.deleteUser(userId).subscribe({
      next: () => {
        this.users = this.users.filter((user) => user.id !== userId);
        this.applyFilters();
        this.toastr.success('User deleted successfully');
        this.cdr.detectChanges();
      },
    });
  }

  exportUsers(): void {
    const rows = [
      ['Name', 'Email', 'Role', 'Status', 'Joined', 'Last Login'],
      ...this.filteredUsers.map((user) => [
        user.name,
        user.email,
        user.role,
        user.status,
        user.joinedAt || '',
        user.lastLogin || '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastr.success('Users exported successfully');
  }

  getRoleCount(role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN'): number {
    return this.users.filter((user) => user.role === role).length;
  }

  getStatusCount(status: 'ACTIVE' | 'SUSPENDED'): number {
    return this.users.filter((user) => user.status === status).length;
  }

  getActivityLabel(user: AdminUser): string {
    return user.lastLogin ? 'Last login' : 'Joined';
  }

  getActivityDate(user: AdminUser): string {
    return user.lastLogin || user.createdAt || user.joinedAt;
  }

  getActivitySummary(user: AdminUser): string {
    if (user.role === 'CANDIDATE') {
      return `${user.applications || 0} applications`;
    }

    if (user.role === 'RECRUITER') {
      return `${user.jobsPosted || 0} jobs posted`;
    }

    return `${user.permissions || 'Full'} access`;
  }

  getUserInitial(user: AdminUser): string {
    return (user.name || user.email || 'U').charAt(0).toUpperCase();
  }

  private sortByActivity(users: AdminUser[]): AdminUser[] {
    return [...users].sort((a, b) => this.getActivityTime(b) - this.getActivityTime(a));
  }

  private loadUserActivityCounts(): void {
    const countRequests = this.users
      .filter((user) => user.role === 'CANDIDATE' || user.role === 'RECRUITER')
      .map((user) => {
        const count$ = user.role === 'CANDIDATE'
          ? this.applicationService.countApplicationsByCandidate(user.userId || user.id)
          : this.jobService.countJobsByRecruiter(user.userId || user.id);

        return count$.pipe(
          map((count) => ({ userId: user.id, role: user.role, count })),
          catchError(() => of({ userId: user.id, role: user.role, count: 0 }))
        );
      });

    if (countRequests.length === 0) {
      return;
    }

    forkJoin(countRequests).subscribe((counts) => {
      const countByUserId = new Map(counts.map((item) => [item.userId, item]));
      this.users = this.users.map((user) => {
        const item = countByUserId.get(user.id);
        if (!item) return user;

        return {
          ...user,
          applications: item.role === 'CANDIDATE' ? item.count : user.applications,
          jobsPosted: item.role === 'RECRUITER' ? item.count : user.jobsPosted,
        };
      });
      this.applyFilters();
      this.cdr.detectChanges();
    });
  }

  private getActivityTime(user: AdminUser): number {
    return Math.max(
      this.getDateTime(user.lastLogin),
      this.getDateTime(user.createdAt),
      this.getDateTime(user.joinedAt),
    );
  }

  private getDateTime(value?: string): number {
    if (!value) return 0;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
