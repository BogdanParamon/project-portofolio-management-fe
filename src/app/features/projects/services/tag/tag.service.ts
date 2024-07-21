import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestTagProject, Tag } from '../../models/project-models';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TagService {

  private readonly API_URL = environment.API_URL + '/tag/';
  constructor(
    private readonly httpClient: HttpClient
  ) { }

  getTagsByProjectId(id: string): Observable<Tag[]> {
    return this.httpClient.get<Tag[]>(this.API_URL + `public/${id}`);
  }

  getAllTags(): Observable<Tag[]> {
    return this.httpClient.get<Tag[]>(this.API_URL + 'public/');
  }
  createTag(tag: Tag): Observable<Tag> {
    return this.httpClient.post<Tag>(this.API_URL+ 'create', tag)
  }
  addTagToProject(tag: Tag, projectId: string): Observable<Tag> {
    return this.httpClient.post<Tag>(this.API_URL+ `${projectId}` + "/" + `${tag.tagId}`, "")
  }
  removeTagFromProject(tag: Tag,projectId:string): Observable<string> {
    return this.httpClient.delete<string>(this.API_URL+ `${projectId}` + "/" + `${tag.tagId}`)
  }

  getColorCode(color: string): string {
    switch(color) {
      case "red":
        return "rgba(255, 93, 70, 0.45)"
      case "green":
        return "rgba(10, 118, 77, 0.45)"
      case "blue":
        return "rgba(10, 118, 255, 0.45)"
      case "yellow":
        return "rgba(255, 255, 0, 0.45)"
      case "orange":
        return "rgba(255, 190, 61, 0.45)"
      case "purple":
        return "rgba(106, 0, 255, 0.45)"
      case "black":
        return "rgba(0, 0, 0, 0.45)"
      default:
        return "rgba(111, 118, 133, 0.45)"
    }
  }

  isDarkColor(color: string): boolean {
    const hexToRgb = (hex: string) =>
      hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
      ,(m, r, g, b) => '#' + r + r + g + g + b + b)
      .substring(1).match(/.{2}/g)!
      .map(x => parseInt(x, 16));
  
    const [r, g, b] = hexToRgb(color);

    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  
    return brightness < 128;
  }


  addTagToRequest(requestId: string, tagId: string, isRemove: boolean, projectId: string): Observable<Tag> {
    return this.httpClient.post<Tag>(this.API_URL + "request/" + `${requestId}` + "/" + `${tagId}` + "/" + `${projectId}`, isRemove)
  }

  getTagsChangedForRequest(requestId: string, projectId: string): Observable<RequestTagProject[]> {
    return this.httpClient.get<RequestTagProject[]>(this.API_URL + "request/" + `${requestId}` + "/" + `${projectId}`)
  }
}
