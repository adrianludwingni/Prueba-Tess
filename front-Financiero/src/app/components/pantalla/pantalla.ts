import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const PALETA = {
  verde:      '#00e5a0',
  rojo:       '#ff4d6d',
  azul:       '#4d9fff',
  amarillo:   '#ffd166',
  purpura:    '#c77dff',
  cyan:       '#06d6a0',
  naranja:    '#ff9a3c',
  rosa:       '#ff6b9d',
  indigo:     '#5e60ce',
  lima:       '#b5e48c',
  fondo:      '#0d1117',
  borde:      '#1e2533',
  texto:      '#c9d1d9',
  textoSub:   '#6e7681',
};

@Component({
  selector: 'app-pantalla',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla.html',
  styleUrls: ['./pantalla.css']
})
export class Pantalla implements OnDestroy {

  dashboard: any = null;
  private graficos: (Chart | null)[] = [null, null, null, null, null];

  constructor(private api: ApiService) {}

  cargar() {
    this.api.obtenerDashboard().subscribe({
      next: (res: any) => {
        this.dashboard = res;
        setTimeout(() => this.generarGraficos(), 150);
      },
      error: () => alert('Error cargando dashboard')
    });
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  porcentaje(monto: number): number {
    const total = this.dashboard?.total_egreso || 0;
    if (total === 0) return 0;
    return Math.round((monto / total) * 100);
  }

  private ctx(id: string): HTMLCanvasElement | null {
    return document.getElementById(id) as HTMLCanvasElement | null;
  }

  private destruirGraficos() {
    this.graficos.forEach((g, i) => { g?.destroy(); this.graficos[i] = null; });
  }

  private generarGraficos() {
    this.destruirGraficos();

    const ev         = this.dashboard.evolucion || [];
    const periodos   = ev.map((e: any) => e.periodo);
    const ingresos   = ev.map((e: any) => e.ingreso);
    const egresosEvo = ev.map((e: any) => e.egreso);
    const utilidades = ev.map((e: any) => e.utilidad);

    const categorias = (this.dashboard.por_categoria || []).map((c: any) => c.categoria);
    const montosEgr  = (this.dashboard.por_categoria || []).map((c: any) => c.monto);

    const tiposIng    = (this.dashboard.por_tipo_ingreso || []).map((t: any) => t.tipo);
    const montosIng   = (this.dashboard.por_tipo_ingreso || []).map((t: any) => t.monto);

    const areas       = (this.dashboard.por_area || []).map((a: any) => a.area);
    const montosArea  = (this.dashboard.por_area || []).map((a: any) => a.monto);

    const coloresPaleta = [
      PALETA.verde, PALETA.azul, PALETA.amarillo, PALETA.purpura,
      PALETA.naranja, PALETA.rosa, PALETA.cyan, PALETA.indigo, PALETA.lima
    ];

    const defaultOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: PALETA.texto, font: { size: 11 }, padding: 16, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: PALETA.borde,
          borderWidth: 1,
          titleColor: PALETA.texto,
          bodyColor: PALETA.textoSub,
          padding: 12,
          callbacks: {
            label: (ctx: any) => ` ${ctx.dataset.label || ctx.label}: $${Number(ctx.parsed.y ?? ctx.parsed ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: PALETA.textoSub, font: { size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          ticks: { color: PALETA.textoSub, font: { size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.04)' }
        }
      }
    };

    // ── G1: Evolución temporal (línea con área) ──
    const c1 = this.ctx('grafico1');
    if (c1) {
      this.graficos[0] = new Chart(c1, {
        type: 'line',
        data: {
          labels: periodos.length ? periodos : ['Sin datos'],
          datasets: [
            {
              label: 'Ingresos',
              data: ingresos,
              borderColor: PALETA.verde,
              backgroundColor: 'rgba(0,229,160,0.08)',
              tension: 0.4, fill: true,
              pointBackgroundColor: PALETA.verde,
              pointRadius: 5, pointHoverRadius: 8, borderWidth: 2
            },
            {
              label: 'Egresos',
              data: egresosEvo,
              borderColor: PALETA.rojo,
              backgroundColor: 'rgba(255,77,109,0.08)',
              tension: 0.4, fill: true,
              pointBackgroundColor: PALETA.rojo,
              pointRadius: 5, pointHoverRadius: 8, borderWidth: 2
            },
            {
              label: 'Utilidad',
              data: utilidades,
              borderColor: PALETA.amarillo,
              backgroundColor: 'rgba(255,209,102,0.06)',
              tension: 0.4, fill: false,
              pointBackgroundColor: PALETA.amarillo,
              pointRadius: 5, pointHoverRadius: 8, borderWidth: 2,
              borderDash: [5, 3]
            }
          ]
        },
        options: {
          ...defaultOpts,
          interaction: { mode: 'index', intersect: false }
        } as any
      });
    }

    // ── G2: Egresos por categoría (barras horizontales) ──
    const c2 = this.ctx('grafico2');
    if (c2) {
      this.graficos[1] = new Chart(c2, {
        type: 'bar',
        data: {
          labels: categorias.length ? categorias : ['Sin egresos'],
          datasets: [{
            label: 'Egreso',
            data: montosEgr,
            backgroundColor: coloresPaleta.slice(0, categorias.length).map(c => c + 'cc'),
            borderRadius: 5,
            borderSkipped: false
          }]
        },
        options: {
          ...defaultOpts,
          indexAxis: 'y',
          plugins: {
            ...defaultOpts.plugins,
            legend: { display: false }
          }
        } as any
      });
    }

    // ── G3: Tipos de ingreso (donut) ──
    const c3 = this.ctx('grafico3');
    if (c3) {
      this.graficos[2] = new Chart(c3, {
        type: 'doughnut',
        data: {
          labels: tiposIng.length ? tiposIng : ['Sin ingresos'],
          datasets: [{
            data: montosIng.length ? montosIng : [1],
            backgroundColor: coloresPaleta.slice(0, tiposIng.length),
            borderColor: PALETA.fondo,
            borderWidth: 3,
            hoverOffset: 8
          }]
        },
        options: {
          ...defaultOpts,
          cutout: '65%',
          scales: undefined,
          plugins: {
            ...defaultOpts.plugins,
            tooltip: {
              ...defaultOpts.plugins.tooltip,
              callbacks: {
                label: (ctx: any) => ` ${ctx.label}: $${Number(ctx.parsed ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
              }
            }
          }
        } as any
      });
    }

    // ── G4: Utilidad por período (barras con color condicional) ──
    const c4 = this.ctx('grafico4');
    if (c4) {
      this.graficos[3] = new Chart(c4, {
        type: 'bar',
        data: {
          labels: periodos.length ? periodos : ['Sin datos'],
          datasets: [{
            label: 'Utilidad neta',
            data: utilidades,
            backgroundColor: utilidades.map((u: number) =>
              u >= 0 ? 'rgba(0,229,160,0.75)' : 'rgba(255,77,109,0.75)'
            ),
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: defaultOpts as any
      });
    }

    // ── G5: Egresos por área (donut) ──
    const c5 = this.ctx('grafico5');
    if (c5) {
      this.graficos[4] = new Chart(c5, {
        type: 'doughnut',
        data: {
          labels: areas.length ? areas : ['Sin datos'],
          datasets: [{
            data: montosArea.length ? montosArea : [1],
            backgroundColor: [PALETA.purpura, PALETA.cyan, PALETA.naranja, PALETA.rosa, PALETA.indigo, PALETA.lima, PALETA.azul],
            borderColor: PALETA.fondo,
            borderWidth: 3,
            hoverOffset: 8
          }]
        },
        options: {
          ...defaultOpts,
          cutout: '65%',
          scales: undefined,
          plugins: {
            ...defaultOpts.plugins,
            tooltip: {
              ...defaultOpts.plugins.tooltip,
              callbacks: {
                label: (ctx: any) => ` ${ctx.label}: $${Number(ctx.parsed ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
              }
            }
          }
        } as any
      });
    }
  }

  ngOnDestroy() { this.destruirGraficos(); }
}