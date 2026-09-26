import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let router: { parseUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { isAuthenticated: vi.fn() };
    router = { parseUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
  }

  it('permite el acceso si el usuario esta autenticado', () => {
    authService.isAuthenticated.mockReturnValue(true);

    expect(runGuard()).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('redirige a /login si el usuario no esta autenticado', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const fakeUrlTree = {} as UrlTree;
    router.parseUrl.mockReturnValue(fakeUrlTree);

    expect(runGuard()).toBe(fakeUrlTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
  });
});
