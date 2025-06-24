import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IdeaService, IdeaPost } from '../../services/idea.service';
import { ThemeUtilsService } from '../../services/theme-utils.service';
import { Subscription, forkJoin, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PopularIdeasComponent } from '../popular-ideas/popular-ideas.component';
import { MyIdeasComponent } from '../my-ideas/my-ideas.component';
import { AdminMyIdeasComponent } from '../admin/admin-my-ideas/admin-my-ideas.component';
import { UserDisplayService } from '../../services/user-display.service';

// Define Comment interface locally if not imported from service
interface Comment {
  text: string;
  author: string;
  authorHash: string;
  timestamp: string;
}

@Component({
  selector: 'app-idea-feed',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <main class="main-content">
      <div class="container">
        <h1 class="page-title" style="color: #FF7A00">Idea Feed</h1>
        
        <div class="filters">
          <div class="category-filters">
            @for (category of categories; track category) {
              <button 
                class="category-pill"
                [class.active]="selectedCategory === category"
                (click)="filterByCategory(category)"
              >
                {{ category }}
              </button>
            }
          </div>
          
          <div class="search-container">
            <input 
              type="text" 
              placeholder="Search ideas, hashtags, or categories..." 
              class="search-input"
              [(ngModel)]="searchQuery"
              (input)="searchIdeas()"
              (keyup.enter)="searchIdeas()"
            >
            <button class="search-button" (click)="searchIdeas()">
               Search
            </button>
          </div>
        </div>
        
        <div class="idea-feed">
          @for (idea of filteredIdeas; track idea.id) {
            <div class="idea-card">
              <div class="idea-content">
                <h3 class="idea-title">{{ idea.title }}</h3>
                
                @if (idea.tags && idea.tags.length > 0) {
                  <div class="idea-tags">
                    @for (tag of idea.tags; track tag) {
                        <span class="idea-tag">#{{ tag }}</span>
                    }
                  </div>
                }
                
                <p class="idea-description">{{ idea.description }}</p>
                
                @if (idea.attachments && idea.attachments.length > 0) {
                  <div class="idea-attachments">
                    <h4 class="attachments-title">Attachments ({{ idea.attachments.length }})</h4>
                    <div class="attachments-list">
                      @for (attachment of idea.attachments; track attachment.name) {
                        <div class="attachment-item">
                          <span class="attachment-icon">📎</span>
                          <span class="attachment-name">{{ attachment.name }}</span>
                          <span class="attachment-size">({{ formatFileSize(attachment.size) }})</span>
                        </div>
                      }
                    </div>
                  </div>
                }
                
                <!-- @if (idea.requiredResources && idea.requiredResources.length > 0) {
                  <div class="idea-attachments">
                    <h4 class="attachments-title">Required Resources ({{ idea.requiredResources.length }})</h4>
                    <div class="attachments-list">
                      @for (resource of idea.requiredResources; track resource) {
                        <div class="attachment-item">
                          <span class="attachment-icon">📋</span>
                          <span class="attachment-name">{{ resource }}</span>
                        </div>
                      }
                    </div>
                  </div>
                } -->
                
                <div class="idea-meta">
                  <span class="author">{{getAnonymousDisplayName(idea.authorHash)}}</span>
                  <span class="timestamp">{{idea.timestamp}}</span>
                  <span class="category">Category: {{idea.category || 'N/A'}}</span>
                </div>
              </div>
              <div class="idea-actions">
                  <button 
                  class="vote-button upvote" 
                    [class.voted]="idea.userVote === 'up'"
                  (click)="vote(idea, 'up')">
                  👍 {{idea.upvotes || 0}}
                  </button>
                  <button 
                  class="vote-button downvote" 
                    [class.voted]="idea.userVote === 'down'"
                  (click)="vote(idea, 'down')">
                  👎 {{idea.downvotes || 0}}
                  </button>
                <button class="comment-button" (click)="viewComments(idea)">
                  💬 {{idea.commentCount || 0}}
                  </button>
                <!-- <button class="details-button" (click)="viewIdeaDetails(idea)">
                  View Details
                  </button> -->
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- Comments Modal -->
      @if (selectedIdea) {
        <div class="comments-modal-overlay">
          <div class="comments-modal">
            <div class="comments-header">
              <h2 class="comments-title">Comments for "{{ selectedIdea.title }}"</h2>
              <button class="close-btn" (click)="closeCommentsModal()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"/>
                </svg>
              </button>
            </div>
            <div class="comments-list">
              @if (!selectedIdea.comments || selectedIdea.comments.length === 0) {
                <div class="no-comments">
                  No comments yet. Be the first to comment!
                </div>
              }
              @for (comment of selectedIdea.comments || []; track comment) {
                <div class="comment">
                  <div class="comment-header">
                    <span class="comment-author">{{getAnonymousDisplayName(comment.authorHash)}}</span>
                    <span class="comment-time">{{ comment.timestamp }}</span>
                  </div>
                  <div class="comment-content">{{ comment.text }}</div>
                </div>
              }
            </div>
            <div class="comments-form">
              <textarea 
                class="comment-input" 
                [(ngModel)]="newComment" 
                placeholder="Add a comment..."
              ></textarea>
              <button class="comment-submit-btn" (click)="addComment()">Add Comment</button>
            </div>
          </div>
        </div>
      }
    </main>
    
    <!-- Idea Details Modal -->
    @if (selectedIdeaForDetails) {
      <div class="details-modal-overlay">
        <div class="details-modal">
          <div class="details-header">
            <h2 class="details-title">{{ selectedIdeaForDetails.title }}</h2>
            <button class="close-btn" (click)="closeDetailsModal()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"/>
              </svg>
            </button>
          </div>
          <div class="details-body">
            <div class="idea-details">
              <div class="idea-meta">
                <span class="idea-author">By: {{getAnonymousDisplayName(selectedIdeaForDetails.authorHash)}}</span>
                <span class="idea-time">{{selectedIdeaForDetails.timestamp}}</span>
                <span class="idea-category">Category: {{selectedIdeaForDetails.category || 'N/A'}}</span>
              </div>
              
              <div class="detail-section">
                <h3 class="detail-title">Description</h3>
                <div class="idea-content">
                  <p>{{ selectedIdeaForDetails.description }}</p>
                </div>
              </div>
              
              @if (selectedIdeaForDetails.tags && selectedIdeaForDetails.tags.length > 0) {
                <div class="detail-section">
                  <h3 class="detail-title">Tags</h3>
                  <div class="idea-tags">
                    @for (tag of selectedIdeaForDetails.tags; track tag) {
                      <span class="idea-tag">#{{ tag }}</span>
                    }
                  </div>
                </div>
              }
              
              @if (selectedIdeaForDetails.attachments && selectedIdeaForDetails.attachments.length > 0) {
                <div class="detail-section">
                  <h3 class="detail-title">Attachments ({{ selectedIdeaForDetails.attachments.length }})</h3>
                  <div class="attachments-list">
                    @for (attachment of selectedIdeaForDetails.attachments; track attachment.name) {
                      <div class="attachment-item">
                        <span class="attachment-icon">📎</span>
                        <span class="attachment-name">{{ attachment.name }}</span>
                        <span class="attachment-size">({{ formatFileSize(attachment.size) }})</span>
                      </div>
                    }
                  </div>
                </div>
              }
              
              @if (selectedIdeaForDetails.requiredResources) {
                <div class="detail-section">
                  <h3 class="detail-title">Required Resources</h3>
                  <p class="detail-value">{{ selectedIdeaForDetails.requiredResources }}</p>
                </div>
              }
              
              <div class="idea-stats">
                <div class="stat">
                  <span class="stat-label">Upvotes:</span>
                  <span class="stat-value upvotes">{{selectedIdeaForDetails.upvotes || 0}}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Downvotes:</span>
                  <span class="stat-value downvotes">{{selectedIdeaForDetails.downvotes || 0}}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Comments:</span>
                  <span class="stat-value">{{selectedIdeaForDetails.commentCount || 0}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .main-content {
      padding: var(--space-4) 0;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 var(--space-4);
    }
    
    .page-title {
      margin-bottom: var(--space-4);
      color: var(--neutral-800);
      font-size: 1.75rem;
    }
    
    .filters {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-4);
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    
    .category-filters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    
    .category-pill {
      padding: var(--space-1) var(--space-2);
      border-radius: 20px;
      background-color: var(--neutral-100);
      border: 1px solid var(--neutral-200);
      color: var(--neutral-700);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .category-pill.active {
      background-color: var(--primary-100);
      border-color: var(--primary-300);
      color: var(--primary-700);
    }
    
    .search-container {
      flex: 1;
      max-width: 400px;
      display: flex;
      gap: var(--space-2);
    }
    
    .search-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--neutral-300);
      border-radius: 4px;
      font-size: 0.875rem;
    }
    
    .search-button {
      padding: 8px 16px;
      background-color: var(--primary-500);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
      white-space: nowrap;
    }
    
    .search-button:hover {
      background-color: var(--primary-600);
    }
    
    /* Dark theme support for search */
    :host-context([data-theme="dark"]) .search-input {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    
    :host-context([data-theme="dark"]) .search-button {
      background-color: var(--primary-500);
      color: white;
    }
    
    :host-context([data-theme="dark"]) .search-button:hover {
      background-color: var(--primary-600);
    }
    
    .idea-feed {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    
    .idea-card {
      background-color: white;
      border-radius: 8px;
      padding: var(--space-3);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      animation: fadeIn 0.5s ease-out;
    }
    .idea-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px);}
      to { opacity: 1; transform: translateY(0);}
    }
    .idea-title {
      font-size: 1.125rem;
      margin: 0 0 var(--space-2) 0;
      color: var(--neutral-800);
    }
    .idea-description {
      color: var(--neutral-600);
      font-size: 0.875rem;
      margin-bottom: var(--space-2);
    }
    .idea-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--neutral-500);
    }
    .idea-actions {
      display: flex;
      gap: var(--space-1);
      margin-top: var(--space-2);
    }
    .vote-button,
    .comment-button {
      padding: 4px 8px;
      border: 1px solid var(--neutral-200);
      border-radius: 4px;
      background-color: white;
      color: var(--neutral-700);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.75rem;
      min-width: 80px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: normal;
      line-height: 1;
    }
    .vote-button:hover,
    .comment-button:hover {
      background-color: var(--neutral-50);
    }
    .vote-button.upvote.voted {
      background-color: var(--primary-50);
      color: var(--primary-700);
      border-color: var(--primary-200);
    }
    .vote-button.downvote.voted {
      background-color: #fee2e2;
      color: #dc2626;
      border-color: #fecaca;
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
    :host-context([data-theme="dark"]) .vote-button.upvote.voted,
    :host-context([data-theme="dark"]) .vote-button.downvote.voted {
      background-color: var(--primary-700);
      color: white;
      border-color: var(--primary-800);
    }
    
    .idea-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin-bottom: var(--space-2);
    }
    
    .idea-tag {
      font-size: 0.75rem;
      color: var(--primary-600);
      background-color: var(--primary-50);
      padding: 2px 8px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 4px;
    }
    
    .idea-content {
      color: var(--neutral-700);
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: var(--space-3);
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }
    
    .idea-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .vote-actions {
      display: flex;
      gap: var(--space-2);
    }
    
    .vote-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--neutral-200);
      background-color: white;
      color: var(--neutral-600);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .vote-btn:hover {
      background-color: var(--neutral-50);
    }
    
    .vote-btn.voted.upvote {
      background-color: var(--primary-50);
      color: var(--primary-600);
      border-color: var(--primary-200);
    }
    
    .vote-btn.voted.downvote {
      background-color: #fee2e2;
      color: #dc2626;
      border-color: #fecaca;
    }
    
    .idea-author {
      font-size: 0.75rem;
      color: var(--neutral-500);
    }
    
    .idea-attachments {
      margin: var(--space-2) 0;
      padding: var(--space-2);
      background-color: var(--neutral-50);
      border-radius: 6px;
    }
    
    .attachments-title {
      font-size: 0.875rem;
      color: var(--neutral-700);
      margin-bottom: var(--space-1);
    }
    
    .attachments-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .attachment-item {
      display: flex;
      align-items: center;
      font-size: 0.75rem;
      color: var(--neutral-600);
    }
    
    .attachment-icon {
      margin-right: 4px;
    }
    
    .attachment-name {
      margin-right: 4px;
      font-weight: 500;
    }
    
    .attachment-size {
      color: var(--neutral-500);
    }
    
    .comment-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--neutral-200);
      background-color: white;
      color: var(--neutral-600);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .comment-btn:hover {
      background-color: var(--neutral-50);
      color: var(--primary-600);
    }
    
    .idea-actions {
      display: flex;
      gap: var(--space-2);
      margin-left: var(--space-2);
    }
    
    /* Comments Modal Styles */
    .comments-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
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
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .comments-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3);
      border-bottom: 1px solid var(--neutral-200);
    }
    
    .comments-title {
      margin: 0;
      font-size: 1.25rem;
      color: var(--neutral-800);
    }
    
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--neutral-500);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .comments-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-3);
      max-height: 50vh;
    }
    
    .no-comments {
      text-align: center;
      color: var(--neutral-500);
      padding: var(--space-4);
    }
    
    .comment {
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--neutral-100);
    }
    
    .comment:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    
    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-1);
    }
    
    .comment-author {
      font-weight: 500;
      color: var(--neutral-800);
    }
    
    .comment-time {
      font-size: 0.75rem;
      color: var(--neutral-500);
    }
    
    .comment-content {
      color: var(--neutral-700);
      font-size: 0.875rem;
      line-height: 1.5;
    }
    
    .comments-form {
      display: flex;
      gap: var(--space-2);
      padding: var(--space-3);
      border-top: 1px solid var(--neutral-200);
    }
    
    .comment-input {
      flex: 1;
      padding: var(--space-2);
      border: 1px solid var(--neutral-300);
      border-radius: 4px;
      font-size: 0.875rem;
      resize: vertical;
      min-height: 60px;
    }
    
    .comment-submit-btn {
      padding: var(--space-2) var(--space-3);
      border: none;
      border-radius: 4px;
      background-color: var(--primary-500);
      color: white;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .comment-submit-btn:hover {
      background-color: var(--primary-600);
    }
    
    /* Details Button Styles */
    .details-button {
      padding: 4px 8px;
      border: 1px solid var(--neutral-200);
      border-radius: 4px;
      background-color: white;
      color: var(--neutral-700);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.75rem;
      min-width: 100px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: normal;
      line-height: 1;
    }
    
    .details-button:hover {
      background-color: var(--neutral-50);
      color: var(--primary-600);
    }
    
    /* Details Button Styles - Orange Theme */
    .details-button {
      padding: 4px 8px;
      border: 1px solid #FF7A00;
      border-radius: 4px;
      background-color: #FF7A00;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.75rem;
      min-width: 100px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: normal;
      line-height: 1;
    }
    
    .details-button:hover {
      background-color: #e66a00;
      border-color: #e66a00;
      color: white;
    }
    
    /* Details Modal Styles */
    .details-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .details-modal {
      background-color: white;
      border-radius: 8px;
      width: 90%;
      max-width: 700px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3);
      border-bottom: 1px solid var(--neutral-200);
    }
    
    .details-title {
      margin: 0;
      font-size: 1.25rem;
      color: var(--neutral-800);
    }
    
    .details-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-3);
      max-height: 70vh;
    }
    
    .idea-details {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    
    .detail-section {
      border-bottom: 1px solid var(--neutral-100);
      padding-bottom: var(--space-2);
    }
    
    .detail-section:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .detail-title {
      font-size: 1rem;
      color: var(--neutral-800);
      margin-bottom: var(--space-2);
      font-weight: 600;
    }
    
    .engagement-stats {
      display: flex;
      gap: var(--space-4);
      flex-wrap: wrap;
    }
    
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: var(--neutral-600);
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 1rem;
      font-weight: 600;
    }
    
    .stat-value.upvotes {
      color: var(--primary-600);
    }
    
    .stat-value.downvotes {
      color: #dc2626;
    }
    
    /* Enhanced Dark theme support */
    :host-context([data-theme="dark"]) .idea-card {
      background-color: var(--card-bg);
      color: var(--card-text);
    }
    
    :host-context([data-theme="dark"]) .idea-title,
    :host-context([data-theme="dark"]) .idea-content,
    :host-context([data-theme="dark"]) .idea-meta,
    :host-context([data-theme="dark"]) .idea-author {
      color: var(--card-text);
    }
    
    /* Orange buttons in dark mode */
    :host-context([data-theme="dark"]) .vote-btn,
    :host-context([data-theme="dark"]) .comment-btn {
      background-color: var(--primary-500);
      color: white;
      border-color: var(--primary-600);
    }
    
    :host-context([data-theme="dark"]) .vote-btn:hover,
    :host-context([data-theme="dark"]) .comment-btn:hover {
      background-color: var(--primary-600);
      color: white;
    }
    
    /* Ensure voted buttons have distinct styling */
    :host-context([data-theme="dark"]) .vote-btn.voted.upvote,
    :host-context([data-theme="dark"]) .vote-btn.voted.downvote {
      background-color: var(--primary-700);
      color: white;
      border-color: var(--primary-800);
    }
    
    :host-context([data-theme="dark"]) .comments-modal {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .comments-title {
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .comment-content {
      color: var(--text-secondary);
    }
    
    :host-context([data-theme="dark"]) .category-pill {
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
      border-color: var(--border-color);
    }
    
    :host-context([data-theme="dark"]) .category-pill.active {
      background-color: var(--primary-600);
      color: white;
      border-color: var(--primary-700);
    }
    
    :host-context([data-theme="dark"]) .search-input {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    
    :host-context([data-theme="dark"]) .idea-attachments {
      background-color: var(--bg-tertiary);
    }
    
    :host-context([data-theme="dark"]) .attachments-title {
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .attachment-item {
      color: var(--text-secondary);
    }
    
    :host-context([data-theme="dark"]) .idea-author,
    :host-context([data-theme="dark"]) .idea-time,
    :host-context([data-theme="dark"]) .comment-time {
      color: var(--text-tertiary);
    }
    
    /* Dark theme support for details modal */
    :host-context([data-theme="dark"]) .details-modal {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .details-title {
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .detail-title {
      color: var(--text-primary);
    }
    
    :host-context([data-theme="dark"]) .details-button {
      background-color: var(--primary-500);
      color: white;
      border-color: var(--primary-600);
    }
    
    :host-context([data-theme="dark"]) .details-button:hover {
      background-color: var(--primary-600);
      color: white;
    }
    
    :host-context([data-theme="dark"]) .detail-section {
      border-bottom-color: var(--border-color);
    }
    
    :host-context([data-theme="dark"]) .stat-label {
      color: var(--text-secondary);
    }
    
    @media (max-width: 640px) {
      .filters {
        flex-direction: column;
        align-items: stretch;
      }
      
      .search-container {
        max-width: 100%;
      }
      
      .comments-modal {
        width: 95%;
        height: 80vh;
      }
    }

    /* Add these styles to the existing @media (max-width: 640px) section */

@media (max-width: 640px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-container {
    max-width: 100%;
  }
  
  .comments-modal {
    width: 95%;
    height: 80vh;
  }
  
  /* NEW MOBILE FIXES - Add these to your existing media query */
  
  .idea-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }
  
  .idea-time {
    align-self: flex-end;
    margin-top: -1.5rem;
  }
  
  .idea-footer {
    flex-direction: column;
    gap: var(--space-2);
    align-items: stretch;
  }
  
  .vote-actions {
    justify-content: flex-start;
    order: 2;
  }
  
  .idea-actions {
    order: 1;
    margin-left: 0;
    justify-content: flex-start;
  }
  
  .idea-author {
    order: 3;
    text-align: left;
    padding-top: var(--space-1);
    border-top: 1px solid var(--neutral-100);
  }
  
  .vote-btn,
  .comment-btn {
    padding: 8px 12px;
    font-size: 0.875rem;
  }
  
  .vote-btn svg,
  .comment-btn svg {
    width: 16px;
    height: 16px;
  }
  
  .idea-card {
    padding: var(--space-2);
    margin-bottom: var(--space-2);
  }
  
  .idea-title {
    font-size: 1rem;
    line-height: 1.4;
  }
  
  .idea-content {
    font-size: 0.875rem;
    margin-bottom: var(--space-2);
  }
  
  /* Mobile styles for details modal */
  .details-modal {
    width: 95%;
    height: 90vh;
  }
  
  .details-body {
    max-height: 75vh;
  }
  
  .engagement-stats {
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .details-button {
    min-width: 80px;
    font-size: 0.7rem;
    padding: 6px 10px;
  }
  
  /* Dark mode mobile fixes */
  :host-context([data-theme="dark"]) .idea-author {
    border-top-color: var(--border-color);
  }
}

  `]
})
export class IdeaFeedComponent implements OnInit, OnDestroy {
  filteredIdeas: IdeaPost[] = [];
  ideas: IdeaPost[] = [];
  categories: string[] = ['All', 'Welfare', 'Customer', 'Technology', 'HR', 'Security', 'Other'];
  selectedCategory: string = 'All';
  searchQuery: string = '';
  private subscription: Subscription = new Subscription();
  
  // New properties for comments functionality
  selectedIdea: IdeaPost | null = null;
  newComment: string = '';
  
  // Add these properties for details modal
  selectedIdeaForDetails: IdeaPost | null = null;
  
  // Add these properties
  isAdmin: boolean = false;
  currentUser: any;
  private userSub!: Subscription;
  
  constructor(
    private ideaService: IdeaService,
    private themeUtils: ThemeUtilsService,
    private authService: AuthService,
    private userDisplayService: UserDisplayService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin';
      if (!user) {
        this.router.navigate(['/login']);
      }
      console.log('Current user:', this.currentUser, 'isAdmin:', this.isAdmin);
    });
    console.log('IdeaFeedComponent ngOnInit started');
    
    this.loadIdeas();
    this.ideaService.refresh$.subscribe(() => this.loadIdeas());
    
    // Apply dark mode styling
    this.themeUtils.applyDarkModeStyles('.idea-card');
    
    // Listen for theme changes
    this.themeUtils.setupThemeChangeListener('.idea-card');
    console.log('IdeaFeedComponent ngOnInit completed');
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.userSub?.unsubscribe();
  }
  
  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
  }
  
  searchIdeas(): void {
    this.applyFilters();
  }
  
  applyFilters(): void {
    this.filteredIdeas = this.ideas.filter(idea => {
      // Apply category filter
      if (this.selectedCategory !== 'All') {
        // Check if the idea has the selected category as a tag
        const ideaTags = idea.tags || [];
        const hasCategoryTag = ideaTags.some(tag => 
          tag.toLowerCase().includes(this.selectedCategory.toLowerCase()) ||
          this.selectedCategory.toLowerCase().includes(tag.toLowerCase())
        );
        
        // Also check if the idea has a category field that matches
        const ideaCategory = idea.category || '';
        const categoryMatches = ideaCategory.toLowerCase().includes(this.selectedCategory.toLowerCase()) ||
                               this.selectedCategory.toLowerCase().includes(ideaCategory.toLowerCase());
        
        if (!hasCategoryTag && !categoryMatches) return false;
      }
      
      // Apply search filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim();
        const ideaTags = idea.tags || [];
        
        // Search in title
        const titleMatches = idea.title.toLowerCase().includes(query);
        
        // Search in description
        const descriptionMatches = idea.description.toLowerCase().includes(query);
        
        // Search in hashtags/tags (with or without # symbol)
        const tagMatches = ideaTags.some(tag => {
          const tagLower = tag.toLowerCase();
          const queryWithoutHash = query.startsWith('#') ? query.substring(1) : query;
          const tagWithoutHash = tagLower.startsWith('#') ? tagLower.substring(1) : tagLower;
          
          return tagLower.includes(query) || 
                 tagWithoutHash.includes(queryWithoutHash) ||
                 queryWithoutHash.includes(tagWithoutHash);
        });
        
        // Search in category
        const categoryMatches = (idea.category || '').toLowerCase().includes(query);
        
        // Return true if any field matches
        return titleMatches || descriptionMatches || tagMatches || categoryMatches;
      }
      
      return true;
    });
  }
  
  vote(idea: IdeaPost, voteType: 'up' | 'down'): void {
    // Store previous values for potential rollback
    const previousVote = idea.userVote;
    const previousUpvotes = idea.upvotes || 0;
    const previousDownvotes = idea.downvotes || 0;
    
    console.log(`Voting ${voteType} on idea ${idea.id}. Previous vote: ${previousVote}`);
    
    // Optimistic UI update for immediate feedback
    if (idea.userVote === voteType) {
      // If clicking the same vote type, remove the vote (toggle off)
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
        // If user was previously downvoting, remove that downvote
        if (previousVote === 'down') {
          idea.downvotes = Math.max(0, previousDownvotes - 1);
        }
      } else {
        idea.downvotes = previousDownvotes + 1;
        // If user was previously upvoting, remove that upvote
        if (previousVote === 'up') {
          idea.upvotes = Math.max(0, previousUpvotes - 1);
        }
      }
      idea.userVote = voteType;
    }

    console.log(`Optimistic update - upvotes: ${idea.upvotes}, downvotes: ${idea.downvotes}, userVote: ${idea.userVote}`);

    // Call the backend to persist the vote
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
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  viewComments(idea: IdeaPost): void {
    this.selectedIdea = idea;
    this.newComment = '';
    
    // Load comments from the API
    this.ideaService.getComments(idea.id).subscribe({
      next: (comments: any) => {
        console.log('Comments loaded:', comments);
        if (this.selectedIdea) {
          this.selectedIdea.comments = Array.isArray(comments) ? comments : [];
          this.selectedIdea.commentCount = this.selectedIdea.comments.length;
        }
      },
      error: (err) => {
        console.error('Failed to load comments', err);
        if (this.selectedIdea) {
          this.selectedIdea.comments = [];
          this.selectedIdea.commentCount = 0;
        }
      }
    });
  }
  
  closeCommentsModal(): void {
    this.selectedIdea = null;
    this.newComment = '';
  }
  
  viewIdeaDetails(idea: IdeaPost): void {
    this.selectedIdeaForDetails = idea;
  }
  
  closeDetailsModal(): void {
    this.selectedIdeaForDetails = null;
  }
  
  addComment(): void {
    if (!this.selectedIdea || !this.newComment.trim()) return;
    
    const commentText = this.newComment.trim();
    this.newComment = ''; // Clear input immediately for better UX
    
    this.ideaService.addComment(this.selectedIdea.id, commentText).subscribe({
      next: (newComment) => {
        console.log('Comment added successfully:', newComment);
        // Reload comments from API to get updated count and ensure consistency
        this.ideaService.getComments(this.selectedIdea!.id).subscribe((comments: any) => {
          if (this.selectedIdea) {
            this.selectedIdea.comments = Array.isArray(comments) ? comments : [];
            this.selectedIdea.commentCount = this.selectedIdea.comments.length;
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
  
  generateRandomHash(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  handleEnterKey(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault(); // Prevent default behavior (new line)
      this.addComment();
    }
  }

  getAnonymousDisplayName(authorHash: string): string {
    if (!authorHash) {
      return this.isAdmin ? 'Employee EMP1000' : 'Anonymous User 1000';
    }
    return this.userDisplayService.getDisplayName(authorHash, this.isAdmin);
  }

  getRandomNumber(max: number): number {
    return Math.floor(Math.random() * max);
  }

  loadIdeas() {
    // For idea-feed:
    this.ideaService.getIdeas().subscribe((ideas: any) => {
      // Ensure ideas is always an array
      if (!Array.isArray(ideas)) {
        ideas = [];
      }
      
      // Map API response to frontend format with proper vote and comment counts
      this.ideas = ideas.map((idea: any) => ({
        ...idea,
        tags: idea.hashtags || idea.tags || [],
        upvotes: idea.upVotes || idea.upvotes || 0,
        downvotes: idea.downVotes || idea.downvotes || 0,
        commentCount: idea.commentCount || 0,
        userVote: idea.userVote || null
      }));
      
      this.filteredIdeas = this.ideas;
      this.applyFilters();
    });

    // For my-ideas:
    this.authService.currentUser$.subscribe(user => {
      if (user && user.id) {
        this.ideaService.getUserIdeas(user.id).subscribe((userIdeas: any = []) => {
          // Ensure this.ideas is an array
          if (!Array.isArray(this.ideas)) {
            this.ideas = [];
          }
          // Ensure userIdeas is an array
          if (!Array.isArray(userIdeas)) {
            userIdeas = [];
          }
          
          // Map hashtags to tags for user ideas as well
          const mappedUserIdeas = userIdeas.map((idea: any) => ({
            ...idea,
            tags: idea.hashtags || idea.tags || [],
            upvotes: idea.upVotes || idea.upvotes || 0,
            downvotes: idea.downVotes || idea.downvotes || 0,
            commentCount: idea.commentCount || 0,
            userVote: idea.userVote || null
          }));
          
          this.ideas = [...this.ideas, ...mappedUserIdeas];
          this.filteredIdeas = [...this.ideas];
          this.applyFilters();
        });
      }
    });

    // For dashboard recent ideas:
    this.ideaService.getIdeas().subscribe(recentIdeas => {
      // Handle recent ideas logic
    });
  }
}























