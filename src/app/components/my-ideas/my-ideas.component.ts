import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeUtilsService } from '../../services/theme-utils.service';
import { AuthService } from '../../services/auth.service';
import { IdeaService, IdeaPost } from '../../services/idea.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

interface Comment {
  text: string;
  authorId: string;
  authorName: string;
  timestamp: string;
}

interface Idea {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'implemented' | 'rejected';
  upvotes: number;
  downvotes: number;
  timestamp: string;
  userVote: 'up' | 'down' | null;
  authorId: string;
  authorName: string;
  tags: string[];
  commentsList: Comment[];
}

@Component({
  selector: 'app-my-ideas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="main-content">
      <div class="container">
        <h2 class="page-title" style="color: #FF7A00">My Ideas</h2>
        <div class="ideas-list">
          @for (idea of myIdeas; track idea.id) {
            <div class="idea-card">
              <div class="idea-content">
                <div class="idea-header">
                  <h3 class="idea-title">{{idea.title}}</h3>
                  <span class="idea-status" [class]="idea.status">{{idea.status}}</span>
                </div>
                
                @if (idea.tags && idea.tags.length > 0) {
                  <div class="idea-tags">
                    @for (tag of idea.tags; track tag) {
                        <span class="idea-tag">#{{ tag }}</span>
                    }
                  </div>
                }
                
                <p class="idea-description">{{idea.description}}</p>
                <div class="idea-meta">
                  <span class="timestamp">{{idea.timestamp}} by {{getDisplayName(idea.authorId, idea.authorName)}}</span>
                </div>
              </div>
              <div class="idea-actions">
                <div class="vote-actions">
                  <button 
                    class="vote-btn upvote" 
                    [class.voted]="idea.userVote === 'up'"
                    (click)="vote(idea, 'up')"
                  >
                    👍 {{idea.upvotes}}
                  </button>
                  <button 
                    class="vote-btn downvote" 
                    [class.voted]="idea.userVote === 'down'"
                    (click)="vote(idea, 'down')"
                  >
                    👎 {{idea.downvotes}}
                  </button>
                </div>
                <button class="btn btn-outline" (click)="viewComments(idea)">Comments</button>
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
            } @else {
              @for (comment of getVisibleComments(); track comment.timestamp) {
                <div class="comment-item">
                  <div class="comment-header">
                    <span class="comment-author">{{getDisplayName(comment.authorId, comment.authorName)}}</span>
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
    }
    
    .idea-content {
      flex: 1;
    }
    
    .idea-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-2);
    }
    
    .idea-title {
      font-size: 1.125rem;
      margin: 0;
    }
    
    .idea-status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    
    .idea-status.pending {
      background-color: var(--neutral-100);
      color: var(--neutral-600);
    }
    
    .idea-status.approved {
      background-color: #dcfce7;
      color: #15803d;
    }
    
    .idea-status.implemented {
      background-color: var(--primary-100);
      color: var(--primary-700);
    }
    
    .idea-description {
      color: var(--neutral-600);
      font-size: 0.875rem;
      margin-bottom: var(--space-2);
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
    
    .idea-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--neutral-500);
    }
    
    .idea-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 120px;
    }
    
    .btn {
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-primary {
      background-color: var(--primary-500);
      color: white;
      border: none;
    }
    
    .btn-primary:hover {
      background-color: var(--primary-600);
    }
    
    .btn-outline {
      background-color: white;
      color: var(--neutral-700);
      border: 1px solid var(--neutral-300);
    }
    
    .btn-outline:hover {
      background-color: var(--neutral-50);
    }
    
    .vote-actions {
      display: flex;
      gap: var(--space-1);
    }
    
    .vote-btn {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--neutral-200);
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--neutral-700);
    }
    
    .vote-btn:hover {
      background-color: var(--neutral-50);
      color: var(--neutral-800);
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

    @media (max-width: 640px) {
      .idea-card {
        flex-direction: column;
      }

      .idea-actions {
        flex-direction: row;
        min-width: auto;
      }

      .vote-actions {
        flex: 1;
      }
    }

    .pagination-controls {
      display: flex;
      justify-content: center;
      margin-top: var(--space-3);
    }
    
    .pagination-controls .btn {
      margin: 0 var(--space-2);
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
    
    /* Status badges in dark mode - deeper colors with white text */
    :host-context([data-theme="dark"]) .idea-status.pending {
      background-color: #4B5563; /* Deeper neutral */
      color: white;
    }
    
    :host-context([data-theme="dark"]) .idea-status.approved {
      background-color: #15803D; /* Deeper green */
      color: white;
    }
    
    :host-context([data-theme="dark"]) .idea-status.implemented {
      background-color: var(--primary-700); /* Deeper orange */
      color: white;
    }
    
    /* Button styling in dark mode */
    :host-context([data-theme="dark"]) .btn-primary {
      background-color: var(--primary-500);
      color: white;
      border: none;
    }
    
    :host-context([data-theme="dark"]) .btn-primary:hover {
      background-color: var(--primary-600);
    }
    
    :host-context([data-theme="dark"]) .btn-outline {
      background-color: #3a3a3a;
      color: white;
      border: 1px solid #4a4a4a;
    }
    
    :host-context([data-theme="dark"]) .btn-outline:hover {
      background-color: #4a4a4a;
    }
    
    /* Vote buttons in dark mode */
    :host-context([data-theme="dark"]) .vote-btn {
      background-color: #3a3a3a;
      color: white;
      border: 1px solid #4a4a4a;
    }
    
    :host-context([data-theme="dark"]) .vote-btn:hover {
      background-color: #4a4a4a;
    }
    
    /* Upvote button - light orange */
    :host-context([data-theme="dark"]) .vote-btn.upvote {
      background-color: #FF9E44;
      color: #1a1a1a;
      border-color: #FF8A20;
    }
    
    :host-context([data-theme="dark"]) .vote-btn.upvote:hover {
      background-color: #FF8A20;
    }
    
    /* Downvote button - light grey */
    :host-context([data-theme="dark"]) .vote-btn.downvote {
      background-color: #4a4a4a;
      color: white;
      border-color: #5a5a5a;
    }
    
    :host-context([data-theme="dark"]) .vote-btn.downvote:hover {
      background-color: #5a5a5a;
    }
    
    /* Voted state styling */
    :host-context([data-theme="dark"]) .vote-btn.voted.upvote {
      background-color: #FF7A00;
      color: white;
      border-color: #E66D00;
    }
    
    :host-context([data-theme="dark"]) .vote-btn.voted.downvote {
      background-color: #3a3a3a;
      color: white;
      border-color: #4a4a4a;
    }
    
    /* Modal styling */
    :host-context([data-theme="dark"]) .comments-modal {
      background-color: var(--card-bg);
      color: var(--card-text);
    }
    
    :host-context([data-theme="dark"]) .modal-header {
      border-color: #3a3a3a;
    }
    
    :host-context([data-theme="dark"]) .comment-input {
      background-color: #3a3a3a;
      color: white;
      border-color: #4a4a4a;
    }
    
    :host-context([data-theme="dark"]) .comment-input:focus {
      border-color: var(--primary-500);
      box-shadow: 0 0 0 2px rgba(255, 122, 0, 0.2);
    }
    
    :host-context([data-theme="dark"]) .comment-item {
      border-color: #3a3a3a;
    }
  `]
})
export class MyIdeasComponent implements OnInit, OnDestroy {
  myIdeas: Idea[] = [];
  selectedIdea: Idea | null = null;
  commentsPerPage = 2; // Show 2 comments per page
  currentPage = 0;
  totalPages = 0;
  newComment: string = '';
  isAdmin: boolean = false;
  currentUser: any = null;
  private subscription = new Subscription();
  
  // Add this property to store generated anonymous IDs
  private anonymousIdMap: Map<string, number> = new Map();
  
  constructor(
    private authService: AuthService,
    private themeUtils: ThemeUtilsService,
    private ideaService: IdeaService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Subscribe to current user changes first
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.isAdmin = user?.role === 'admin';
        if (user) {
          this.loadIdeas();
        } else {
          this.myIdeas = [];
          this.router.navigate(['/login']); // Always redirect to login if not authenticated
        }
      })
    );

    // Subscribe to refresh events
    this.subscription.add(
      this.ideaService.refresh$.subscribe(() => {
        console.log('Refresh event received in my-ideas component');
        if (this.currentUser) {
          this.loadIdeas();
        }
      })
    );

    // Subscribe to local service state changes
    this.subscription.add(
      this.ideaService.ideas$.subscribe(ideas => {
        if (this.currentUser && ideas.length > 0) {
          console.log('Local service ideas updated:', ideas);
          this.loadIdeas();
        }
      })
    );
    
    // Apply dark mode styling
    this.themeUtils.applyDarkModeStyles('.idea-card');
    
    // Listen for theme changes
    this.themeUtils.setupThemeChangeListener('.idea-card');
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  loadIdeas(): void {
    if (!this.currentUser) {
      console.log('No current user, clearing ideas');
      this.myIdeas = [];
      return;
    }

    console.log('Loading ideas for user:', this.currentUser);
    
    // Get the employeeId from the current user
    const employeeId = this.currentUser.employeeId || this.currentUser.id;
    
    if (!employeeId) {
      console.log('No employeeId found for current user');
      this.myIdeas = [];
      return;
    }
    
    console.log('Using employeeId for API call:', employeeId);
    
    // Use the API endpoint with employeeId parameter
    this.ideaService.getIdeas({ employeeId: employeeId }).subscribe({
      next: (ideas: any) => {
        console.log('Raw ideas response from API:', ideas);
        
        // Handle different response formats
        let ideasArray: any[] = [];
        if (Array.isArray(ideas)) {
          ideasArray = ideas;
        } else if (ideas && ideas.data) {
          ideasArray = ideas.data;
        } else if (ideas && Array.isArray(ideas.ideas)) {
          ideasArray = ideas.ideas;
        }
        
        console.log('Processed ideas array:', ideasArray);
        
        // If backend returns empty, check local service state as fallback
        if (ideasArray.length === 0) {
          console.log('Backend returned empty array, checking local service state...');
          const localIdeas = this.ideaService.getCurrentIdeas() || [];
          console.log('Local ideas from service:', localIdeas);
          
          // Filter local ideas by current user
          const userLocalIdeas = localIdeas.filter((idea: any) => {
            return idea.authorHash === employeeId || 
                   (idea.authorHash && idea.authorHash.startsWith(employeeId + '#')) ||
                   (idea.tags && idea.tags.includes('My Idea'));
          });
          
          console.log('User local ideas:', userLocalIdeas);
          ideasArray.push(...userLocalIdeas);
        }
        
        // Map the backend API response to our local interface
        this.myIdeas = ideasArray.map((idea: any) => ({
          id: idea.id,
          title: idea.title,
          description: idea.description || idea.content, // Handle both backend and local field names
          status: (idea.status as 'pending' | 'approved' | 'implemented' | 'rejected') || 'pending',
          upvotes: idea.upVotes || idea.upvotes || 0, // Backend uses 'upVotes'
          downvotes: idea.downVotes || idea.downvotes || 0, // Backend uses 'downVotes'
          timestamp: idea.createdAt || idea.timestamp || 'Just now',
          userVote: idea.userVote || null,
          authorId: idea.anonymousId || idea.authorHash || employeeId, // Use anonymousId from backend
          authorName: idea.user?.name || 'User',
          tags: idea.hashtags || idea.tags || [], // Map hashtags to tags for frontend compatibility
          commentsList: idea.comments ? idea.comments.map((comment: any) => ({
            text: comment.text,
            authorId: comment.userId || comment.authorHash || comment.user?.id,
            authorName: comment.user?.name || comment.author || 'Anonymous',
            timestamp: comment.createdAt || comment.timestamp
          })) : []
        }));
        
        console.log('Final myIdeas array:', this.myIdeas);
      },
      error: (error) => {
        console.error('Error loading ideas from API:', error);
        
        // On error, try to load from local service state as fallback
        const localIdeas = this.ideaService.getCurrentIdeas() || [];
        console.log('Loading from local service state due to API error:', localIdeas);
        
        const filteredLocalIdeas = localIdeas.filter((idea: any) => {
          return idea.authorHash === employeeId || 
                 (idea.authorHash && idea.authorHash.startsWith(employeeId + '#')) ||
                 (idea.tags && idea.tags.includes('My Idea'));
        });
        
        this.myIdeas = filteredLocalIdeas.map((idea: any) => ({
          id: idea.id,
          title: idea.title,
          description: idea.description || idea.content,
          status: idea.status || 'pending',
          upvotes: idea.upvotes || 0,
          downvotes: idea.downvotes || 0,
          timestamp: idea.timestamp || 'Just now',
          userVote: idea.userVote || null,
          authorId: idea.authorHash || employeeId,
          authorName: 'User',
          tags: idea.hashtags || idea.tags || [], // Map hashtags to tags for frontend compatibility
          commentsList: idea.comments || []
        }));
      }
    });
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
  
  vote(idea: Idea, voteType: 'up' | 'down'): void {
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
        console.log('Vote successful:', response);
        // Optionally update with backend response if it returns updated vote counts
        if (response && response.upvotes !== undefined) {
          idea.upvotes = response.upvotes;
          idea.downvotes = response.downvotes;
          idea.userVote = response.userVote;
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
  
  viewComments(idea: Idea): void {
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
            authorId: comment.userId || comment.authorHash || comment.user?.id,
            authorName: comment.user?.name || comment.author || 'Anonymous',
            timestamp: comment.createdAt || comment.timestamp
          })) : [];
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
  
  closeCommentsModal(): void {
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
        // Add the new comment to the list
        if (this.selectedIdea && this.selectedIdea.commentsList) {
          this.selectedIdea.commentsList.unshift({
            text: newComment.text,
            authorId: this.currentUser.id || 'EMP1001',
            authorName: this.currentUser.name || 'Anonymous',
            timestamp: 'Just now'
          });
          this.calculateTotalPages();
          this.currentPage = 0; // Go to first page to see the new comment
        }
      },
      error: (err) => {
        console.error('Add comment failed', err);
        // Restore the comment text if it failed
        this.newComment = commentText;
      }
    });
  }
}



















































