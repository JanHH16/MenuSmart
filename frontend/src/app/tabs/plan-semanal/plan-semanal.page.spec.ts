import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PlanSemanalPage } from './plan-semanal.page';

describe('PlanSemanalPage', () => {
  let component: PlanSemanalPage;
  let fixture: ComponentFixture<PlanSemanalPage>;
  let carga: TestRequest;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanSemanalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    carga = http.expectOne((req) => req.url.endsWith('/meals'));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('pide al backend las comidas de la semana y muestra el estado de carga', () => {
    expect(carga.request.params.has('semana')).toBe(true);
    expect(component.estado()).toBe('cargando');
  });

  it('ordena las comidas recibidas en el día que corresponde', async () => {
    carga.flush([
      { id: 'a', nombre: 'Cazuela', tipo: 'almuerzo', diaSemana: 'jueves', notas: null, ingredientes: [] },
      { id: 'b', nombre: 'Tortilla', tipo: 'cena', diaSemana: 'jueves', notas: null, ingredientes: [] },
    ]);
    await fixture.whenStable();

    const jueves = component.semana().find((dia) => dia.nombre === 'Jueves');
    expect(jueves?.comidas.map((comida) => comida.nombre)).toEqual(['Cazuela', 'Tortilla']);
    expect(jueves?.comidas[0].tipo).toBe('Almuerzo');
    expect(component.estado()).toBe('listo');
  });

  it('muestra el error si el backend no responde', async () => {
    carga.flush('error', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(component.estado()).toBe('error');
  });
});
