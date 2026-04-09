import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const usuarioId = sessionStorage.getItem("usuario_id");
  const rol = sessionStorage.getItem("rol");

  if (usuarioId && rol === "admin") {
    return true;
  }

  router.navigate(['/Login']);
  return false;
};