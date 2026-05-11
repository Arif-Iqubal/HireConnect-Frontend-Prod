import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/subscriptions`;
  const subscription = { subscriptionId: 'sub-1', plan: 'BASIC', status: 'ACTIVE' } as any;
  const invoice = { invoiceId: 'inv-1' } as any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads current subscription and paged invoices', () => {
    service.getCurrentSubscription().subscribe((result) => expect(result).toEqual(subscription));
    let request = httpMock.expectOne(`${apiUrl}/active`);
    request.flush({ data: subscription });

    service.getInvoices().subscribe((result) => expect(result).toEqual([invoice]));
    request = httpMock.expectOne(`${apiUrl}/invoices`);
    request.flush({ data: { content: [invoice] } });
  });

  it('creates and verifies Razorpay payments', () => {
    service.createRazorpayOrder('BASIC' as any).subscribe((order) => expect(order.orderId).toBe('order-1'));
    let request = httpMock.expectOne(`${apiUrl}/payments/razorpay/order`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ plan: 'BASIC' });
    request.flush({ data: { orderId: 'order-1' } });

    const payload = {
      plan: 'BASIC' as any,
      paymentMode: 'RAZORPAY' as any,
      razorpayOrderId: 'order-1',
      razorpayPaymentId: 'payment-1',
      razorpaySignature: 'signature',
    };
    service.verifyRazorpayPayment(payload).subscribe((result) => expect(result).toEqual(subscription));
    request = httpMock.expectOne(`${apiUrl}/payments/razorpay/verify`);
    expect(request.request.body).toEqual(payload);
    request.flush({ data: subscription });
  });

  it('cancels and renews subscriptions', () => {
    service.cancelSubscription().subscribe((result) => expect(result).toEqual(subscription));
    let request = httpMock.expectOne(`${apiUrl}/cancel`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ data: subscription });

    service.renewSubscription('PREMIUM' as any, 'CARD' as any).subscribe((result) => expect(result).toEqual(subscription));
    request = httpMock.expectOne(`${apiUrl}/renew`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ plan: 'PREMIUM', paymentMode: 'CARD' });
    request.flush({ data: subscription });
  });
});
