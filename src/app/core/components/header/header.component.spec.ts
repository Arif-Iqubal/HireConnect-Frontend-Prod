import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { Notification } from '../../models/notification.model';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let currentUser$: BehaviorSubject<User | null>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;
  let cdr: jasmine.SpyObj<ChangeDetectorRef>;
  let host: HTMLElement;

  const candidate: User = {
    userId: '1',
    email: 'candidate@example.com',
    fullName: 'Candidate User',
    role: 'CANDIDATE',
  };

  const recruiter: User = {
    userId: '2',
    email: 'recruiter@example.com',
    role: 'RECRUITER',
  };

  const admin: User = {
    userId: '3',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  beforeEach(() => {
    currentUser$ = new BehaviorSubject<User | null>(null);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout'], {
      currentUser$: currentUser$.asObservable(),
    });
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'getUnreadCount',
      'getMyNotifications',
    ]);
    notificationService.getUnreadCount.and.returnValue(of(4));
    notificationService.getMyNotifications.and.returnValue(
      of(Array.from({ length: 6 }, (_, index) => ({ notificationId: String(index) } as Notification)))
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
    host = document.createElement('header');

    component = new HeaderComponent(
      authService,
      notificationService,
      router,
      cdr,
      new ElementRef(host)
    );
  });

  it('builds guest links and clears user-specific state on logout state', fakeAsync(() => {
    component.unreadCount = 9;
    component.recentNotifications = [{ notificationId: 'old' } as Notification];

    component.ngOnInit();
    tick();

    expect(component.currentUser).toBeNull();
    expect(component.desktopLinks.map((link) => link.route)).toEqual(['/jobs', '/auth/login', '/auth/register']);
    expect(component.unreadCount).toBe(0);
    expect(component.recentNotifications).toEqual([]);
  }));

  it('loads notification state and candidate links for signed in users', fakeAsync(() => {
    component.ngOnInit();
    currentUser$.next(candidate);
    tick();

    expect(component.currentUser).toEqual(candidate);
    expect(component.unreadCount).toBe(4);
    expect(component.recentNotifications).toHaveSize(5);
    expect(component.desktopLinks.map((link) => link.route)).toContain('/candidate/dashboard');
  }));

  it('returns role-specific destinations', () => {
    component.currentUser = null;
    expect(component.getLogoLink()).toBe('/home');
    expect(component.isLogoClickable()).toBeTrue();
    expect(component.getRoleLabel()).toBe('Hiring platform');
    expect(component.getNotificationLink()).toBe('/notifications');
    expect(component.getDashboardLink()).toBe('/home');
    expect(component.getProfileLink()).toBe('/home');
    expect(component.getJobsLink()).toBe('/jobs');

    component.currentUser = candidate;
    expect(component.getLogoLink()).toBe('/candidate/dashboard');
    expect(component.getNotificationLink()).toBe('/candidate/notifications');
    expect(component.getProfileLink()).toBe('/candidate/profile');
    expect(component.getJobsLink()).toBe('/candidate/jobs');

    component.currentUser = recruiter;
    expect(component.isLogoClickable()).toBeFalse();
    expect(component.getNotificationLink()).toBe('/recruiter/notifications');
    expect(component.getDashboardLink()).toBe('/recruiter/dashboard');
    expect(component.getProfileLink()).toBe('/recruiter/profile');

    component.currentUser = admin;
    expect(component.getRoleLabel()).toBe('admin');
    expect(component.getNotificationLink()).toBe('/admin/notifications');
    expect(component.getDashboardLink()).toBe('/admin/dashboard');
    expect(component.getProfileLink()).toBe('/admin/dashboard');
  });

  it('keeps only one drawer open and refreshes notifications when opening the notification drawer', () => {
    component.isProfileMenuOpen = true;
    component.toggleMenu();
    expect(component.isMenuOpen).toBeTrue();
    expect(component.isProfileMenuOpen).toBeFalse();

    component.toggleProfileMenu();
    expect(component.isProfileMenuOpen).toBeTrue();
    expect(component.isMenuOpen).toBeFalse();

    component.toggleNotification();
    expect(component.isNotificationOpen).toBeTrue();
    expect(component.isProfileMenuOpen).toBeFalse();
    expect(notificationService.getMyNotifications).toHaveBeenCalled();
    expect(notificationService.getUnreadCount).toHaveBeenCalled();
  });

  it('closes drawers from outside click, escape and logout', () => {
    component.isMenuOpen = true;
    component.isProfileMenuOpen = true;
    component.isNotificationOpen = true;

    component.onDocumentClick(new MouseEvent('click'));

    expect(component.isMenuOpen).toBeFalse();
    expect(component.isProfileMenuOpen).toBeFalse();
    expect(component.isNotificationOpen).toBeFalse();

    component.toggleMenu();
    component.onEscape();
    expect(component.isMenuOpen).toBeFalse();

    component.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('does not close drawers when clicking inside the header', () => {
    component.isMenuOpen = true;
    const button = document.createElement('button');
    host.appendChild(button);

    component.onDocumentClick({ target: button } as unknown as MouseEvent);

    expect(component.isMenuOpen).toBeTrue();
  });
});
