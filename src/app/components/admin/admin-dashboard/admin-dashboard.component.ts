import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { IdeaService, IdeaPost } from '../../../services/idea.service';
import { ThemeUtilsService } from '../../../services/theme-utils.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// Backend API interfaces
interface BackendIdea {
  id: number;
  title: string;
  description: string;
  category: string;
  impactLevel: string;
  hashtags: string[];
  attachmentUrls: string[];
  requiredResources: string;
  anonymousId: string;
  status: 'pending' | 'approved' | 'implemented' | 'rejected';
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  upVotes: number;
  downVotes: number;
  user: {
    id: string;
    name: string;
    employeeId: string;
    email: string;
    role: 'admin' | 'employee';
    gender: 'male' | 'female' | 'other';
  };
}

interface BackendComment {
  id: number;
  text: string;
  ideaId: number;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    employeeId: string;
    email: string;
    role: 'admin' | 'employee';
    gender: 'male' | 'female' | 'other';
  };
}

interface BackendActivity {
  id: number;
  type: 'idea_submitted' | 'idea_voted' | 'idea_commented' | 'idea_approved' | 'idea_rejected' | 'idea_implemented';
  userId: string;
  ideaId: number;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    employeeId: string;
    email: string;
    role: 'admin' | 'employee';
    gender: 'male' | 'female' | 'other';
  };
  idea: BackendIdea;
}

interface AdminCounts {
  ideas: number;
  votes: number;
  comments: number;
  users: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser = this.authService.getCurrentUser();
  totalUsers = 0;
  totalIdeas = 0;
  totalVotes = 0;
  totalComments = 0;
  topIdeas: BackendIdea[] = [];
  recentActivities: BackendActivity[] = [];
  selectedIdea: BackendIdea | null = null;
  selectedIdeaForComments: BackendIdea | null = null;
  filteredIdeas: BackendIdea[] = [];
  searchQuery: string = '';
  filterStatus: string = 'all';
  ideaComments: BackendComment[] = [];
  newComment: string = '';
  private subscription = new Subscription();
  loading = false;
  error: string | null = null;
  
  constructor(
    private authService: AuthService,
    private ideaService: IdeaService,
    private themeUtils: ThemeUtilsService,
    private http: HttpClient
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      window.location.href = '/login'; // Always redirect to login if not authenticated
      return;
    }
    this.loading = true;
    this.loadAdminData();
    
    // Subscribe to idea refresh
    this.subscription.add(this.ideaService.refresh$.subscribe(() => this.loadAdminData()));
    
    // Apply dark mode styling to admin dashboard components
    this.themeUtils.applyDarkModeStyles('.admin-section, .stat-card, .top-idea-card, .activity-item, .modal-container');
    
    // Listen for theme changes
    this.themeUtils.setupThemeChangeListener('.admin-section, .stat-card, .top-idea-card, .activity-item, .modal-container');
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  loadAdminData(): void {
    this.loading = true;
    this.error = null;
    
    // Load admin counts
    this.subscription.add(
      this.http.get<AdminCounts>(`${environment.apiUrl}/admin/counts`).subscribe({
        next: (counts) => {
          this.totalIdeas = counts.ideas;
          this.totalVotes = counts.votes;
          this.totalComments = counts.comments;
          this.totalUsers = counts.users;
        },
        error: (err) => {
          console.error('Error loading admin counts:', err);
          this.error = 'Failed to load dashboard statistics';
        }
      })
    );
    
    // Load all ideas for admin
    this.subscription.add(
      this.http.get<{data: BackendIdea[], count: number}>(`${environment.apiUrl}/admin/ideas`).subscribe({
        next: (response) => {
          this.filteredIdeas = response.data;
          this.topIdeas = [...response.data]
            .sort((a, b) => (b.upVotes + b.downVotes) - (a.upVotes + a.downVotes))
            .slice(0, 5);
          this.applyFilters();
        },
        error: (err) => {
          console.error('Error loading admin ideas:', err);
          this.error = 'Failed to load ideas';
        }
      })
    );
    
    // Load recent activities
    this.subscription.add(
      this.http.get<BackendActivity[]>(`${environment.apiUrl}/admin/activity?limit=10`).subscribe({
        next: (activities) => {
          this.recentActivities = activities;
        },
        error: (err) => {
          console.error('Error loading recent activities:', err);
          this.error = 'Failed to load recent activities';
        }
      })
    );
    
    this.loading = false;
  }
  
  loadCommentsForIdea(ideaId: number): void {
    this.subscription.add(
      this.http.get<BackendComment[]>(`${environment.apiUrl}/comment/${ideaId}`).subscribe({
        next: (comments) => {
          this.ideaComments = comments;
        },
        error: (err) => {
          console.error('Error loading comments:', err);
          this.ideaComments = [];
        }
      })
    );
  }
  
  getUserName(user: any): string {
    if (user && user.employeeId) {
      return `${user.name} (${user.employeeId})`;
    }
    return user?.name || 'Unknown User';
  }
  
  getUserId(user: any): string {
    return user?.employeeId || user?.id || '';
  }
  
  getUpvotePercentage(idea: BackendIdea): number {
    const total = idea.upVotes + idea.downVotes;
    return total > 0 ? (idea.upVotes / total) * 100 : 0;
  }
  
  getDownvotePercentage(idea: BackendIdea): number {
    const total = idea.upVotes + idea.downVotes;
    return total > 0 ? (idea.downVotes / total) * 100 : 0;
  }
  
  getCommentCount(ideaId: number): number {
    return this.ideaComments.filter(comment => comment.ideaId === ideaId).length;
  }
  
  getIdeaComments(ideaId: number): BackendComment[] {
    return this.ideaComments.filter(comment => comment.ideaId === ideaId);
  }
  
  viewIdeaDetails(idea: BackendIdea): void {
    this.selectedIdea = idea;
  }
  
  closeModal(): void {
    this.selectedIdea = null;
  }
  
  viewComments(idea: BackendIdea): void {
    this.selectedIdeaForComments = idea;
    this.loadCommentsForIdea(idea.id);
    // Close the idea details modal if it's open
    if (this.selectedIdea) {
      this.selectedIdea = null;
    }
  }
  
  closeCommentsModal(): void {
    this.selectedIdeaForComments = null;
    this.newComment = '';
  }
  
  addComment(): void {
    if (!this.newComment.trim() || !this.selectedIdeaForComments) return;
    
    const commentData = {
      text: this.newComment
    };
    
    this.subscription.add(
      this.http.post<BackendComment>(`${environment.apiUrl}/comment/${this.selectedIdeaForComments.id}`, commentData).subscribe({
        next: (newComment) => {
          this.ideaComments.unshift(newComment);
          this.totalComments++;
          this.newComment = '';
          
          // Refresh the idea to update comment count
          this.refreshIdea(this.selectedIdeaForComments!.id);
        },
        error: (err) => {
          console.error('Error adding comment:', err);
          this.error = 'Failed to add comment';
        }
      })
    );
  }
  
  applyFilters(): void {
    if (!this.filteredIdeas) return;
    
    let filtered = [...this.filteredIdeas];
    
    // Filter by status
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(idea => idea.status === this.filterStatus);
    }
    
    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(idea => 
        idea.title.toLowerCase().includes(query) ||
        idea.description.toLowerCase().includes(query) ||
        idea.category.toLowerCase().includes(query)
      );
    }
    
    this.filteredIdeas = filtered;
  }
  
  vote(idea: BackendIdea, voteType: 'up' | 'down'): void {
    const voteData = {
      isUpvote: voteType === 'up'
    };
    
    this.subscription.add(
      this.http.post<any>(`${environment.apiUrl}/vote/${idea.id}`, voteData).subscribe({
        next: (response) => {
          // Refresh the idea to get updated vote counts
          this.refreshIdea(idea.id);
        },
        error: (err) => {
          console.error('Error voting:', err);
          this.error = 'Failed to submit vote';
        }
      })
    );
  }
  
  approveIdea(idea: BackendIdea): void {
    this.subscription.add(
      this.http.patch<BackendIdea>(`${environment.apiUrl}/idea/${idea.id}/approve`, {}).subscribe({
        next: (updatedIdea) => {
          this.updateIdeaInLists(updatedIdea);
          this.loadAdminData(); // Refresh all data
        },
        error: (err) => {
          console.error('Error approving idea:', err);
          this.error = 'Failed to approve idea';
        }
      })
    );
  }
  
  rejectIdea(idea: BackendIdea): void {
    this.subscription.add(
      this.http.patch<BackendIdea>(`${environment.apiUrl}/idea/${idea.id}/reject`, {}).subscribe({
        next: (updatedIdea) => {
          this.updateIdeaInLists(updatedIdea);
          this.loadAdminData(); // Refresh all data
        },
        error: (err) => {
          console.error('Error rejecting idea:', err);
          this.error = 'Failed to reject idea';
        }
      })
    );
  }
  
  implementIdea(idea: BackendIdea): void {
    this.subscription.add(
      this.http.patch<BackendIdea>(`${environment.apiUrl}/idea/${idea.id}/implemented`, {}).subscribe({
        next: (updatedIdea) => {
          this.updateIdeaInLists(updatedIdea);
          this.loadAdminData(); // Refresh all data
        },
        error: (err) => {
          console.error('Error implementing idea:', err);
          this.error = 'Failed to mark idea as implemented';
        }
      })
    );
  }
  
  private updateIdeaInLists(updatedIdea: BackendIdea): void {
    // Update in filtered ideas
    const filteredIndex = this.filteredIdeas.findIndex(idea => idea.id === updatedIdea.id);
    if (filteredIndex !== -1) {
      this.filteredIdeas[filteredIndex] = updatedIdea;
    }
    
    // Update in top ideas
    const topIndex = this.topIdeas.findIndex(idea => idea.id === updatedIdea.id);
    if (topIndex !== -1) {
      this.topIdeas[topIndex] = updatedIdea;
    }
    
    // Update selected idea if it's the same
    if (this.selectedIdea && this.selectedIdea.id === updatedIdea.id) {
      this.selectedIdea = updatedIdea;
    }
    
    if (this.selectedIdeaForComments && this.selectedIdeaForComments.id === updatedIdea.id) {
      this.selectedIdeaForComments = updatedIdea;
    }
  }
  
  private refreshIdea(ideaId: number): void {
    this.subscription.add(
      this.http.get<BackendIdea>(`${environment.apiUrl}/idea/${ideaId}`).subscribe({
        next: (idea) => {
          this.updateIdeaInLists(idea);
        },
        error: (err) => {
          console.error('Error refreshing idea:', err);
        }
      })
    );
  }
  
  // Add this helper method to format file sizes
  formatFileSize(bytes: number | undefined): string {
    if (bytes === undefined) return '0 bytes';
    
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // Add this method to the component class
  getIdeaCategory(idea: BackendIdea): string {
    return idea.category || 'Not specified';
  }

  // Format activity text for display
  getActivityText(activity: BackendActivity): string {
    const userName = activity.user?.name || 'Unknown User';
    const ideaTitle = activity.idea?.title || 'Unknown Idea';
    
    switch (activity.type) {
      case 'idea_submitted':
        return `${userName} submitted idea: "${ideaTitle}"`;
      case 'idea_voted':
        return `${userName} voted on "${ideaTitle}"`;
      case 'idea_commented':
        return `${userName} commented on "${ideaTitle}"`;
      case 'idea_approved':
        return `Admin approved idea: "${ideaTitle}"`;
      case 'idea_rejected':
        return `Admin rejected idea: "${ideaTitle}"`;
      case 'idea_implemented':
        return `Admin marked idea as implemented: "${ideaTitle}"`;
      default:
        return `${userName} performed an action on "${ideaTitle}"`;
    }
  }

  // Format activity time
  getActivityTime(activity: BackendActivity): string {
    const date = new Date(activity.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  }

  // Get attachment name from URL
  getAttachmentName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Unknown file';
  }

  // Download attachment
  downloadAttachment(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
} 