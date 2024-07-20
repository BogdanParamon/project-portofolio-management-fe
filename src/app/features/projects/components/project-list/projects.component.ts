import { Component, OnDestroy, OnInit } from '@angular/core';
import {MediaFileContent, Media, Project} from '../../models/project-models';
import { Tag, Request} from '../../models/project-models';
import { ProjectService } from '../../services/project/project.service';
import { DataView } from 'primeng/dataview';
import { CollaboratorService } from '../../services/collaborator/collaborator.service';
import { Subscription, firstValueFrom, map } from 'rxjs';
import { TagService } from '../../services/tag/tag.service';
import {MediaService} from "../../services/media/media.service";
import { StorageService } from 'src/app/features/accounts/services/authentication/storage.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthenticationService } from 'src/app/features/accounts/services/authentication/authentication.service';
import { Nullable } from 'primeng/ts-helpers';
import { environment } from 'src/environments/environment';


import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import {ActivatedRoute} from "@angular/router";
import { AccountService } from 'src/app/features/accounts/services/accounts/account.service';
import { RequestService } from '../../services/request/request.service';
@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
  providers: [ConfirmationService, MessageService]
})
export class ProjectsComponent implements OnInit, OnDestroy {
  APP_URL = environment.APP_URL;
  data: Project[] = [];
  filteredData: Project[] = [];
  layout: DataView["layout"] = "list";
  projectName: string = '';
  projectCollaborator: string = '';
  tagNames: string[] = [];
  selectedTagNames: string[] = [];
  isLoggedIn: boolean = false;
  username: string = '';
  role: Nullable<string> = '';
  showHelp: boolean = false;
  visible: boolean = false;
  projectsManagedByUser: Project[] = []
  requests: Request[] = []

 


  wsProjectsSubscription: Subscription = new Subscription();
  wsCollaboratorsProjectSubscription: Subscription = new Subscription()
  wsTagsSubscription: Subscription = new Subscription()
  wsTagsProjectSubscription: Subscription = new Subscription()
  wsMediaProjectSubscription: Subscription = new Subscription()


  projectsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/projects",
    deserializer: msg => String(msg.data)
  })
  collaboratorsProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/collaborators/project",
    deserializer: msg => String(msg.data)
  })
  tagsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/tags",
    deserializer: msg => String(msg.data)
  })
  tagsProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/tags/project",
    deserializer: msg => String(msg.data)
  })
  mediaProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/media/project",
    deserializer: msg => String(msg.data)
  })

  constructor(
    private readonly projectService: ProjectService,
    private readonly collaboratorService: CollaboratorService,
    private tagService: TagService,
    private mediaService: MediaService,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private confirmationService: ConfirmationService,
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private accountService: AccountService,
    private requestService: RequestService
  ) {}

  async ngOnInit(): Promise<void> {
    if(this.storageService.isLoggedIn()) {
      this.isLoggedIn = true;
      this.username = this.storageService.getUser();
      try {
        const role = await this.authenticationService.getRole(this.username).toPromise();
        if (role) {
          this.storageService.saveRole(role);
          this.role = role;
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Role is undefined.' });
        }
      } catch (error) {
        console.error('Error fetching role:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not get role.' });
      }
    }
    await this.initProjects()
    console.log("OnInit called")

    this.wsProjectsSubscription = this.projectsWebSocket.subscribe(
      async msg => {
        const words = msg.split(" ")
        if(words[0].includes("edited")) {
          console.log("refreshing only project: " + words[1])
          this.data.filter(x => x.projectId == words[1]).forEach(async x => {
             const project = await this.getProjectForId(x.projectId)
             x.title = project.title
             x.description = project.description
             x.archived = project.archived
            })
        }
        else
        {
        console.log("refreshing all projects");
        await this.initProjects()
      }
      }
    );

    

    this.wsCollaboratorsProjectSubscription = this.collaboratorsProjectWebSocket.subscribe(
      async msg => {
            console.log("refreshing only collaborators for project: " + msg)
            switch(msg) {
              case "all" : return this.data.forEach(async x => x.collaboratorNames = await this.getCollaboratorsForId(x.projectId))
              default : return this.data.filter(x => x.projectId == msg).forEach(async x => x.collaboratorNames = await this.getCollaboratorsForId(x.projectId))
          }}
    )

    this.wsTagsSubscription = this.tagsWebSocket.subscribe(
      async () => {
            console.log("refreshing entire tag list")
            this.tagNames = await this.getAllTagNames()
      }
    )

    this.wsTagsProjectSubscription = this.tagsProjectWebSocket.subscribe(
      async msg => {
            console.log("refreshing only tags for project: " + msg)
            switch(msg) {
              case "all" : return this.data.forEach(async x => {x.tagNames = await this.getTagNamesForId(x.projectId);
                                                                x.tags = await this.getTagsForId(x.projectId)})
              default : return this.data.filter(x => x.projectId == msg).forEach(async x => {x.tagNames = await this.getTagNamesForId(x.projectId);
                                                                                             x.tags = await this.getTagsForId(x.projectId)})
            }
      }
    )

    this.wsMediaProjectSubscription = this.mediaProjectWebSocket.subscribe(
      async msg => {
            console.log("refreshing media for project: " + msg)
              this.data.filter(x => x.projectId == msg).forEach(async x => {
                const newMedia = await this.getMediaForId(x.projectId)
                x.media = newMedia
                console.log(x.media)
                if (newMedia && newMedia.length > 0) {
                  x.thumbnail = await this.getImageForId(newMedia[0].mediaId);
                }
                else
                  x.thumbnail = undefined
              })
      }
    );
    }
  getColorCode(color:string):string{
    return this.tagService.getColorCode(color);
  }

    ngOnDestroy() {

      console.log("OnDestroyCalled")

      if(this.wsProjectsSubscription){
        this.wsProjectsSubscription.unsubscribe()
        this.projectsWebSocket.unsubscribe()
      }
      if(this.wsCollaboratorsProjectSubscription){
        this.wsCollaboratorsProjectSubscription.unsubscribe()
        this.collaboratorsProjectWebSocket.unsubscribe()
      }
      if(this.wsTagsSubscription){
        this.wsTagsSubscription.unsubscribe()
        this.tagsWebSocket.unsubscribe()
      }
      if(this.wsTagsProjectSubscription){
        this.wsTagsProjectSubscription.unsubscribe()
        this.tagsProjectWebSocket.unsubscribe()
      }
      if(this.wsMediaProjectSubscription){
        this.wsMediaProjectSubscription.unsubscribe()
        this.mediaProjectWebSocket.unsubscribe()
      }
    }

    async initProjects() {
      this.projectService.getAllProjects().subscribe(async (response: Project[]) => {
        this.data = response;
        const promises = this.data.map(async x => {
          x.collaboratorNames = await this.getCollaboratorsForId(x.projectId);
          // Any additional logic related to x after await can go here
        });
        this.data.forEach(async x => x.tagNames = await this.getTagNamesForId(x.projectId))
        this.data.forEach(async x => x.tags = await this.getTagsForId(x.projectId))
        this.data.forEach(async x => x.media = await this.getMediaForId(x.projectId))
        this.data.forEach(async (x) => {
          x.media = await this.getMediaForId(x.projectId);
          if (x.media && x.media.length > 0) {
            x.thumbnail = await this.getImageForId(x.media[0].mediaId);
          }
        });
        this.filteredData = this.data
        await Promise.all(promises);
        this.route.params.subscribe(params => {
          let colabPath: string = params['id'];
          if(colabPath!=undefined) {
            colabPath = colabPath.replace("-", " ");
            this.projectCollaborator = colabPath;
            this.onCollaboratorFilterChanges(colabPath);
          }
        });
      })
        this.tagNames = await this.getAllTagNames();
      const newProjects = await this.getManagedProjectsForUser(this.username)

      this.projectsManagedByUser = newProjects
      for (const proj of newProjects) {
        const newRequests = await firstValueFrom (this.requestService.getRequestsForProject(proj.projectId))
        console.log(newRequests)
        this.requests = this.requests.concat(newRequests)
    }
    }


    showDialog() {
      this.visible = true;
  }


  async getManagedProjectsForUser(username: string): Promise<Project[]> {
    return firstValueFrom(this.accountService.getProjectsManagedByAccount(username))
  }

  async getProjectForId(id: string): Promise<Project> {
    return firstValueFrom(this.projectService.getProjectById(id))
  }

  async getCollaboratorsForId(id: string): Promise<string[]> {
    return firstValueFrom(this.collaboratorService.getCollaboratorsByProjectId(id).pipe(
      map(data => data.map(x => x.name))
    ))
  }
  async getImageForId(id: string): Promise<MediaFileContent> {
    return firstValueFrom(this.mediaService.getDocumentContent(id).pipe())
  }
  async getMediaForId(id: string): Promise<Media[]> {
    return firstValueFrom(this.mediaService.getDocumentsByProjectId(id).pipe())
  }

   async getTagsForId(id: string): Promise<Tag[]> {
     return firstValueFrom(this.tagService.getTagsByProjectId(id))
   }

   async getTagNamesForId(id: string): Promise<string[]> {
     return firstValueFrom(this.tagService.getTagsByProjectId(id)
     .pipe(
       map(data => data.map(x => x.name))
     ))
   }

   async getAllTagNames(): Promise<string[]> {
     return firstValueFrom(this.tagService.getAllTags().pipe(
       map(x => x.map(x => x.name))
     ))
   }

  onTitleFilterChange(event: Event): void {
    this.projectName = (event.target as HTMLInputElement).value
    this.filterProjects()
  }

  filterByTitle(dataToFilter: Project[]): Project[] {
    if(this.projectName == '')
      return dataToFilter
    return dataToFilter.filter(x => x.title.toLocaleLowerCase().includes(this.projectName.toLocaleLowerCase()))
  }


  onCollaboratorFilterChange(event: Event): void {
    this.projectCollaborator = (event.target as HTMLInputElement).value
    this.filterProjects()
  }
  onCollaboratorFilterChanges(colab :string): void {
    this.projectCollaborator = colab
    this.filterProjects()
  }

  filterByCollaborator(dataToFilter: Project[]): Project[] {
    if(this.projectCollaborator == '')
      return dataToFilter
    console.log(dataToFilter);
    return dataToFilter.filter(project =>
      project.collaboratorNames.some(collaborator =>
        collaborator.toLocaleLowerCase().includes(this.projectCollaborator.toLocaleLowerCase())
      )
    );
  }

  onTagSelectedFilterChanged(): void {
    this.filterProjects()
  }

  filterByTags(dataToFilter: Project[]) {
    if(this.selectedTagNames.length == 0)
      return dataToFilter
    return dataToFilter.filter(project => this.selectedTagNames.every(name => project.tagNames.includes(name)))
  }


  async filterProjects() {
    this.filteredData = this.filterByTitle(this.data)
    console.log(this.filteredData)
    this.filteredData = this.filterByCollaborator(this.filteredData)
    this.filteredData = this.filterByTags(this.filteredData)
  }

  getImageSrc(project:Project): string {
    if(project.thumbnail == undefined)
      return 'https://as2.ftcdn.net/v2/jpg/01/25/64/11/1000_F_125641180_KxdtmpD15Ar5h8jXXrE5vQLcusX8z809.jpg'
    const type = project.thumbnail.filePath.substring(project.thumbnail.filePath.lastIndexOf('.') + 1);
    return `data:image/${type};base64,${project.thumbnail.fileContent}`;
  }



    logout() {
      const username = this.storageService.getUser();
      this.confirmationService.confirm({
        message: "Are you sure you want to log out of the account " + username + "?",
        accept: () => {
          this.authenticationService.logout().subscribe({
            next: () => {
              this.isLoggedIn = false;
              this.storageService.clean();
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Logged out successfully.' });
              return;
            },
            error: err => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not be logged out: ' + err.message });
            }
          })
        }
      })
    }

    isDarkColor(color: string): boolean {
      return this.tagService.isDarkColor(color);
    }

    filterTagsOnClick(tagName: string): void {
      this.selectedTagNames.push(tagName);
      this.onTagSelectedFilterChanged();
    }

    parseWriting(names: string[]): string {
      if (names == null) return '';
      return names.join(', ');
    }

    isPM(): boolean {
      return this.role == "ROLE_PM" || this.role == "ROLE_ADMIN"
    }
  }
