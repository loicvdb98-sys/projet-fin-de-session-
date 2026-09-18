import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@features/auth/auth.service';

/** Redirect anonymous visitors before a protected screen makes an API request. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

/** Empêche un sportif d'ouvrir les écrans réservés au coach, même par URL. */
export const coachGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return auth.isCoachOrAdmin() ? true : router.createUrlTree(['/dashboard']);
};
