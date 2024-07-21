import { HttpClient } from '@angular/common/http';
import { Injectable} from '@angular/core';
import { Observable } from 'rxjs';
import {Project, Template} from '../../models/project-models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly API_URL = environment.API_URL + '/project/';

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

  editProject(id: string, body: Project): Observable<Project> {
    return this.httpClient.put<Project>(this.API_URL + `${id}`, body);
  }

  deleteProject(id: string): Observable<string> {
    return this.httpClient.delete<string>(this.API_URL + `${id}`);
  }

  updateProjectTemplate(id: string, body: Template | null): Observable<Project> {
    return this.httpClient.put<Project>(this.API_URL + `${id}` + '/template/', body);
  }
  
  getTemplateByProjectId(id: string): Observable<Template> {
    return this.httpClient.get<Template>(this.API_URL + `${id}` + '/template/');
  }

  removeTemplateFromProject(id: string, body: string): Observable<Project> {
    return this.httpClient.put<Project>(this.API_URL + "remove-template/" + `${id}`, body)
  }

}
