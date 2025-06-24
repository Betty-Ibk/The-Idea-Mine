import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ThemeUtilsService } from '../../../services/theme-utils.service';
import { UserDisplayService } from '../../../services/user-display.service';
import { IdeaService } from '../../../services/idea.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-my-ideas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-my-ideas.component.html',
  styleUrls: ['./admin-my-ideas.component.css']
})
export class AdminMyIdeasComponent implements OnInit, OnDestroy {
  myIdeas: any[] = [
    {
      id: 301,
      title: "Automated Compliance Reporting",
      description: "Create an automated system for generating compliance reports to reduce manual work and ensure accuracy.",
      status: "implemented",
      upvotes: 42,
      downvotes: 3,
      timestamp: "2 weeks ago",
      authorId: "ADMIN001",
      authorName: "Admin",
      userVote: null,
      commentsList: [
        { text: "This will save us hours of work each month!", authorId: "EMP1002", authorName: "Jane Smith", timestamp: "2 months ago" },
        { text: "Can we prioritize this for Q2?", authorId: "EMP1003", authorName: "John Doe", timestamp: "2 months ago" },
        { text: "Implementation is complete, great work team!", authorId: "ADMIN001", authorName: "Admin", timestamp: "1 month ago" }
      ]
    },
    {
      id: 302,
      title: "Employee Recognition Program",
      description: "Implement a peer-to-peer recognition system where employees can acknowledge colleagues' contributions.",
      status: "approved",
      upvotes: 38,
      downvotes: 0,
      timestamp: "3 weeks ago",
      authorId: "ADMIN001",
      authorName: "Admin",
      userVote: null,
      commentsList: [
        { text: "This will boost morale significantly.", authorId: "EMP1005", authorName: "HR Director", timestamp: "6 weeks ago" },
        { text: "We should include rewards for top recognized employees.", authorId: "EMP1006", authorName: "Team Lead", timestamp: "1 month ago" }
      ]
    },
    {
      id: 303,
      title: "Cross-Department Collaboration Spaces",
      description: "Create dedicated physical and virtual spaces for cross-functional teams to collaborate on projects.",
      status: "pending",
      upvotes: 29,
      downvotes: 2,
      timestamp: "2 month ago",
      authorId: "ADMIN001",
      authorName: "Admin",
      userVote: null,
      commentsList: [
        { text: "This could help break down silos between departments.", authorId: "EMP1007", authorName: "Project Manager", timestamp: "3 weeks ago" },
        { text: "We should pilot this with a few departments first.", authorId: "EMP1008", authorName: "Operations", timestamp: "2 weeks ago" }
      ]
    },
    {
      id: 304,
      title: "Leadership Development Program",
      description: "Establish a structured program to identify and develop future leaders within the organization.",
      status: "pending",
      upvotes: 25,
      downvotes: 1,
      timestamp: "2 month ago",
      authorId: "ADMIN001",
      authorName: "Admin",
      userVote: null,
      commentsList: [
        { text: "This is critical for our succession planning.", authorId: "EMP1009", authorName: "Executive", timestamp: "2 weeks ago" },
        { text: "We should include mentorship as a key component.", authorId: "EMP1010", authorName: "Training", timestamp: "1 week ago" }
      ]
    },
    // {
    //   id: 305,
    //   title: "Data-Driven Decision Making Framework",
    //   description: "Implement a standardized approach to using data analytics for all major business decisions.",
    //   status: "pending",
    //   upvotes: 22,
    //   downvotes: 3,
    //   timestamp: "2 weeks ago",
    //   authorId: "ADMIN001",
    //   authorName: "Admin",
    //   userVote: null,
    //   commentsList: [
    //     { text: "This will help us make more objective decisions.", authorId: "EMP1011", authorName: "Analytics", timestamp: "10 days ago" },
    //     { text: "We need to ensure we have the right data infrastructure first.", authorId: "EMP1012", authorName: "IT", timestamp: "1 week ago" }
    //   ]
    // }
  ];
  selectedIdea: any = null;
  newComment: string = '';
  currentPage: number = 0;
  totalPages: number = 0;
  itemsPerPage: number = 5;
  currentUser: any = null;
  private subscription = new Subscription();
  
  constructor(
    public authService: AuthService,
    public themeUtils: ThemeUtilsService,
    private userDisplayService: UserDisplayService,
    private ideaService: IdeaService
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.myIdeas = [];
      this.selectedIdea = null;
      window.location.href = '/login'; // Always redirect to login if not authenticated
      return;
    }
    // Use the hardcoded dummy data
    console.log('Using hardcoded admin ideas:', this.myIdeas);
    // Apply dark mode styling immediately without setTimeout
    this.themeUtils.applyDarkModeStyles('.idea-card, .comments-modal, .comment-item');
    this.themeUtils.setupThemeChangeListener('.idea-card, .comments-modal, .comment-item');
    // Subscribe to newly submitted ideas
    this.listenForNewIdeas();
    // Subscribe to idea refresh
    this.subscription.add(this.ideaService.refresh$.subscribe(() => this.listenForNewIdeas()));
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  getDisplayName(authorId: string): string {
    return this.userDisplayService.getDisplayName(authorId, true);
  }
  
  viewComments(idea: any): void {
    this.selectedIdea = idea;
    this.currentPage = 0;
    this.calculateTotalPages();
    
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
  }
  
  calculateTotalPages(): void {
    if (!this.selectedIdea) {
      this.totalPages = 0;
      return;
    }
    
    this.totalPages = Math.ceil(this.selectedIdea.commentsList.length / this.itemsPerPage);
  }
  
  getVisibleComments(): any[] {
    if (!this.selectedIdea || !this.selectedIdea.commentsList) {
      return [];
    }
    
    const start = this.currentPage * this.itemsPerPage;
    const end = start + this.itemsPerPage;
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
  
  vote(idea: any, voteType: 'up' | 'down'): void {
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
            authorId: this.currentUser.id || 'EMP1000',
            authorName: this.currentUser.name || 'Admin',
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
  
  // Listen for newly submitted ideas
  listenForNewIdeas(): void {
    const currentUserId = this.currentUser?.id || '';
    this.subscription.add(
      this.ideaService.getIdeas().subscribe((ideas: any) => {
        // Ensure ideas is always an array
        const ideasArray = Array.isArray(ideas) ? ideas : (ideas && ideas.data ? ideas.data : []);
        const newIdeas = ideasArray.filter((idea: any) => 
          (idea.tags && idea.tags.includes('My Idea')) &&
          !this.myIdeas.some((existingIdea: any) => existingIdea.id === idea.id)
        );
        if (newIdeas.length > 0) {
          const convertedNewIdeas = newIdeas.map((idea: any) => ({
            id: idea.id,
            title: idea.title,
            description: idea.content,
            status: idea.status || 'pending',
            upvotes: idea.upvotes,
            downvotes: idea.downvotes,
            timestamp: idea.timestamp,
            authorId: idea.authorHash,
            authorName: 'Admin',
            userVote: idea.userVote,
            commentsList: idea.comments ? idea.comments.map((comment: any) => ({
              text: comment.text,
              authorId: comment.authorHash,
              authorName: comment.author || 'User',
              timestamp: comment.timestamp
            })) : []
          }));
          // this.myIdeas = [...convertedNewIdeas, ...this.myIdeas];
          console.log('Added newly submitted admin ideas:', convertedNewIdeas);
        }
      })
    );
  }
}
