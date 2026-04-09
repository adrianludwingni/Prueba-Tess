import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement
} from 'chart.js';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement
);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit, AfterViewInit {

  reportes: any[] = [];
  resumenGlobal: any = null;
  reporteSeleccionado: any = null;
  cargando = false;
  busqueda = '';

  @ViewChild('chartCategorias') chartCategoriasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEvolucion') chartEvolucionRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartResumen') chartResumenRef?: ElementRef<HTMLCanvasElement>;

  chartCategorias: Chart | null = null;
  chartEvolucion: Chart | null = null;
  chartResumen: Chart | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.cargarReportes();
    this.cargarResumen();
  }

  ngAfterViewInit() {}

  cargarReportes() {
    this.cargando = true;
    this.api.adminReportes().subscribe({
      next: (res: any) => {
        this.reportes = (res || []).map((r: any) => {
          const totalIngreso = r.datos?.total_ingreso ?? r.total_ingreso ?? 0;
          const totalEgreso = r.datos?.total_egreso ?? r.total_egreso ?? 0;
          const utilidadNeta = r.datos?.utilidad_neta ?? r.utilidad_neta ?? (totalIngreso - totalEgreso);
          const margenUtilidad = totalIngreso > 0 ? Math.round((utilidadNeta / totalIngreso) * 100) : 0;

          return {
            ...r,
            total_ingreso: totalIngreso,
            total_egreso: totalEgreso,
            utilidad_neta: utilidadNeta,
            margen_utilidad: margenUtilidad
          };
        });
        this.cargando = false;
      },
      error: () => {
        alert('Error cargando reportes');
        this.cargando = false;
      }
    });
  }

  cargarResumen() {
    this.api.adminResumenGlobal().subscribe({
      next: (res: any) => {
        this.resumenGlobal = res;
      },
      error: () => {}
    });
  }

  get reportesFiltrados(): any[] {
    if (!this.busqueda.trim()) return this.reportes;
    const q = this.busqueda.toLowerCase();
    return this.reportes.filter(r =>
      r.nombre?.toLowerCase().includes(q) ||
      r.correo?.toLowerCase().includes(q) ||
      r.empresa?.toLowerCase().includes(q)
    );
  }

  seleccionar(r: any) {
    this.reporteSeleccionado = r;
    setTimeout(() => this.renderCharts(), 100);
  }

  cerrar() {
    this.reporteSeleccionado = null;
    this.destroyCharts();
  }

  getDatos(r: any, campo: string): any {
    return r?.datos?.[campo] ?? r?.[campo] ?? 0;
  }

  getEvolucion(r: any): any[] {
    return r?.datos?.evolucion ?? r?.evolucion ?? [];
  }

  getCategoria(r: any): any[] {
    return r?.datos?.por_categoria ?? r?.por_categoria ?? [];
  }

  margen(r: any): number {
    const ing = this.getDatos(r, 'total_ingreso');
    const uti = this.getDatos(r, 'utilidad_neta') ?? (ing - this.getDatos(r, 'total_egreso'));
    return ing > 0 ? Math.round((uti / ing) * 100) : 0;
  }

  trackByReporte(index: number, item: any) {
    return item._id;
  }

  destroyCharts() {
    if (this.chartCategorias) {
      this.chartCategorias.destroy();
      this.chartCategorias = null;
    }
    if (this.chartEvolucion) {
      this.chartEvolucion.destroy();
      this.chartEvolucion = null;
    }
    if (this.chartResumen) {
      this.chartResumen.destroy();
      this.chartResumen = null;
    }
  }

  renderCharts() {
    if (!this.reporteSeleccionado) return;

    this.destroyCharts();

    const categorias = this.getCategoria(this.reporteSeleccionado);
    const evolucion = this.getEvolucion(this.reporteSeleccionado);

    if (this.chartCategoriasRef?.nativeElement) {
      this.chartCategorias = new Chart(this.chartCategoriasRef.nativeElement, {
        type: 'bar',
        data: {
          labels: categorias.map((c: any) => c.categoria),
          datasets: [
            {
              label: 'Monto por categoría',
              data: categorias.map((c: any) => c.monto)
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true }
          }
        }
      });
    }

    if (this.chartEvolucionRef?.nativeElement) {
      this.chartEvolucion = new Chart(this.chartEvolucionRef.nativeElement, {
        type: 'line',
        data: {
          labels: evolucion.map((e: any) => e.periodo),
          datasets: [
            {
              label: 'Ingresos',
              data: evolucion.map((e: any) => e.ingreso ?? 0)
            },
            {
              label: 'Egresos',
              data: evolucion.map((e: any) => e.egreso ?? e.gasto ?? 0)
            },
            {
              label: 'Utilidad',
              data: evolucion.map((e: any) => e.utilidad ?? ((e.ingreso ?? 0) - (e.egreso ?? e.gasto ?? 0)))
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true }
          }
        }
      });
    }

    if (this.chartResumenRef?.nativeElement) {
      this.chartResumen = new Chart(this.chartResumenRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Ingresos', 'Egresos'],
          datasets: [
            {
              label: 'Resumen financiero',
              data: [
                this.getDatos(this.reporteSeleccionado, 'total_ingreso'),
                this.getDatos(this.reporteSeleccionado, 'total_egreso')
              ]
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true }
          }
        }
      });
    }
  }

  exportarPDF() {
    if (!this.reporteSeleccionado) return;

    const r = this.reporteSeleccionado;
    const pdf = new jsPDF();

    const totalIngreso = this.getDatos(r, 'total_ingreso');
    const totalEgreso = this.getDatos(r, 'total_egreso');
    const utilidadNeta = this.getDatos(r, 'utilidad_neta');
    const margen = this.margen(r);

    pdf.setFontSize(16);
    pdf.text('INFORME FINANCIERO EMPRESARIAL', 14, 18);

    pdf.setFontSize(10);
    pdf.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 26);

    pdf.setFontSize(12);
    pdf.text('Datos del usuario', 14, 38);

    autoTable(pdf, {
      startY: 42,
      head: [['Campo', 'Valor']],
      body: [
        ['Nombre', r.nombre || '—'],
        ['Correo', r.correo || '—'],
        ['Empresa', r.empresa || '—'],
        ['Fecha del reporte', new Date(r.fecha).toLocaleString()]
      ],
      theme: 'grid'
    });

    const y1 = (pdf as any).lastAutoTable.finalY + 10;

    pdf.setFontSize(12);
    pdf.text('Resumen financiero', 14, y1);

    autoTable(pdf, {
      startY: y1 + 4,
      head: [['Indicador', 'Valor']],
      body: [
        ['Ingresos totales', `$${Number(totalIngreso).toFixed(2)}`],
        ['Egresos totales', `$${Number(totalEgreso).toFixed(2)}`],
        ['Utilidad neta', `$${Number(utilidadNeta).toFixed(2)}`],
        ['Margen de utilidad', `${margen}%`]
      ],
      theme: 'striped'
    });

    const categorias = this.getCategoria(r);
    const evolucion = this.getEvolucion(r);

    let y2 = (pdf as any).lastAutoTable.finalY + 10;

    pdf.setFontSize(12);
    pdf.text('Egresos por categoría', 14, y2);

    autoTable(pdf, {
      startY: y2 + 4,
      head: [['Categoría', 'Monto']],
      body: categorias.length
        ? categorias.map((c: any) => [c.categoria, `$${Number(c.monto).toFixed(2)}`])
        : [['Sin datos', '—']],
      theme: 'grid'
    });

    y2 = (pdf as any).lastAutoTable.finalY + 10;

    pdf.setFontSize(12);
    pdf.text('Evolución por período', 14, y2);

    autoTable(pdf, {
      startY: y2 + 4,
      head: [['Período', 'Ingreso', 'Egreso', 'Utilidad']],
      body: evolucion.length
        ? evolucion.map((e: any) => [
            e.periodo,
            `$${Number(e.ingreso ?? 0).toFixed(2)}`,
            `$${Number(e.egreso ?? e.gasto ?? 0).toFixed(2)}`,
            `$${Number(e.utilidad ?? ((e.ingreso ?? 0) - (e.egreso ?? e.gasto ?? 0))).toFixed(2)}`
          ])
        : [['Sin datos', '—', '—', '—']],
      theme: 'grid'
    });

    pdf.save(`Informe_Financiero_${(r.nombre || 'usuario').replace(/\s+/g, '_')}.pdf`);
  }

  cerrarSesion() {
    sessionStorage.clear();
    this.router.navigate(['/Login']);
  }
}