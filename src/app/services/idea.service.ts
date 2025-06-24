import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface IdeaPost {
  _originalTimestamp: string;
  _sortDate: Date;
  id: number;
  title: string;
  description: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  tags: string[];
  authorHash: string;
  status?: string;
  attachments?: {
    name: string;
    size: number;
    type: string;
  }[];
  comments?: Comment[];
  requiredResources?: string;
  impact?: string;
  category?: string; // Add category field
  commentCount?: number;
}

export interface Comment {
  text: string;
  author: string;
  authorHash: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class IdeaService {
  private apiUrl = environment.apiUrl;
  private ideasSubject = new BehaviorSubject<IdeaPost[]>([
   
  ]);

  ideas$ = this.ideasSubject.asObservable();

  private ideaRefresh$ = new BehaviorSubject<void>(undefined);

  constructor(private http: HttpClient) {}

  getIdeas(params?: { [key: string]: any }): Observable<any> {
    let url = `${this.apiUrl}/idea`;
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }
    return this.http.get<any>(url);
  }

  getUserIdeas(employeeId: string) {
    return this.http.get(`${this.apiUrl}/idea`, { params: { employeeId } });
  }

  submitIdea(formData: FormData) {
    return this.http.post(
      `${this.apiUrl}/idea`, 
      formData
    );
  }

  // For notifying components to refresh
  triggerRefresh() {
    this.ideaRefresh$.next();
  }

  get refresh$() {
    return this.ideaRefresh$.asObservable();
  }

  getCurrentIdeas(): IdeaPost[] {
    return this.ideasSubject.value;
  }

  addIdea(idea: IdeaPost) {
    // Ensure idea has all required properties
    const newIdea = {
      ...idea,
      timestamp: 'Just now',
      _originalTimestamp: 'Just now',
      _sortDate: new Date(), // Add current date for sorting and filtering
      upvotes: idea.upvotes || 0,
      downvotes: idea.downvotes || 0,
      userVote: idea.userVote || null,
      tags: idea.tags || []
    };
    
    // Log the idea being added
    console.log('Adding idea to service:', newIdea);
    
    const currentIdeas = this.ideasSubject.value;
    this.ideasSubject.next([newIdea, ...currentIdeas]);
    
    // Trigger refresh to notify other components
    this.triggerRefresh();
  }

  updateIdea(updatedIdea: IdeaPost) {
    const currentIdeas = this.ideasSubject.value;
    const index = currentIdeas.findIndex(idea => idea.id === updatedIdea.id);
    
    if (index !== -1) {
      const newIdeas = [...currentIdeas];
      newIdeas[index] = updatedIdea;
      this.ideasSubject.next(newIdeas);
    }
  }

  /**
   * Vote on an idea using the API endpoint.
   * @param ideaId The ID of the idea
   * @param isUpvote true for upvote, false for downvote
   */
  voteIdea(ideaId: number, isUpvote: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/vote/${ideaId}`, { isUpvote });
  }

  /**
   * Add a comment to an idea using the API endpoint.
   * @param ideaId The ID of the idea
   * @param text The comment text
   */
  addComment(ideaId: number, text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/comment/${ideaId}`, { text });
  }

  getIdeaById(id: number): IdeaPost | undefined {
    return this.ideasSubject.value.find(idea => idea.id === id);
  }

  deleteIdea(id: number): boolean {
    const currentIdeas = this.ideasSubject.value;
    const index = currentIdeas.findIndex(idea => idea.id === id);
    
    if (index !== -1) {
      const newIdeas = [...currentIdeas];
      newIdeas.splice(index, 1);
      this.ideasSubject.next(newIdeas);
      return true;
    }
    return false;
  }

  getPopularIdeas(): Observable<IdeaPost[]> {
    return this.http.get<IdeaPost[]>(`${this.apiUrl}/idea/popular`);
  }

  getDashboardMetrics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/metrics`);
  }

  getUserProgress(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/progress`);
  }

  /**
   * Get comments for a specific idea using the API endpoint.
   * @param ideaId The ID of the idea
   */
  getComments(ideaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/comment/${ideaId}`);
  }
}








