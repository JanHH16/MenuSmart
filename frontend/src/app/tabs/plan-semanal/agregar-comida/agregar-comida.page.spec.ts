import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import { AgregarComidaPage } from './agregar-comida.page';

describe('AgregarComidaPage', () => {
  let component: AgregarComidaPage;
  let fixture: ComponentFixture<AgregarComidaPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        // ModalController real depende de AngularDelegate (solo la aporta
        // IonicModule.forRoot() en la app real); para el test alcanza con
        // un mock, ya que estos specs no llegan a abrir el modal.
        { provide: ModalController, useValue: { create: () => Promise.resolve() } },
      ],
    });
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
});
