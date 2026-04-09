import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private base = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const id = sessionStorage.getItem('usuario_id') || '';
    return new HttpHeaders({ 'usuario-id': id });
  }

  // ── Auth ──
  registro(data: any): Observable<any> {
    return this.http.post(`${this.base}/registro`, data);
  }
  login(data: any): Observable<any> {
    return this.http.post(`${this.base}/login`, data);
  }

  // ── Catálogos ──
  obtenerCatalogos(): Observable<any> {
    return this.http.get(`${this.base}/catalogos`);
  }

  // ── Ingresos ──
  guardarIngreso(data: any): Observable<any> {
    return this.http.post(`${this.base}/ingresos`, data, { headers: this.headers() });
  }
  listarIngresos(periodo?: string): Observable<any> {
    const params = periodo ? `?periodo=${periodo}` : '';
    return this.http.get(`${this.base}/ingresos${params}`, { headers: this.headers() });
  }
  eliminarIngreso(id: string): Observable<any> {
    return this.http.delete(`${this.base}/ingresos/${id}`, { headers: this.headers() });
  }

  // ── Egresos ──
  guardarGasto(data: any): Observable<any> {
    return this.http.post(`${this.base}/gastos`, data, { headers: this.headers() });
  }
  listarGastos(periodo?: string): Observable<any> {
    const params = periodo ? `?periodo=${periodo}` : '';
    return this.http.get(`${this.base}/gastos${params}`, { headers: this.headers() });
  }
  eliminarGasto(id: string): Observable<any> {
    return this.http.delete(`${this.base}/gastos/${id}`, { headers: this.headers() });
  }

  // ── Presupuesto ──
  guardarPresupuesto(data: any): Observable<any> {
    return this.http.post(`${this.base}/presupuesto`, data, { headers: this.headers() });
  }
  obtenerPresupuesto(periodo?: string): Observable<any> {
    const params = periodo ? `?periodo=${periodo}` : '';
    return this.http.get(`${this.base}/presupuesto${params}`, { headers: this.headers() });
  }

  // ── Dashboard ──
  obtenerDashboard(periodo?: string): Observable<any> {
    const params = periodo ? `?periodo=${periodo}` : '';
    return this.http.get(`${this.base}/dashboard${params}`, { headers: this.headers() });
  }

  // ── Reporte ──
  enviarReporte(): Observable<any> {
    return this.http.post(`${this.base}/reporte`, {}, { headers: this.headers() });
  }

  // ── Admin ──
  adminReportes(): Observable<any> {
    return this.http.get(`${this.base}/admin/reportes`);
  }
  adminUsuarios(): Observable<any> {
    return this.http.get(`${this.base}/admin/usuarios`);
  }
  adminResumenGlobal(): Observable<any> {
    return this.http.get(`${this.base}/admin/resumen-global`);
  }
}