import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  profileImage?: string;
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private jwtKey = 'jwtToken';
  private apiUrl = environment.apiUrl;

  constructor(private router: Router, private http: HttpClient) {
    const token = localStorage.getItem(this.jwtKey);
    if (token) {
      this.fetchUserProfile(token).subscribe();
    }
  }

  login(employeeId: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/user/login`, { employeeId, password }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.removeItem(this.jwtKey);
          localStorage.setItem(this.jwtKey, res.token);
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }
  
  logout(): void {
    localStorage.removeItem(this.jwtKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
  
  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.jwtKey);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin';
  }

  fetchUserProfile(token?: string): Observable<User | null> {
    const jwt = token || localStorage.getItem(this.jwtKey);
    if (!jwt) return of(null);
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.get<User>(`${this.apiUrl}/user/me`, { headers }).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }
}







