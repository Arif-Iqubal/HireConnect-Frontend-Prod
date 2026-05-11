import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const authService = jasmine.createSpyObj<AuthService>('AuthService', ['hasRole']);

  const route = {
    data: { role: 'RECRUITER' },
  } as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    router.navigate.calls.reset();
    authService.hasRole.calls.reset();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('allows users with the required role', () => {
    authService.hasRole.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => roleGuard(route));

    expect(result).toBeTrue();
    expect(authService.hasRole).toHaveBeenCalledWith('RECRUITER');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects users without the required role', () => {
    authService.hasRole.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => roleGuard(route));

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
