import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Registro } from './components/registro/registro';
import { Login } from './components/login/login';
import { Pantalla2 } from './components/pantalla2/pantalla2';
import { Admin } from './components/admin/admin';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
    { path: 'Home', component: Home },
    { path: "pantalla2", component: Pantalla2, canActivate:[authGuard] },
    {path:"admin", component:Admin, canActivate:[adminGuard]},
    { path: "Login", component: Login },
    { path: "Registro", component: Registro },
    { path: '', redirectTo: 'Home', pathMatch: 'full' },

];
