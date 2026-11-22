import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import { DetalleComidaPage } from './detalle-comida.page';

const comidaApi = {
  id: 'm1',
  nombre: 'Tallarines con salsa',
  tipo: 'almuerzo',
  diaSemana: 'lunes',
  notas: 'para 3 personas',
  ingredientes: [
    { id: 'i1', nombre: 'Tallarines', cantidad: 400, unidad: 'g' },
    { id: 'i2', nombre: 'Tomate', cantidad: 4, unidad: 'un' },
  ],
};

describe('DetalleComidaPage', () => {
  let component: DetalleComidaPage;
  let fixture: ComponentFixture<DetalleComidaPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // ModalController real depende de AngularDelegate (solo la aporta
        // IonicModule.forRoot() en la app real); para el test alcanza con
        // un mock, ya que estos specs no llegan a abrir el modal.
        { provide: ModalController, useValue: { create: () => Promise.resolve() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'm1' }) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetalleComidaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/meals/m1')).flush(comidaApi);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga la comida según el id de la ruta, con las cantidades legibles', () => {
    expect(component.comida?.nombre).toBe('Tallarines con salsa');
    expect(component.comida?.ingredientes.map((i) => i.cantidad)).toEqual(['400 g', '4 unid.']);
    expect(component.cargando).toBe(false);
  });

  it('quita un ingrediente reenviando solo los que quedan', async () => {
    const quitado = component.eliminarIngrediente('i1');
    const peticion = http.expectOne((req) => req.method === 'PATCH' && req.url.endsWith('/meals/m1'));
    expect(peticion.request.body).toEqual({
      ingredientes: [{ nombre: 'Tomate', cantidad: 4, unidad: 'unid.' }],
    });
    peticion.flush({ ...comidaApi, ingredientes: [comidaApi.ingredientes[1]] });
    await quitado;

    expect(component.comida?.ingredientes).toHaveLength(1);
    expect(component.error).toBe('');
  });

  it('muestra un aviso si no se pudo quitar el ingrediente', async () => {
    const quitado = component.eliminarIngrediente('i1');
    http.expectOne((req) => req.method === 'PATCH').flush('error', { status: 500, statusText: 'Error' });
    await quitado;

    expect(component.error).toContain('No se pudo quitar');
    expect(component.comida?.ingredientes).toHaveLength(2);
  });
});
