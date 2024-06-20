import { HttpClient } from '@angular/common/http';
import { Injectable} from '@angular/core';
import { Observable } from 'rxjs';
import {Collaborator, Link, Media, Project, Tag, Template} from '../../models/project-models';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly API_URL = 'http://localhost:8080/project/';

  constructor(
    private readonly httpClient: HttpClient
  ) { }

  getAllProjects(): Observable<Project[]> {
    return this.httpClient.get<Project[]>(this.API_URL + 'public/');
  }
  

  getProjectById(id: string): Observable<Project> {
    return this.httpClient.get<Project>(this.API_URL+ `public/${id}`);
  }

  createProject(body: Project): Observable<Project> {
    return this.httpClient.post<Project>(this.API_URL, body);
  }

  editProject(id: String, body: Project): Observable<Project> {
    return this.httpClient.put<Project>(this.API_URL + `${id}`, body);
  }

  deleteProject(id: String): Observable<Object> {
    return this.httpClient.delete<Object>(this.API_URL + `${id}`);
  }

  updateProjectTemplate(id: String, body: Template | null): Observable<Project> {
    return this.httpClient.put<Project>(this.API_URL + `${id}` + '/template/', body);
  }
  
  getTemplateByProjectId(id: String): Observable<Template> {
    return this.httpClient.get<Template>(this.API_URL + `${id}` + '/template/');
  }

  removeTemplateFromProject(id: string, body: string): Observable<Project> {
    return this.httpClient.put<Project>(this.API_URL + "remove-template/" + `${id}`, body)
  }

}
