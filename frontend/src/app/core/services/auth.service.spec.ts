import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('guarda el token al hacer login', () => {
    service.login({ email: 'a@a.com', password: '123456' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ accessToken: 'abc123' });

    expect(service.getToken()).toBe('abc123');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('guarda el token al registrarse', () => {
    service.register({ name: 'A', email: 'a@a.com', password: '123456' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ accessToken: 'xyz789' });

    expect(service.getToken()).toBe('xyz789');
  });

  it('logout elimina el token', () => {
    localStorage.setItem('menusmart_token', 'abc123');

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated es false cuando no hay token', () => {
    expect(service.isAuthenticated()).toBe(false);
  });
});
