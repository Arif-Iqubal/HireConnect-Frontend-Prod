import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/notifications`;
  const notification = { notificationId: 'n-1', title: 'Interview' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps paged notification responses', () => {
    service.getMyNotifications().subscribe((result) => expect(result).toEqual([notification] as any));

    const request = httpMock.expectOne(`${apiUrl}/my`);
    request.flush({ data: { content: [notification] } });
  });

  it('supports both unread count response shapes', () => {
    service.getUnreadCount().subscribe((result) => expect(result).toBe(3));
    let request = httpMock.expectOne(`${apiUrl}/unread/count`);
    request.flush({ data: { unreadCount: 3 } });

    service.getUnreadCount().subscribe((result) => expect(result).toBe(2));
    request = httpMock.expectOne(`${apiUrl}/unread/count`);
    request.flush({ data: { count: 2 } });
  });

  it('marks one or all notifications as read', () => {
    service.markAsRead('n-1').subscribe((result) => expect(result).toEqual(notification as any));
    let request = httpMock.expectOne(`${apiUrl}/n-1/read`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ data: notification });

    service.markAllAsRead().subscribe((result) => expect(result).toBe(4));
    request = httpMock.expectOne(`${apiUrl}/read-all`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ data: 4 });
  });
});
