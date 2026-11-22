import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Deja el estado de red como estaba para no contaminar otras pruebas.
    window.dispatchEvent(new Event('online'));
  });

  const aviso = (): HTMLElement => fixture.nativeElement.querySelector('.ms-aviso-conexion');

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone el contenedor del aviso como región de estado accesible', () => {
    expect(aviso().getAttribute('role')).toBe('status');
    expect(aviso().getAttribute('aria-live')).toBe('polite');
  });

  it('no muestra texto mientras hay conexión', () => {
    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();

    expect(aviso().textContent?.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('ion-app')?.classList).not.toContain(
      'ms-sin-conexion',
    );
  });

  it('muestra el aviso y marca ion-app al perder la conexión, y lo quita al recuperarla', () => {
    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();

    expect(aviso().textContent).toContain('Sin conexión: mostrando los últimos datos guardados');
    expect(fixture.nativeElement.querySelector('ion-app').classList).toContain('ms-sin-conexion');

    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();

    expect(aviso().textContent?.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('ion-app').classList).not.toContain(
      'ms-sin-conexion',
    );
  });
});
