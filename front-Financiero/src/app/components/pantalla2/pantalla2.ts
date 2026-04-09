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

  // Usuario
  nombreUsuario  = '';
  correoUsuario  = '';
  empresaUsuario = '';
  cargoUsuario   = '';

  // Sección activa
  seccionActiva = 'ingresos';

  // Filtros
  filtroPeriodo       = '';
  periodosDisponibles: string[] = [];

  // Catálogos del backend
  catalogos = {
    categorias_egreso: [] as string[],
    areas:             [] as string[],
    tipos_ingreso:     [] as string[]
  };

  // Formulario ingreso
  ingreso = {
    periodo_clave: '',
    tipo:          '',
    area:          '',
    descripcion:   '',
    monto_ingreso: null as number | null,
    moneda:        'USD'
  };

  // Formulario egreso
  gasto = {
    periodo_clave: '',
    categoria:     '',
    area:          '',
    descripcion:   '',
    proveedor:     '',
    monto:         null as number | null,
    moneda:        'USD'
  };

  // Formulario presupuesto
  presupuesto = {
    periodo:           '',
    meta_ingresos:     null as number | null,
    presupuesto_total: null as number | null
  };

  mensaje     = '';
  tipoMensaje = '';
  cargando    = false;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.nombreUsuario  = sessionStorage.getItem('nombre')  || 'Usuario';
    this.correoUsuario  = sessionStorage.getItem('correo')  || '';
    this.empresaUsuario = sessionStorage.getItem('empresa') || '';
    this.cargoUsuario   = sessionStorage.getItem('cargo')   || '';

    this.cargarCatalogos();
  }

  private cargarCatalogos() {
    this.api.obtenerCatalogos().subscribe({
      next: (res: any) => { this.catalogos = res; },
      error: () => {
        // Fallback si el endpoint no existe aún
        this.catalogos = {
          categorias_egreso: [
            'Nómina y salarios', 'Arriendos y servicios',
            'Proveedores / Materia prima', 'Marketing y publicidad',
            'Tecnología y software', 'Logística y transporte',
            'Impuestos y obligaciones', 'Gastos administrativos',
            'Capacitación y RRHH', 'Equipos y activos fijos', 'Otros'
          ],
          areas: [
            'Operaciones', 'Ventas', 'Administración', 'Finanzas',
            'Recursos Humanos', 'TI / Tecnología', 'Marketing', 'Logística', 'Producción'
          ],
          tipos_ingreso: [
            'Ventas de productos', 'Prestación de servicios',
            'Contratos / Proyectos', 'Inversiones', 'Otros ingresos'
          ]
        };
      }
    });
  }

  private mostrarMensaje(texto: string, tipo: 'ok' | 'error') {
    this.mensaje     = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => { this.mensaje = ''; this.tipoMensaje = ''; }, 4500);
  }

  guardarIngreso() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) { this.mostrarMensaje('Usuario no autenticado', 'error'); return; }
    if (!this.ingreso.periodo_clave || !this.ingreso.tipo || !this.ingreso.monto_ingreso) {
      this.mostrarMensaje('Complete los campos obligatorios: Período, Tipo y Monto', 'error'); return;
    }
    if (this.ingreso.monto_ingreso <= 0) {
      this.mostrarMensaje('El monto debe ser mayor a cero', 'error'); return;
    }

    this.cargando = true;
    this.api.guardarIngreso(this.ingreso).subscribe({
      next: () => {
        this.mostrarMensaje(
          `Ingreso de $${this.ingreso.monto_ingreso?.toLocaleString('es-ES')} registrado en ${this.ingreso.periodo_clave}`,
          'ok'
        );
        this.agregarPeriodo(this.ingreso.periodo_clave);
        this.ingreso = { periodo_clave: '', tipo: '', area: '', descripcion: '', monto_ingreso: null, moneda: 'USD' };
        this.cargando = false;
      },
      error: () => { this.mostrarMensaje('Error al registrar ingreso', 'error'); this.cargando = false; }
    });
  }

  guardarGasto() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) { this.mostrarMensaje('Usuario no autenticado', 'error'); return; }
    if (!this.gasto.periodo_clave || !this.gasto.categoria || !this.gasto.monto) {
      this.mostrarMensaje('Complete los campos obligatorios: Período, Categoría y Monto', 'error'); return;
    }
    if (this.gasto.monto <= 0) {
      this.mostrarMensaje('El monto debe ser mayor a cero', 'error'); return;
    }

    this.cargando = true;
    this.api.guardarGasto(this.gasto).subscribe({
      next: () => {
        this.mostrarMensaje(
          `Egreso de $${this.gasto.monto?.toLocaleString('es-ES')} en "${this.gasto.categoria}" registrado`,
          'ok'
        );
        this.agregarPeriodo(this.gasto.periodo_clave);
        this.gasto = { periodo_clave: '', categoria: '', area: '', descripcion: '', proveedor: '', monto: null, moneda: 'USD' };
        this.cargando = false;
      },
      error: () => { this.mostrarMensaje('Error al registrar egreso', 'error'); this.cargando = false; }
    });
  }

  guardarPresupuesto() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) { this.mostrarMensaje('Usuario no autenticado', 'error'); return; }
    if (!this.presupuesto.periodo) {
      this.mostrarMensaje('Seleccione un período', 'error'); return;
    }

    this.cargando = true;
    this.api.guardarPresupuesto(this.presupuesto).subscribe({
      next: () => {
        this.mostrarMensaje('Presupuesto actualizado correctamente', 'ok');
        this.cargando = false;
      },
      error: () => { this.mostrarMensaje('Error al guardar presupuesto', 'error'); this.cargando = false; }
    });
  }

  cargarDashboard() {
    if (this.pantallaRef) {
      this.pantallaRef.cargar();
    }
  }

  enviarReporte() {
    const usuarioId = sessionStorage.getItem('usuario_id');
    if (!usuarioId) { this.mostrarMensaje('Usuario no autenticado', 'error'); return; }

    this.cargando = true;
    this.api.enviarReporte().subscribe({
      next: () => {
        this.mostrarMensaje('Reporte enviado al administrador correctamente', 'ok');
        this.cargando = false;
      },
      error: () => { this.mostrarMensaje('Error al enviar reporte', 'error'); this.cargando = false; }
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