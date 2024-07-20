import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Collaborator, RequestCollaboratorsProjects } from '../../models/project-models';
import { CollaboratorTransfer } from '../../models/project-models';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CollaboratorService {

  private readonly API_URL = environment.API_URL + '/collaborator/';
  constructor(
    private readonly httpClient: HttpClient
  ) { }

  getCollaboratorsByProjectId(id: string): Observable<CollaboratorTransfer[]> {
    return this.httpClient.get<CollaboratorTransfer[]>(this.API_URL + `public/${id}`);
  }

  getAllCollaborators(): Observable<Collaborator[]> {
    return this.httpClient.get<Collaborator[]>(this.API_URL + 'public/');
  }

  addCollaboratorToProject(collaborator: Collaborator, projectId: string): Observable<Collaborator> {
    const body = "role1"
    return this.httpClient.post<Collaborator>(this.API_URL + `${projectId}` + "/" + `${collaborator.collaboratorId}`, body);
  }
  deleteCollaboratorFromProject(projectId: string, collaboratorId: string): Observable<string> {
    return this.httpClient.delete<string>(this.API_URL + `${projectId}` + "/" + `${collaboratorId}`,{ responseType: 'text' as 'json'});
  }

  createAndAddCollaboratorToProject(collaborator: CollaboratorTransfer, projectId: string): Observable<CollaboratorTransfer> {
    return this.httpClient.post<CollaboratorTransfer>(this.API_URL + `${projectId}`, collaborator);
  }

  addCollaboratorToRequest(requestId: string, collaboratorId: string, isRemove: boolean, projectId: string): Observable<Collaborator> {
    return this.httpClient.post<Collaborator>(this.API_URL + "request/" + `${requestId}` + "/" + `${collaboratorId}` + "/" + `${projectId}`, isRemove)
  }

  getChangesCollaboratorsForRequest(requestId: string, projectId: string): Observable<RequestCollaboratorsProjects[]> {
    return this.httpClient.get<RequestCollaboratorsProjects[]>(this.API_URL + "request/" + `${requestId}` + "/" + `${projectId}`)
  }

}
