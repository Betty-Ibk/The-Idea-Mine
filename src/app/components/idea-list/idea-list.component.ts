import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ThemeUtilsService } from '../../services/theme-utils.service';
import { IdeaService, IdeaPost } from '../../services/idea.service';
import { Subscription, forkJoin } from 'rxjs';
import { MyIdeasComponent } from '../my-ideas/my-ideas.component';
import { Router } from '@angular/router';

interface Comment {
  text: string;
  author: string;
  authorId: string;
  timestamp: string;
}

interface Idea {
  id: number;
  title: string;
  description: string;
  votes: number;
  upvotes: number;
  downvotes: number;
  comments: number;
  commentCount: number;
  author: string;
  authorId: string;
  timestamp: string;
  userVote: 'up' | 'down' | null;
  commentsList: Comment[];
  _sortDate?: Date; // Add optional sortDate property
}

@Component({
  selector: 'app-idea-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="main-content">
      <div class="container">
        <!-- User Engagement Metrics -->
        <div class="metrics-container">
          <h2 class="metrics-title">Your Innovation Impact</h2>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon"><svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ff7a00"><path d="M127.33-240 80-287.33l293.33-293.34L538-416l230-229.33H648.67V-712H880v231.33h-66v-116.66L537.33-320.67 372.67-485.33 127.33-240Z"/></svg></div>
              <div class="metric-value">{{ userMetrics.topIdeas }}</div>
              <div class="metric-label">Ideas in Top 10%</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon"><svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ff7a00"><path d="M280.67-623.33 357.33-700l-76.66-76.67L204-700l76.67 76.67ZM480-660ZM146.67-400q-27 0-46.84-19.83Q80-439.67 80-466.67v-386.66q0-27 19.83-46.84Q119.67-920 146.67-920h666.66q27 0 46.84 19.83Q880-880.33 880-853.33v386.66q0 27-19.83 46.84Q840.33-400 813.33-400H671q5.33-16 7.33-32.67 2-16.66 1.34-34h133.66v-386.66H146.67v386.66h133.66q-.66 17.34 1.34 34 2 16.67 7.33 32.67H146.67Zm513.37-283.33q23.63 0 40.13-16.54 16.5-16.54 16.5-40.17 0-23.63-16.54-40.13-16.54-16.5-40.17-16.5-23.63 0-40.13 16.54-16.5 16.54-16.5 40.17 0 23.63 16.54 40.13 16.54 16.5 40.17 16.5ZM200-40v-84q0-35 19.5-65t51.5-45q49-23 102-34.5T480-280q54 0 107 11.5T689-234q32 15 51.5 45t19.5 65v84H200Zm66.67-66.67h426.66V-124q0-15.75-9-28.88-9-13.12-24-20.12-42.66-19.67-88-30Q527-213.33 480-213.33T387.67-203q-45.34 10.33-88 30-15 7-24 20.12-9 13.13-9 28.88v17.33ZM480-320q-58 0-99-41t-41-99q0-58 41-99t99-41q58 0 99 41t41 99q0 58-41 99t-99 41Zm-.16-66.67q30.49 0 51.99-21.34 21.5-21.34 21.5-51.83t-21.34-51.99q-21.34-21.5-51.83-21.5t-51.99 21.34q-21.5 21.34-21.5 51.83t21.34 51.99q21.34 21.5 51.83 21.5ZM480-460Zm0 353.33Z"/></svg></div>
              <div class="metric-value">{{ userMetrics.engagementRate }}%</div>
              <div class="metric-label">Engagement Rate</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon"><svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ff7a00"><path d="M356.67-300 480-394l123.33 94-48.66-156 114-76h-138L480-688.67 429.33-532h-138l114 76-48.66 156ZM233-120l93-304L80-600h304l96-320 96 320h304L634-424l93 304-247-188-247 188Zm247-374.33Z"/></svg></div>
              <div class="metric-value">{{ userMetrics.communityPoints }}</div>
              <div class="metric-label">Community Points</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon"><svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ff7a00"><path d="m200-553.67 96.67 41Q313.33-546 332-578q18.67-32 40-62l-71.33-14.33L200-553.67ZM350-472l126.67 126.33q52-22.66 101.33-55.66T662-469q77.33-77.33 115.83-162.5T816.67-812q-95.34.33-180.67 38.83-85.33 38.5-162.67 115.84-34.66 34.66-67.66 84Q372.67-524 350-472Zm212-85.67q-21-21-21-51.83t21-51.83q21-21 52-21t52 21q21 21 21 51.83t-21 51.83q-21 21-52 21t-52-21Zm-3.67 362.34L659-296l-14.33-71.33q-30 21.33-62 39.83t-65.34 35.17l41 97ZM880-875.67q12.33 131-30.5 243.84Q806.67-519 706-418.33q-.67.66-1.33 1.33-.67.67-1.34 1.33l21.34 106.34Q728-292.67 723-277q-5 15.67-17 27.67L536-78.67l-84.67-197.66L281-446.67 83.33-531.33l170.34-170q12-12 27.83-17 15.83-5 32.5-1.67l106.33 21.33q.67-.66 1.34-1 .66-.33 1.33-1 100.67-100.66 213.33-144Q749-888 880-875.67Zm-728.33 552q35-35 85.5-35.5t85.5 34.5q35 35 34.5 85.5t-35.5 85.5q-25.67 25.67-81.5 43-55.84 17.34-162.84 32Q92-185.67 109-241.83q17-56.17 42.67-81.84Zm47 47.34Q186-263 175.33-232.83q-10.66 30.16-17.33 72.5 42.33-6.67 72.5-17.17 30.17-10.5 43.5-23.17 16.67-15.33 17.33-38Q292-261.33 276-278q-16.67-16-39.33-15.5-22.67.5-38 17.17Z"/></svg></div>
              <div class="metric-value">{{ userMetrics.implementedIdeas }}</div>
              <div class="metric-label">Ideas Implemented</div>
            </div>
          </div>
          
          <div class="achievement-banner">
            <div class="achievement-icon"><svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ff7a00"><path d="m363-310 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM480.67-28.67 346-160H160v-186L26.67-480 160-614v-186h186l134.67-133.33L614-800h186v186l133.33 134L800-346v186H614L480.67-28.67Zm0-93.33 105.27-104.67h147.39V-374l106-106-106-106v-147.33H586l-105.33-106-106.67 106H226.67V-586l-106 106 106 106v147.33h146.66L480.67-122Zm0-358.67Z"/></svg></div>
            <div class="achievement-content">
              <div class="achievement-title">Monthly Goal Progress</div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="userMetrics.monthlyGoalProgress"></div>
              </div>
              <div class="achievement-text">
                {{ getWeeklyGoalMessage(userMetrics.monthlyIdeasSubmitted) }}
              </div>
            </div>
          </div>
        </div>
        
        <h2 class="page-title" style="color: #FF7A00">Recent Ideas</h2>
        <div class="ideas-list">
          @for (idea of ideas; track idea.id) {
            <div class="idea-card">
              <div class="idea-content">
                <h3 class="idea-title">{{idea.title}}</h3>
                <p class="idea-description">{{idea.description}}</p>
                <div class="idea-meta">
                  <span class="author">{{getDisplayName(idea.authorId, idea.author)}}</span>
                  <span class="timestamp">{{idea.timestamp}}</span>
                </div>
              </div>
              <div class="idea-actions">
                <button 
                  class="vote-button upvote" 
                  [class.voted]="idea.userVote === 'up'"
                  (click)="vote(idea, 'up')">
                  👍 {{idea.upvotes}}
                </button>
                <button 
                  class="vote-button downvote" 
                  [class.voted]="idea.userVote === 'down'"
                  (click)="vote(idea, 'down')">
                  👎 {{idea.downvotes}}
                </button>
                <button class="comment-button" (click)="viewComments(idea)">
                  💬 {{idea.commentCount || 0}}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </main>
    
    <!-- Comments Modal -->
    @if (selectedIdea) {
      <div class="modal-overlay">
        <div class="comments-modal">
          <div class="modal-header">
            <h3>Comments for "{{selectedIdea.title}}"</h3>
            <button class="close-btn" (click)="closeCommentsModal()">×</button>
          </div>
          <div class="comments-list">
            @if (selectedIdea.commentsList.length === 0) {
              <div class="no-comments">
                No comments yet.
              </div>
            }
            @for (comment of getVisibleComments(); track comment.timestamp) {
              <div class="comment-item">
                <div class="comment-header">
                  <span class="comment-author">{{getDisplayName(comment.authorId, comment.author)}}</span>
                  <span class="comment-time">{{comment.timestamp}}</span>
                </div>
                <div class="comment-content">
                  <p>{{comment.text}}</p>
                </div>
              </div>
            }
            @if (currentPage < totalPages - 1) {
              <div class="pagination-controls">
                <button class="btn btn-outline" (click)="nextPage()">Next</button>
              </div>
            }
            @if (currentPage > 0) {
              <div class="pagination-controls">
                <button class="btn btn-outline" (click)="prevPage()">Previous</button>
              </div>
            }
          </div>
          
          <!-- Add Comment Form -->
          <div class="add-comment-form">
            <h4>Add a Comment</h4>
            <textarea 
              [(ngModel)]="newComment" 
              placeholder="Write your comment here..." 
              rows="3"
              class="comment-input"
            ></textarea>
            <button 
              class="btn btn-primary" 
              [disabled]="!newComment.trim()" 
              (click)="addComment()"
            >
              Submit Comment
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .main-content {
      padding: var(--space-4) 0;
    }

    .page-title {
      margin-bottom: var(--space-4);
      color: var(--neutral-800);
      font-size: 1.5rem;
    }

    .ideas-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .idea-card {
      background-color: white;
      border-radius: 8px;
      padding: var(--space-3);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      display: flex;
      gap: var(--space-3);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      animation: fadeIn 0.5s ease-out;
    }
    
    .idea-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .idea-content {
      flex: 1;
    }

    .idea-title {
      font-size: 1.125rem;
      margin-bottom: var(--space-1);
    }

    .idea-description {
      color: var(--neutral-600);
      font-size: 0.875rem;
      margin-bottom: var(--space-2);
    }

    .idea-meta {
      display: flex;
      gap: var(--space-2);
      font-size: 0.75rem;
      color: var(--neutral-500);
    }

    .idea-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .vote-button,
    .comment-button {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--primary-200);
      border-radius: 4px;
      background-color: var(--primary-500);
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .vote-button:hover,
    .comment-button:hover {
      background-color: var(--primary-600);
    }

    .vote-button.upvote.voted {
      background-color: var(--primary-600);
      color: white;
      border-color: var(--primary-700);
    }
    
    .vote-button.downvote.voted {
      background-color: var(--neutral-600);
      color: white;
      border-color: var(--neutral-700);
    }
    
    /* Modal styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .comments-modal {
      background-color: white;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3);
      border-bottom: 1px solid var(--neutral-200);
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--neutral-500);
    }
    
    .comments-list {
      padding: var(--space-3);
    }
    
    .comment-item {
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--neutral-100);
    }
    
    .comment-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--space-1);
    }
    
    .comment-author {
      font-weight: 500;
      color: var(--neutral-700);
    }
    
    .comment-time {
      font-size: 0.75rem;
      color: var(--neutral-500);
    }
    
    .comment-content p {
      margin: 0;
      color: var(--neutral-600);
    }
    
    .no-comments {
      text-align: center;
      color: var(--neutral-500);
      padding: var(--space-4);
    }
    
    .pagination-controls {
      display: flex;
      justify-content: center;
      margin-top: var(--space-3);
    }
    
    .pagination-controls .btn {
      margin: 0 var(--space-2);
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: white;
      color: var(--neutral-700);
      border: 1px solid var(--neutral-300);
    }
    
    .pagination-controls .btn:hover {
      background-color: var(--neutral-50);
    }
    
    .btn-primary {
      background-color: var(--primary-500);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-primary:hover {
      background-color: var(--primary-600);
    }
    
    .btn-outline {
      background-color: white;
      color: var(--neutral-700);
      border: 1px solid var(--neutral-300);
    }
    
    .add-comment-form {
      padding: var(--space-3);
      border-top: 1px solid var(--neutral-200);
      margin-top: var(--space-3);
    }
    
    .add-comment-form h4 {
      margin-top: 0;
      margin-bottom: var(--space-2);
      color: var(--neutral-700);
    }
    
    .comment-input {
      width: 100%;
      padding: var(--space-2);
      border: 1px solid var(--neutral-300);
      border-radius: 4px;
      margin-bottom: var(--space-2);
      font-family: inherit;
      resize: vertical;
    }
    
    .comment-input:focus {
      outline: none;
      border-color: var(--primary-400);
      box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
    }

    /* Dark theme support */
    :host-context([data-theme="dark"]) .idea-card {
      background-color: var(--card-bg);
      color: var(--card-text);
    }
    
    :host-context([data-theme="dark"]) .idea-title,
    :host-context([data-theme="dark"]) .idea-description,
    :host-context([data-theme="dark"]) .idea-meta {
      color: var(--card-text);
    }
    
    /* Orange buttons in dark mode */
    :host-context([data-theme="dark"]) .vote-button,
    :host-context([data-theme="dark"]) .comment-button {
      background-color: var(--primary-500);
      color: white;
      border-color: var(--primary-600);
    }
    
    :host-context([data-theme="dark"]) .vote-button:hover,
    :host-context([data-theme="dark"]) .comment-button:hover {
      background-color: var(--primary-600);
      color: white;
    }
    
    /* Ensure voted buttons have distinct styling */
    :host-context([data-theme="dark"]) .vote-button.upvote.voted,
    :host-context([data-theme="dark"]) .vote-button.downvote.voted {
      background-color: var(--primary-700);
      color: white;
      border-color: var(--primary-800);
    }
    
    /* Modal styling in dark mode */
    :host-context([data-theme="dark"]) .modal-overlay {
      background-color: rgba(0, 0, 0, 0.7);
    }
    
    :host-context([data-theme="dark"]) .modal-content {
      background-color: var(--card-bg);
      color: var(--card-text);
    }
    
    :host-context([data-theme="dark"]) .btn-primary {
      background-color: var(--primary-500);
      color: white;
    }
    
    :host-context([data-theme="dark"]) .btn-primary:hover {
      background-color: var(--primary-600);
    }
    
    :host-context([data-theme="dark"]) .comment-input {
      background-color: var(--bg-tertiary);
      color: var(--card-text);
      border-color: var(--border-color);
    }

    /* User metrics styles */
    .metrics-container {
      background-color: var(--card-bg, white);
      border-radius: 8px;
      padding: var(--space-3);
      margin-bottom: var(--space-4);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .metrics-title {
      color: var(--primary-500);
      margin-bottom: var(--space-3);
      font-size: 1.25rem;
      text-align: center;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    
    @media (min-width: 768px) {
      .metrics-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    
    .metric-card {
      background-color: var(--bg-secondary, #f8f9fa);
      border-radius: 8px;
      padding: var(--space-2);
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
    }
    
    .metric-icon {
      font-size: 1.5rem;
      margin-bottom: var(--space-1);
    }
    
    .metric-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--primary-600);
    }
    
    .metric-label {
      font-size: 0.75rem;
      color: var(--neutral-600);
    }
    
    .achievement-banner {
      background: linear-gradient(to right, var(--primary-100), var(--primary-200));
      border-radius: 8px;
      padding: var(--space-2);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      transition: transform 0.3s ease;
      animation: slideIn 0.6s ease-out;
    }
    
    .achievement-banner:hover {
      transform: scale(1.02);
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .achievement-icon {
      font-size: 2rem;
    }
    
    .achievement-content {
      flex: 1;
    }
    
    .achievement-title {
      font-weight: 500;
      margin-bottom: var(--space-1);
    }
    
    .progress-bar {
      height: 8px;
      background-color: var(--neutral-200);
      border-radius: 4px;
      margin-bottom: var(--space-1);
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background-color: var(--primary-500);
      border-radius: 4px;
    }
    
    .achievement-text {
      font-size: 0.875rem;
      color: var(--neutral-700);
    }
    
    /* Dark theme support for metrics */
    :host-context([data-theme="dark"]) .metrics-container {
      background-color: var(--card-bg);
    }
    
    :host-context([data-theme="dark"]) .metrics-title {
      color: var(--primary-400);
    }
    
    :host-context([data-theme="dark"]) .metric-card {
      background-color: var(--bg-tertiary);
    }
    
    :host-context([data-theme="dark"]) .metric-value {
      color: var(--primary-400);
    }
    
    :host-context([data-theme="dark"]) .metric-label {
      color: var(--neutral-400);
    }
    
    :host-context([data-theme="dark"]) .achievement-banner {
      background: linear-gradient(to right, rgba(var(--primary-rgb), 0.2), rgba(var(--primary-rgb), 0.3));
    }
    
    :host-context([data-theme="dark"]) .progress-bar {
      background-color: var(--neutral-700);
    }
    
    :host-context([data-theme="dark"]) .achievement-text {
      color: var(--neutral-300);
    }

    /* Shake animation for vote buttons */
    @keyframes shake {
      0% { transform: translateX(0); }
      10% { transform: translateX(-5px); }
      20% { transform: translateX(5px); }
      30% { transform: translateX(-5px); }
      40% { transform: translateX(5px); }
      50% { transform: translateX(-3px); }
      60% { transform: translateX(3px); }
      70% { transform: translateX(-2px); }
      80% { transform: translateX(2px); }
      90% { transform: translateX(-1px); }
      100% { transform: translateX(0); }
    }
    
    .shake-animation {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
      perspective: 1000px;
    }

    /* Staggered animation for cards */
    .ideas-list .idea-card:nth-child(1) { animation-delay: 0.1s; }
    .ideas-list .idea-card:nth-child(2) { animation-delay: 0.2s; }
    .ideas-list .idea-card:nth-child(3) { animation-delay: 0.3s; }
    .ideas-list .idea-card:nth-child(4) { animation-delay: 0.4s; }
    .ideas-list .idea-card:nth-child(5) { animation-delay: 0.5s; }

    /* Metrics grid staggered animation */
    .metrics-grid .metric-card:nth-child(1) { animation: popIn 0.5s ease-out 0.1s both; }
    .metrics-grid .metric-card:nth-child(2) { animation: popIn 0.5s ease-out 0.2s both; }
    .metrics-grid .metric-card:nth-child(3) { animation: popIn 0.5s ease-out 0.3s both; }
    .metrics-grid .metric-card:nth-child(4) { animation: popIn 0.5s ease-out 0.4s both; }

    @keyframes popIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `]
})
export class IdeaListComponent implements OnInit, OnDestroy {
  ideas: Idea[] = [];
  selectedIdea: Idea | null = null;
  commentsPerPage = 2; // Show 2 comments per page
  currentPage = 0;
  totalPages = 0;
  newComment: string = '';
  isAdmin: boolean = false;
  currentUser: any = null;
  private userSub!: Subscription;
  private subscription = new Subscription();
  
  // Add user metrics
  userMetrics = {
    ideasSubmitted: 0,
    implementedIdeas: 0,
    totalComments: 0,
    totalUpvotes: 0,
    engagementRate: 0,
    communityPoints: 0,
    topIdeas: 0,
    monthlyIdeasSubmitted: 0,
    monthlyGoalProgress: 0
  };

  // Add this property to store generated anonymous IDs
  private anonymousIdMap: Map<string, number> = new Map();

  constructor(
    private authService: AuthService,
    private themeUtils: ThemeUtilsService,
    private ideaService: IdeaService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin';
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
    
    // Subscribe to idea refresh events
    this.subscription.add(
      this.ideaService.refresh$.subscribe(() => {
        this.loadRecentIdeas();
        this.loadUserMetricsAndProgress();
      })
    );
    
    // Initial load
    this.loadRecentIdeas();
    this.loadUserMetricsAndProgress();
    
    // Apply dark mode styling
    this.themeUtils.applyDarkModeStyles('.idea-card');
    
    // Listen for theme changes
    this.themeUtils.setupThemeChangeListener('.idea-card');
  }
  
  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.subscription.unsubscribe();
  }
  
  getDisplayName(authorId: string, authorName: string): string {
    // If user is admin, show employee ID in standard format
    if (this.isAdmin) {
      // Ensure authorId starts with EMP and has a 4-digit number
      if (authorId.startsWith('EMP') && authorId.length >= 7) {
        return `Employee ${authorId}`;
      } else {
        // Format as EMP followed by 4 digits if not already in that format
        const empId = authorId.startsWith('EMP') ? authorId : `EMP${authorId.substring(0, 4)}`;
        
        // Check if the ID after "EMP" contains non-numeric characters
        const idPart = empId.substring(3);
        if (!/^\d+$/.test(idPart)) {
          // If non-numeric, generate a random 4-digit number instead
          return `Employee EMP${1000 + Math.floor(Math.random() * 9000)}`;
        }
        
        return `Employee ${empId}`;
      }
    }
    
    // For regular users, use a consistent anonymous ID for each author
    if (!this.anonymousIdMap.has(authorId)) {
      // Generate a random 4-digit number and store it
      this.anonymousIdMap.set(authorId, 1000 + Math.floor(Math.random() * 9000));
    }
    
    // Return the stored anonymous ID
    return `Anonymous User ${this.anonymousIdMap.get(authorId)}`;
  }

  vote(idea: Idea, voteType: 'up' | 'down') {
    // Optimistic UI update for immediate feedback
    const previousVote = idea.userVote;
    const previousUpvotes = idea.upvotes || 0;
    const previousDownvotes = idea.downvotes || 0;
    
    if (idea.userVote === voteType) {
      // If clicking the same vote type, remove the vote
      if (voteType === 'up') {
        idea.upvotes = Math.max(0, previousUpvotes - 1);
      } else {
        idea.downvotes = Math.max(0, previousDownvotes - 1);
      }
      idea.userVote = null;
    } else {
      // If switching vote or voting for the first time
      if (voteType === 'up') {
        idea.upvotes = previousUpvotes + 1;
        if (previousVote === 'down') {
          idea.downvotes = Math.max(0, previousDownvotes - 1);
        }
      } else {
        idea.downvotes = previousDownvotes + 1;
        if (previousVote === 'up') {
          idea.upvotes = Math.max(0, previousUpvotes - 1);
        }
      }
      idea.userVote = voteType;
    }

    this.ideaService.voteIdea(idea.id, voteType === 'up').subscribe({
      next: (response) => {
        console.log('Vote API response:', response);
        // Update with backend response to ensure accuracy
        if (response) {
          const newUpvotes = response.upvotes || response.upVotes;
          const newDownvotes = response.downvotes || response.downVotes;
          const newUserVote = response.userVote;
          
          console.log(`Backend response - upvotes: ${newUpvotes}, downvotes: ${newDownvotes}, userVote: ${newUserVote}`);
          
          if (newUpvotes !== undefined) idea.upvotes = newUpvotes;
          if (newDownvotes !== undefined) idea.downvotes = newDownvotes;
          if (newUserVote !== undefined) idea.userVote = newUserVote;
        }
      },
      error: (err) => {
        console.error('Vote failed', err);
        // Revert optimistic update on error
        idea.userVote = previousVote;
        idea.upvotes = previousUpvotes;
        idea.downvotes = previousDownvotes;
      }
    });
  }

  viewComments(idea: Idea) {
    this.selectedIdea = idea;
    this.currentPage = 0;
    this.calculateTotalPages();
    this.newComment = '';
    
    // Load comments from the API
    this.ideaService.getComments(idea.id).subscribe({
      next: (comments: any) => {
        console.log('Comments loaded:', comments);
        if (this.selectedIdea) {
          this.selectedIdea.commentsList = Array.isArray(comments) ? comments.map((comment: any) => ({
            text: comment.text,
            author: comment.user?.name || comment.author || 'Anonymous',
            authorId: comment.userId || comment.authorHash || comment.user?.id,
            timestamp: comment.createdAt || comment.timestamp
          })) : [];
          this.selectedIdea.commentCount = this.selectedIdea.commentsList.length;
          this.calculateTotalPages();
        }
      },
      error: (err) => {
        console.error('Failed to load comments', err);
        if (this.selectedIdea) {
          this.selectedIdea.commentsList = [];
        }
      }
    });
  }

  closeCommentsModal() {
    this.selectedIdea = null;
    this.currentPage = 0;
    this.newComment = '';
  }
  
  calculateTotalPages(): void {
    if (!this.selectedIdea) return;
    
    this.totalPages = Math.ceil(this.selectedIdea.commentsList.length / this.commentsPerPage);
  }
  
  getVisibleComments(): Comment[] {
    if (!this.selectedIdea) return [];
    
    const start = this.currentPage * this.commentsPerPage;
    const end = start + this.commentsPerPage;
    
    return this.selectedIdea.commentsList.slice(start, end);
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }
  
  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }
  
  addComment(): void {
    if (!this.selectedIdea || !this.newComment.trim() || !this.currentUser) return;
    
    const commentText = this.newComment.trim();
    this.newComment = ''; // Clear input immediately for better UX
    
    this.ideaService.addComment(this.selectedIdea.id, commentText).subscribe({
      next: (newComment) => {
        console.log('Comment added successfully:', newComment);
        // Reload comments from API to get updated count and ensure consistency
        this.ideaService.getComments(this.selectedIdea!.id).subscribe((comments: any) => {
          if (this.selectedIdea) {
            this.selectedIdea.commentsList = Array.isArray(comments) ? comments.map((comment: any) => ({
              text: comment.text,
              author: comment.user?.name || comment.author || 'Anonymous',
              authorId: comment.userId || comment.authorHash || comment.user?.id,
              timestamp: comment.createdAt || comment.timestamp
            })) : [];
            this.selectedIdea.commentCount = this.selectedIdea.commentsList.length;
            this.calculateTotalPages();
            this.currentPage = 0; // Go to first page to see the new comment
          }
        });
      },
      error: (err) => {
        console.error('Add comment failed', err);
        // Restore the comment text if it failed
        this.newComment = commentText;
      }
    });
  }

  /**
   * Loads user metrics and progress from the backend API endpoints only.
   */
  loadUserMetricsAndProgress(): void {
    // Dashboard metrics
    this.subscription.add(
      this.ideaService.getDashboardMetrics().subscribe({
        next: (metrics: any) => {
          this.userMetrics.implementedIdeas = metrics.ideasImplemented || 0;
          this.userMetrics.engagementRate = metrics.engagementRate || 0;
          this.userMetrics.communityPoints = metrics.communityPoints || 0;
          this.userMetrics.topIdeas = Math.round(metrics.topIdeasPercentage || 0);
        }
      })
    );
    // Dashboard progress
    this.subscription.add(
      this.ideaService.getUserProgress().subscribe({
        next: (progress: any) => {
          this.userMetrics.monthlyIdeasSubmitted = progress.submitted || 0;
          this.userMetrics.monthlyGoalProgress = Math.min(100, Math.round((progress.submitted / progress.goal) * 100));
        }
      })
    );
  }

  calculateMonthlyIdeasSubmitted(ideas: any[]): number {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Count ideas submitted in the current month
    const monthlyIdeas = ideas.filter(idea => {
      // For newly submitted ideas, always count them as current month
      if (idea.timestamp === 'Just now' || idea._originalTimestamp === 'Just now') {
        return true;
      }
      
      // If idea has a sortDate, use it
      if (idea._sortDate instanceof Date) {
        return idea._sortDate >= firstDayOfMonth;
      }
      
      // Otherwise try to parse from timestamp
      if (idea.timestamp) {
        // Handle "X days/weeks/months ago" format
        const match = idea.timestamp.match(/(\d+)\s+(day|week|month|hr|hour|minute|second)s?\s+ago/i);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          const ideaDate = new Date();
          
          if (unit === 'second' || unit === 'minute') {
            return true;
          } else if (unit === 'hr' || unit === 'hour') {
            return true;
          } else if (unit === 'day') {
            ideaDate.setDate(ideaDate.getDate() - amount);
          } else if (unit === 'week') {
            ideaDate.setDate(ideaDate.getDate() - (amount * 7));
          } else if (unit === 'month') {
            ideaDate.setMonth(ideaDate.getMonth() - amount);
          }
          
          return ideaDate >= firstDayOfMonth;
        }
        
        // Try to parse as date string
        try {
          const date = new Date(idea.timestamp);
          if (!isNaN(date.getTime())) {
            return date >= firstDayOfMonth;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      return false;
    });
    
    return monthlyIdeas.length;
  }
  
  getWeeklyGoalMessage(count: number): string {
    const monthlyGoal = 5;
    if (count >= monthlyGoal) {
      return `Congratulations! You've reached your monthly goal of ${monthlyGoal} ideas.`;
    } else {
      return `You've submitted ${count} of ${monthlyGoal} ideas this month.`;
    }
  }

  loadRecentIdeas(): void {
    this.subscription.add(
      this.ideaService.getIdeas({ sortBy: 'recent', limit: 20 }).subscribe((ideas: any) => {
        let ideasArray: any[] = [];
        if (Array.isArray(ideas)) {
          ideasArray = ideas;
        } else if (ideas && Array.isArray(ideas.data)) {
          ideasArray = ideas.data;
        } else {
          ideasArray = [];
        }
        
        const convertedIdeas = ideasArray.map((idea: any) => ({
          id: idea.id,
          title: idea.title,
          description: idea.description,
          votes: (idea.upVotes || idea.upvotes || 0) - (idea.downVotes || idea.downvotes || 0),
          upvotes: idea.upVotes || idea.upvotes || 0,
          downvotes: idea.downVotes || idea.downvotes || 0,
          comments: idea.commentCount || idea.comments?.length || 0,
          commentCount: idea.commentCount || 0,
          author: this.getDisplayName(idea.anonymousId || idea.authorHash, 'Anonymous'),
          authorId: idea.anonymousId || idea.authorHash,
          timestamp: idea.createdAt || idea.timestamp,
          userVote: idea.userVote,
          commentsList: idea.comments ? idea.comments.map((comment: { text: any; author: any; authorHash: any; timestamp: any; }) => ({
            text: comment.text,
            author: comment.author || 'Anonymous',
            authorId: comment.authorHash,
            timestamp: comment.timestamp
          })) : [],
          _sortDate: idea.createdAt ? new Date(idea.createdAt) : new Date()
        }));
        
        // Use the ideas directly from API (already sorted and limited)
        this.ideas = convertedIdeas;
        
        // Update comments count to match commentsList length
        this.ideas.forEach(idea => {
          idea.comments = idea.commentsList.length;
        });
        
        console.log('Loaded recent ideas:', this.ideas);
      })
    );
  }
}




// I've updated the engagement rate calculation to:

// Count the number of ideas the user has liked (upvoted)
// Count the total number of comments made by the user across all ideas
// Calculate an engagement score where:
// Each like (upvote) = 1 point
// Each comment = 2 points (comments show more engagement than likes)
// Calculate the maximum possible engagement if the user had liked and commented on every idea
// Express the engagement rate as a percentage of this maximum possible engagement
// Cap the engagement rate at 100% to handle cases where a user might comment multiple times on the same idea











// I've updated the engagement rate calculation to:

// Count the number of ideas the user has liked (upvoted)
// Count the total number of comments made by the user across all ideas
// Calculate an engagement score where:
// Each like (upvote) = 1 point
// Each comment = 2 points (comments show more engagement than likes)
// Calculate the maximum possible engagement if the user had liked and commented on every idea
// Express the engagement rate as a percentage of this maximum possible engagement
// Cap the engagement rate at 100% to handle cases where a user might comment multiple times on the same idea





// Key differences between Engagement Rate and Community Points:

// Engagement Rate (0-100%):
// Measures how active the user is across all available ideas
// Calculated as the percentage of ideas the user has engaged with (voted or commented on)
// Represents current participation level in the community
// Resets if user stops engaging with ideas
// Community Points (cumulative score):
// A weighted cumulative score that grows over time
// Rewards all contributions: submitting ideas, getting ideas implemented, commenting, and receiving upvotes
// Different activities have different point values based on their importance
// Never decreases unless points are explicitly removed
// Represents the user's total contribution to the community over time
// This implementation clearly differentiates between the two metrics and calculates them appropriately.


  // calculateUserMetrics(ideas: Idea[], myIdeas: Idea[]): void {
  //   const currentUserId = this.currentUser?.id || '';
    
  //   // Calculate total ideas submitted by the user
  //   this.userMetrics.ideasSubmitted = myIdeas.length;
    

// Key improvements:

// Ideas Implemented: Now checks for 'implemented' status (case-insensitive) using type assertion to handle potential missing status property
// Ideas in Top 10%: Uses the sorted list of all ideas by upvotes to determine the top 10%, then checks how many of the user's ideas are in that list
// Engagement Rate: Properly calculates the percentage of ideas the user has engaged with through votes or comments
// Community Points: Weighted score based on all user activities (ideas submitted, implemented ideas, comments made, upvotes received)
// Monthly Goal Progress: Accurately determines ideas submitted in the current month
