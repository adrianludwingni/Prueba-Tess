import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';

@Component({
selector:'app-registro',
imports:[FormsModule],
templateUrl:'./registro.html',
styleUrl:'./registro.css'
})
export class Registro{

usuario={
nombre:'',
correo:'',
celular:'',
password:''
}

constructor(private api:ApiService, private router:Router){}

registrar() {
  this.api.registro(this.usuario).subscribe({
    next: (res: any) => {

      if (res.error) {
        alert(res.error);
        return;
      }

      sessionStorage.clear();

      alert("Usuario creado correctamente. Por favor inicia sesión.");
      this.router.navigate(['/Login']);
    },
    error: () => {
      alert("Error al conectar con el servidor");
    }
  });
}

}