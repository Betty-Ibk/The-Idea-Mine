import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ThemeUtilsService } from '../../services/theme-utils.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="account-page">
      <div class="container">
        <h1 class="page-title" style="color: #FF7A00">My Account</h1>
        
        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-avatar">
              <img [src]="currentUser?.profileImage || getDefaultProfileImage()" alt="Profile Picture">
            </div>
            <div class="profile-info">
              <h2 class="profile-name">{{ currentUser?.name || 'User' }}</h2>
              <p class="profile-role">{{ currentUser?.department || 'Department' }}</p>
              <!-- <p class="profile-stats">
                <span>{{ currentUser?.ideasSubmitted || 0 }} Ideas Submitted</span>
                <span>•</span>
                <span>{{ currentUser?.votesReceived || 0 }} Votes Received</span>
              </p> -->
            </div>
          </div>
        </div>

        <div class="account-sections">
          <div class="section-card">
            <div class="section-header">
              <h3 class="section-title">Personal Information</h3>
              <p class="section-description">Update your personal details and contact information</p>
            </div>
            <div class="section-content">
              <div class="form-group">
                <label>Display Name</label>
                <input type="text" [(ngModel)]="displayName" [placeholder]="currentUser?.name || 'Your Name'">
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" [(ngModel)]="email" [placeholder]="currentUser?.email || 'your.email@example.com'">
              </div>
              <div class="form-group">
                <label>Department</label>
                <input type="text" [(ngModel)]="department" [placeholder]="currentUser?.department || 'Your Department'">
              </div>
            </div>
          </div>
          
          <div class="section-card">
            <div class="section-header">
              <h3 class="section-title">Notification Settings</h3>
              <p class="section-description">Manage how and when you receive updates</p>
            </div>
            <div class="section-content">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="notifyNewComments">
                  <span>Comments on my ideas</span>
                </label>
                <p class="option-description">Receive notifications when someone comments on your submitted ideas</p>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="notifyVotes">
                  <span>Votes on my ideas</span>
                </label>
                <p class="option-description">Get notified when your ideas receive new votes from colleagues</p>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="notifyStatusChanges">
                  <span>Status changes</span>
                </label>
                <p class="option-description">Be alerted when the status of your submitted ideas changes</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-primary" (click)="saveChanges()">Save Changes</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .account-page {
      padding: var(--space-5) 0;
      background-color: var(--neutral-50);
      min-height: 100vh;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 var(--space-4);
    }
    
    .page-title {
      margin-bottom: var(--space-5);
      font-size: 2rem;
      font-weight: 700;
      color: var(--neutral-800);
      text-align: center;
    }
    
    .profile-card {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      padding: var(--space-4);
      margin-bottom: var(--space-5);
    }
    
    .profile-header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    
    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid var(--primary-100);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .profile-info {
      flex: 1;
    }
    
    .profile-name {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--neutral-800);
      margin-bottom: var(--space-1);
    }
    
    .profile-role {
      font-size: 1.1rem;
      color: var(--primary-600);
      margin-bottom: var(--space-2);
    }
    
    .profile-stats {
      color: var(--neutral-600);
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }
    
    .account-sections {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }
    
    .section-card {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .section-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }
    
    .section-header {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--neutral-100);
      background-color: var(--neutral-50);
    }
    
    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--neutral-800);
      margin-bottom: var(--space-1);
    }
    
    .section-description {
      color: var(--neutral-600);
      font-size: 0.9rem;
    }
    
    .section-content {
      padding: var(--space-4);
    }
    
    .form-group {
      margin-bottom: var(--space-3);
    }
    
    .form-group label {
      display: block;
      margin-bottom: var(--space-1);
      font-weight: 500;
      color: var(--neutral-700);
    }
    
    .form-group input[type="text"],
    .form-group input[type="email"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--neutral-300);
      border-radius: 6px;
      font-size: 1rem;
      transition: all 0.2s ease;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: var(--primary-400);
      box-shadow: 0 0 0 3px rgba(255, 122, 0, 0.1);
    }
    
    .checkbox-group {
      margin-bottom: var(--space-3);
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: 500;
    }
    
    .checkbox-label input {
      margin-right: var(--space-2);
      width: 18px;
      height: 18px;
      accent-color: var(--primary-500);
    }
    
    .option-description {
      margin-top: var(--space-1);
      margin-left: 30px;
      font-size: 0.85rem;
      color: var(--neutral-500);
    }
    
    .form-actions {
      display: flex;
      justify-content: center;
    }
    
    .btn-primary {
      background-color: var(--primary-500);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-primary:hover {
      background-color: var(--primary-600);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    @media (min-width: 768px) {
      .account-sections {
        grid-template-columns: 1fr 1fr;
      }
    }
    
    @media (max-width: 767px) {
      .profile-header {
        flex-direction: column;
        text-align: center;
      }
      
      .profile-stats {
        justify-content: center;
        flex-wrap: wrap;
      }
    }
    
    /* Dark theme support */
    :host-context([data-theme="dark"]) .account-page {
      background-color: var(--bg-primary);
    }
    
    :host-context([data-theme="dark"]) .profile-card,
    :host-context([data-theme="dark"]) .section-card {
      background-color: var(--card-bg);
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .profile-name,
    :host-context([data-theme="dark"]) .section-title {
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .profile-role,
    :host-context([data-theme="dark"]) .section-description {
      color: var(--text-secondary);
    }
    
    :host-context([data-theme="dark"]) .profile-stats,
    :host-context([data-theme="dark"]) .option-description {
      color: var(--text-tertiary);
    }
    
    :host-context([data-theme="dark"]) .form-group input[type="text"],
    :host-context([data-theme="dark"]) .form-group input[type="email"] {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    
    :host-context([data-theme="dark"]) .form-group input:focus {
      border-color: var(--primary-400);
      box-shadow: 0 0 0 3px rgba(255, 122, 0, 0.2);
    }
    
    :host-context([data-theme="dark"]) .section-header {
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
    }
    
    :host-context([data-theme="dark"]) .checkbox-label {
      color: var(--text-primary);
    }
  `]
})
export class AccountComponent implements OnInit {
  currentUser: any;
  displayName: string = '';
  email: string = '';
  department: string = '';
  notifyNewComments: boolean = true;
  notifyVotes: boolean = true;
  notifyStatusChanges: boolean = true;
  
  constructor(
    private authService: AuthService,
    private themeUtils: ThemeUtilsService
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.displayName = this.currentUser.name;
      this.email = this.currentUser.email;
      this.department = this.currentUser.department;
      this.notifyNewComments = this.currentUser.notifyNewComments !== false;
      this.notifyVotes = this.currentUser.notifyVotes !== false;
      this.notifyStatusChanges = this.currentUser.notifyStatusChanges !== false;
    }
    
    // Apply dark mode styling
    this.themeUtils.applyDarkModeStyles('.profile-card, .section-card');
    
    // Listen for theme changes
    this.themeUtils.setupThemeChangeListener('.profile-card, .section-card');
  }
  
  getDefaultProfileImage(): string {
    // Return different default images based on user role
    if (this.currentUser?.role === 'admin') {
      return 'data:image/jpeg;base64,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';
    } else {
      return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrlYOkfW9hFrt4C3iobgshzQ7BaBW_qvDPGA&s';
    }
  }
  
  saveChanges(): void {
    if (this.currentUser) {
      // Update the user object
      this.currentUser.name = this.displayName;
      this.currentUser.email = this.email;
      this.currentUser.department = this.department;
      this.currentUser.notifyNewComments = this.notifyNewComments;
      this.currentUser.notifyVotes = this.notifyVotes;
      this.currentUser.notifyStatusChanges = this.notifyStatusChanges;
      
      // Save to localStorage
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      
      // Show success message
      console.log('Profile updated successfully');
      alert('Profile updated successfully');
    }
  }
}








