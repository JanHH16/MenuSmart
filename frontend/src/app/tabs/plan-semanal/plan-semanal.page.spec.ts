import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanSemanalPage } from './plan-semanal.page';

describe('PlanSemanalPage', () => {
  let component: PlanSemanalPage;
  let fixture: ComponentFixture<PlanSemanalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanSemanalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
