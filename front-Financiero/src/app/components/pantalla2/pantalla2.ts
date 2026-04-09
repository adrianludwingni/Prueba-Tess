import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { Pantalla } from '../pantalla/pantalla';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pantalla2',
  standalone: true,
  imports: [CommonModule, FormsModule, Pantalla],
  templateUrl: './pantalla2.html',
  styleUrls: ['./pantalla2.css']
})
export class Pantalla2 implements OnInit {
  @ViewChild('pantallaRef') pantallaRef!: Pantalla;

  nombreUsuario = '';
  correoUsuario = '';

  seccionActiva = 'ingresos';

  filtroPeriodo = '';
  periodosDisponibles: string[] = [];

  catalogos = {
    categorias_egreso: [] as string[],
    areas: [] as string[],
    tipos_ingreso: [] as string[]
  };

  ingreso = {
    periodo_clave: '',
    tipo: '',
    descripcion: '',
    monto_ingreso: null as number | null
  };

  gasto = {
    periodo_clave: '',
    categoria: '',
    descripcion: '',
    monto: null as number | null
  };

  presupuesto = {
    periodo: '',
    categorias: [] as { categoria: string; monto: number | null }[]
  };

  mensaje = '';
  tipoMensaje = '';
  cargando = false;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.nombreUsuario = sessionStorage.getItem('nombre') || 'Usuario';
    this.correoUsuario = sessionStorage.getItem('correo') || '';
    this.cargarCatalogos();
  }

  private cargarCatalogos() {
    this.api.obtenerCatalogos().subscribe({
      next: (res: any) => {
        this.catalogos = res;
        this.inicializarPresupuesto();
      },
      error: () => {
        this.catalogos = {
          categorias_egreso: [
            'Alimentación',
            'Transporte',
            'Vivienda',
            'Servicios básicos',
            'Salud',
            'Educación',
            'Ahorro',
            'Deudas',
            'Entretenimiento',
            'Ropa y cuidado personal',
            'Otros'
          ],
          areas: [],
          tipos_ingreso: [
            'Sueldo',
            'Honorarios / Freelance',
            'Inversiones',
            'Pensión',
            'Ventas ocasionales',
            'Otros ingresos'
          ]
        };
        this.inicializarPresupuesto();
      }
    });
  }

  private inicializarPresupuesto() {
    this.presupuesto.categorias = this.catalogos.categorias_egreso.map((categoria) => ({
      categoria,
      monto: null
    }));
  }

  private mostrarMensaje(texto: string, tipo: 'ok' | 'error') {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => {
      this.mensaje = '';
      this.tipoMensaje = '';
    }, 4500);
  }

  guardarIngreso() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) {
      this.mostrarMensaje('Usuario no autenticado', 'error');
      return;
    }

    if (!this.ingreso.periodo_clave || !this.ingreso.tipo || !this.ingreso.monto_ingreso) {
      this.mostrarMensaje('Complete los campos obligatorios: Período, Tipo y Monto', 'error');
      return;
    }

    if (this.ingreso.monto_ingreso <= 0) {
      this.mostrarMensaje('El monto debe ser mayor a cero', 'error');
      return;
    }

    this.cargando = true;
    this.api.guardarIngreso(this.ingreso).subscribe({
      next: () => {
        this.mostrarMensaje(
          `Ingreso de $${this.ingreso.monto_ingreso?.toLocaleString('es-ES')} registrado en ${this.ingreso.periodo_clave}`,
          'ok'
        );
        this.agregarPeriodo(this.ingreso.periodo_clave);
        this.ingreso = {
          periodo_clave: '',
          tipo: '',
          descripcion: '',
          monto_ingreso: null
        };
        this.cargando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al registrar ingreso', 'error');
        this.cargando = false;
      }
    });
  }

  guardarGasto() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) {
      this.mostrarMensaje('Usuario no autenticado', 'error');
      return;
    }

    if (!this.gasto.periodo_clave || !this.gasto.categoria || !this.gasto.monto) {
      this.mostrarMensaje('Complete los campos obligatorios: Período, Categoría y Monto', 'error');
      return;
    }

    if (this.gasto.monto <= 0) {
      this.mostrarMensaje('El monto debe ser mayor a cero', 'error');
      return;
    }

    this.cargando = true;
    this.api.guardarGasto(this.gasto).subscribe({
      next: () => {
        this.mostrarMensaje(
          `Gasto de $${this.gasto.monto?.toLocaleString('es-ES')} en "${this.gasto.categoria}" registrado`,
          'ok'
        );
        this.agregarPeriodo(this.gasto.periodo_clave);
        this.gasto = {
          periodo_clave: '',
          categoria: '',
          descripcion: '',
          monto: null
        };
        this.cargando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al registrar gasto', 'error');
        this.cargando = false;
      }
    });
  }

  guardarPresupuesto() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) {
      this.mostrarMensaje('Usuario no autenticado', 'error');
      return;
    }

    if (!this.presupuesto.periodo) {
      this.mostrarMensaje('Seleccione un período', 'error');
      return;
    }

    this.cargando = true;
    this.api.guardarPresupuesto(this.presupuesto).subscribe({
      next: () => {
        this.mostrarMensaje('Presupuesto por categoría actualizado correctamente', 'ok');
        this.agregarPeriodo(this.presupuesto.periodo);
        this.cargando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al guardar presupuesto', 'error');
        this.cargando = false;
      }
    });
  }

  cargarDashboard() {
    if (this.pantallaRef) {
      this.pantallaRef.cargar(this.filtroPeriodo || undefined);
    }
  }

  enviarReporte() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) {
      this.mostrarMensaje('Usuario no autenticado', 'error');
      return;
    }

    this.cargando = true;
    this.api.enviarReporte().subscribe({
      next: () => {
        this.mostrarMensaje('Reporte enviado al administrador correctamente', 'ok');
        this.cargando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al enviar reporte', 'error');
        this.cargando = false;
      }
    });
  }

  private agregarPeriodo(periodo: string) {
    if (periodo && !this.periodosDisponibles.includes(periodo)) {
      this.periodosDisponibles = [...this.periodosDisponibles, periodo].sort();
    }
  }

  cerrarSesion() {
    sessionStorage.clear();
    this.router.navigate(['/Login']);
  }
}