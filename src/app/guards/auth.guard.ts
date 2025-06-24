import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isLoggedIn()) {
    return true;
  }
  
  // Redirect to the login page
  return router.parseUrl('/login');
};

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }
  
  // For any non-admin (even if logged in), redirect to login
  console.log('User is not an admin or not logged in, redirecting to login');
  return router.parseUrl('/login');
};
