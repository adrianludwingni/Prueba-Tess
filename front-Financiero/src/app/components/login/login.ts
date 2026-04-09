import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html'
})
export class Login {

  loginData: any = {
    correo: '',
    password: '',
    password2: ''
  }

  mostrarPassword2 = false;
  mensaje = "";

  constructor(private api: ApiService, private router: Router) { }
login() {
  this.api.login(this.loginData).subscribe({
    next: (res: any) => {
      sessionStorage.clear();
      sessionStorage.setItem("usuario_id", res.usuario_id);
      sessionStorage.setItem("rol", res.rol);
      sessionStorage.setItem("nombre", res.nombre);
      sessionStorage.setItem("correo", res.correo);

      if (res.rol === "admin") {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/pantalla2']);
      }
    },
    error: (err) => {
      const detalle = err?.error?.detail || '';

      if (detalle === "Se requiere segunda contraseña de administrador") {
        this.mostrarPassword2 = true;
        this.mensaje = "Ingrese la segunda contraseña de administrador";
        return;
      }

      if (detalle === "Segunda contraseña incorrecta") {
        this.mostrarPassword2 = true;
        this.mensaje = "La segunda contraseña de administrador es incorrecta";
        return;
      }

      if (detalle === "Credenciales incorrectas") {
        this.mensaje = "Correo o contraseña incorrectos";
        return;
      }

      this.mensaje = detalle || "Error al conectar con el servidor";
    }
  });
}
}