import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import { DetalleComidaPage } from './detalle-comida.page';

describe('DetalleComidaPage', () => {
  let component: DetalleComidaPage;
  let fixture: ComponentFixture<DetalleComidaPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
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
    fixture = TestBed.createComponent(DetalleComidaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga la comida segun el id de la ruta', () => {
    expect(component.comida?.nombre).toBe('Tallarines con salsa');
  });
});
