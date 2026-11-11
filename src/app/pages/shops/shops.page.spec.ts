import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopsPage } from './shops.page';

describe('ShopsPage', () => {
  let component: ShopsPage;
  let fixture: ComponentFixture<ShopsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShopsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
