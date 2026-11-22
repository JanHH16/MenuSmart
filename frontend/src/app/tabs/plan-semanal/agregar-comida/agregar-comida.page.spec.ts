import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import { AgregarComidaPage } from './agregar-comida.page';

describe('AgregarComidaPage', () => {
  let component: AgregarComidaPage;
  let fixture: ComponentFixture<AgregarComidaPage>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // ModalController real depende de AngularDelegate (solo la aporta
        // IonicModule.forRoot() en la app real); para el test alcanza con
        // un mock, ya que estos specs no llegan a abrir el modal.
        { provide: ModalController, useValue: { create: () => Promise.resolve() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AgregarComidaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no permite guardar sin nombre', () => {
    component.nombre = '   ';
    expect(component.puedeGuardar).toBe(false);
  });

  it('permite guardar con nombre', () => {
    component.nombre = 'Lasaña de verduras';
    expect(component.puedeGuardar).toBe(true);
  });

  it('envía la comida al backend con sus ingredientes y vuelve al plan', async () => {
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.nombre = 'Lasaña';
    component.ingredientes = [{ nombre: 'Fideos', cantidad: '400 g' }];

    const guardado = component.guardar();
    const peticion = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/meals'));
    expect(peticion.request.body).toMatchObject({
      nombre: 'Lasaña',
      tipo: 'almuerzo',
      diaSemana: 'viernes',
      ingredientes: [{ nombre: 'Fideos', cantidad: 400, unidad: 'g' }],
    });
    peticion.flush({
      id: 'x',
      nombre: 'Lasaña',
      tipo: 'almuerzo',
      diaSemana: 'viernes',
      notas: null,
      ingredientes: [],
    });
    await guardado;

    expect(navegar).toHaveBeenCalledWith('/tabs/plan-semanal');
    expect(component.error).toBe('');
  });

  it('avisa si el backend rechaza la comida y no sale de la pantalla', async () => {
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.nombre = 'Lasaña';

    const guardado = component.guardar();
    http
      .expectOne((req) => req.method === 'POST')
      .flush('error', { status: 500, statusText: 'Server Error' });
    await guardado;

    expect(component.error).toContain('No se pudo guardar');
    expect(navegar).not.toHaveBeenCalled();
    expect(component.guardando).toBe(false);
  });
});
