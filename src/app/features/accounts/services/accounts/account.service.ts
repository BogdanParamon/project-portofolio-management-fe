import { Injectable } from '@angular/core';
import {Observable} from "rxjs";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {  Project } from 'src/app/features/projects/models/project-models';
import { AccountTransfer, ProjectTransfer, AccountDisplay, Account } from '../../models/accounts-models';
import { environment } from 'src/environments/environment';

const API_URL = environment.API_URL + '/account';

const httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

const httpOptionsGet = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    }),
    responseType: 'text' as 'json'
  };

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  constructor(private readonly httpClient: HttpClient) { }

  editAccount(username: string, name: string, password: string, role: string) {
    const body = {
        username: username,
        name: name,
        password: password,
        role: role
    };
    return this.httpClient.put<Observable<Account>>(API_URL, body, httpOptions);
  }

  editRoleOfAccount(accountTransfer: AccountTransfer): Observable<void> {
    const body = {
      username: accountTransfer.username,
      isPM: accountTransfer.pm,
      isAdmin: accountTransfer.admin
  };
    return this.httpClient.put<void>(API_URL + '/editRole', body, httpOptions);
  }

  getAccount(username: string): Observable<Account> {
    const url = API_URL + `/public/${username}`;
    return this.httpClient.get<Account>(url, httpOptions);
  }

  deleteAccount(username: string): Observable<void> {
    const url = API_URL + `/${username}`;
    return this.httpClient.delete<void>(url, httpOptions);
  }

  addRoleOnProject(username: string, projectId: string, roleInProject: string): Observable<void> {
    const url = API_URL + `/${username}/${projectId}`;
    const body = '"' + roleInProject + '"'
    return this.httpClient.post<void>(url, body, httpOptions);
  }

  deleteRoleOnProject(username: string, projectId: string): Observable<void> {
    const url = API_URL + `/${username}/${projectId}`;
    return this.httpClient.delete<void>(url, httpOptionsGet);
  }

  updateRoleOnProject(username: string, projectId: string, roleInProject: string): Observable<void> {
    const url = API_URL + `/${username}/${projectId}`;
    return this.httpClient.put<void>(url, '"' + roleInProject + '"', httpOptions);
  }

  getRoleOnProject(username: string, projectId: string): Observable<string> {
    const url = API_URL + `/public/role/${username}/${projectId}`;
    return this.httpClient.get<string>(url, httpOptionsGet);
  }

  getAccounts(): Observable<AccountTransfer[]> {
    return this.httpClient.get<AccountTransfer[]>(API_URL, httpOptions);
  }

  getProjects(username: string): Observable<ProjectTransfer[]> {
    const url = API_URL + `/role/${username}`;
    return this.httpClient.get<ProjectTransfer[]>(url, httpOptions);
  }

  getAllUsernames(): Observable<string[]> {
    const url = API_URL + `/usernames`;
    return this.httpClient.get<string[]>(url, httpOptions);
  }

  getAccountByName(name: string): Observable<string[]> {
    const url = API_URL + `/public/name/${name}`;
    return this.httpClient.get<string[]>(url, httpOptions);
  }

  getAccountsInProject(projectId: string): Observable<AccountDisplay[]> {
    const url = API_URL + `/project/${projectId}`;
    return this.httpClient.get<AccountDisplay[]>(url, httpOptions);
  }

  getProjectsManagedByAccount(username: string): Observable<Project[]> {
    if(username == "") {
      return new Observable<Project[]>();
    }
    return this.httpClient.get<Project[]>(API_URL + "/public/managed/" + `${username}`)
  }

}