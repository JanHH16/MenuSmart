import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regresión: sin zone.js la vista no se actualizaba al fallar el login y el botón
  // se quedaba en "cargando" sin mostrar el aviso de credenciales incorrectas.
  it('con credenciales incorrectas muestra el aviso en pantalla y libera el botón', () => {
    const http = TestBed.inject(HttpTestingController);
    component.form.setValue({ email: 'a@b.cl', password: 'mala' });
    component.submit();
    http.expectOne((req) => req.url.endsWith('/auth/login')).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('ups, credenciales incorrectas');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('credenciales incorrectas');
    http.verify();
  });
});
