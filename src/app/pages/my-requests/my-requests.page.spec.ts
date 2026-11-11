import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyRequestsPage } from './my-requests.page';

describe('MyRequestsPage', () => {
  let component: MyRequestsPage;
  let fixture: ComponentFixture<MyRequestsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyRequestsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
