import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pantalla } from './pantalla';

describe('Pantalla', () => {
  let component: Pantalla;
  let fixture: ComponentFixture<Pantalla>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pantalla]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pantalla);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
