import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Request } from '../../models/project-models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RequestService {

  private readonly API_URL = environment.API_URL + '/request/';
  constructor(
    private readonly httpClient: HttpClient
  ) { }

  createRequest(body: Request): Observable<Request> {
    return this.httpClient.put<Request>(this.API_URL, body);
  }

  getRequestsForProject(projectId: string): Observable<Request[]> {
    return this.httpClient.get<Request[]>(this.API_URL + "project/" + `${projectId}`)
  }

  getRequestById(requestId: string, projectId: string): Observable<Request> {
    return this.httpClient.get<Request>(this.API_URL + `${requestId}` + "/" + `${projectId}`)
  }

  acceptRequest(requestId: string, projectId: string): Observable<void> {
    console.log(this.API_URL  + `${projectId}` + "/" + `${requestId}`)
    return this.httpClient.put<void>(this.API_URL  + `${projectId}` + "/" + `${requestId}`, null)
  }

  rejectRequest(requestId: string, projectId: string): Observable<void> {
    return this.httpClient.put<void>(this.API_URL + "delete/" + `${requestId}` + "/" + `${projectId}`, null)
  }
}
