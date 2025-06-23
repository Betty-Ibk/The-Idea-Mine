import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor() {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Exclude public endpoints from having the token attached
    const publicEndpoints = ['/login', '/register'];
    const isPublic = publicEndpoints.some(endpoint => req.url.includes(endpoint));
    if (isPublic) {
      return next.handle(req);
    }

    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');

    if (token) {
      // Clone the request and set the Authorization header
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(authReq);
    }

    // If no token, proceed without modifying the request
    return next.handle(req);
  }
}

