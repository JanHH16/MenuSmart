import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlanSemanalPage } from './plan-semanal.page';

describe('PlanSemanalPage', () => {
  let component: PlanSemanalPage;
  let fixture: ComponentFixture<PlanSemanalPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(PlanSemanalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
