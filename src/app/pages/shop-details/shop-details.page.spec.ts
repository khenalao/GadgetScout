import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopDetailsPage } from './shop-details.page';

describe('ShopDetailsPage', () => {
  let component: ShopDetailsPage;
  let fixture: ComponentFixture<ShopDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShopDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
