import {Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, NO_ERRORS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {AccordionModule} from 'primeng/accordion';
import {BadgeModule} from 'primeng/badge';
import {AvatarModule} from 'primeng/avatar';
import {CardModule} from 'primeng/card';
import {SplitterModule} from 'primeng/splitter';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {TagModule} from 'primeng/tag';
import {ButtonModule} from 'primeng/button';
import {CarouselModule} from 'primeng/carousel';
import {ChipModule} from 'primeng/chip';
import {Link, Media, MediaFileContent, Project, Tag} from "../../models/project-models";
import {ActivatedRoute, RouterLink} from '@angular/router';
import {DividerModule} from 'primeng/divider';
import {ProjectService} from "../../services/project/project.service";
import {LinkService} from "../../services/link/link.service";
import {MediaService} from "../../services/media/media.service";
import {CollaboratorService} from "../../services/collaborator/collaborator.service";
import {TagService} from "../../services/tag/tag.service";
import {DialogModule} from "primeng/dialog";
import { Router } from '@angular/router'
import { StorageService } from 'src/app/features/accounts/services/authentication/storage.service';
import { AccountService } from 'src/app/features/accounts/services/accounts/account.service';
import { AuthenticationService } from 'src/app/features/accounts/services/authentication/authentication.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {ConfirmationService, MessageService} from "primeng/api";
import { CollaboratorTransfer } from '../../models/project-models';
import {ImageModule} from "primeng/image";
import {GalleriaModule} from "primeng/galleria";
import {environment} from "src/environments/environment";

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [DividerModule, ChipModule, AccordionModule, BadgeModule, AvatarModule, CardModule, SplitterModule, CommonModule, TagModule, ButtonModule, CarouselModule, DialogModule, RouterLink, ConfirmDialogModule, NgOptimizedImage, ImageModule, GalleriaModule],
  templateUrl: './project-detail.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  styleUrls: ['./project-detail.component.css'],
  providers: [ConfirmationService, MessageService]
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  APP_URL = environment.APP_URL;
  images: MediaFileContent[] = [];
  documents: Media[] = [];
  bibTeX: MediaFileContent | undefined = {
    fileName: '',
    filePath: '',
    fileContent: ''
  };
  projectId: string = "";
  visible: boolean = false;
  projectDescription: string[] = [];
  project: Project = {
    projectId: '',
    title: '',
    description: '',
    archived: false,
    media: [],
    projectsToAccounts: [],
    projectsToCollaborators: [],
    tagsToProjects: [],
    links: [],
    requests: [],
    collaboratorNames: [],
    tagNames: [],
    tags: [],
    thumbnail: { fileName: '', filePath: '' ,fileContent:''},
    template: null
  };
  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 1,
      numScroll: 1
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1
    }
  ];
  collaborators: CollaboratorTransfer[] = [];
  links: Link[] = [];
  tags: Tag[] = [];
  isMobile: boolean;

  role_on_project: string = '';
  username: string = '';
  isLoggedIn: boolean = false;


  wsProjectsSubscription: Subscription = new Subscription();
  wsCollaboratorsProjectSubscription: Subscription = new Subscription();
  wsTagsProjectSubscription: Subscription = new Subscription();
  wsLinksProjectSubscription: Subscription = new Subscription();
  wsMediaProjectSubscription: Subscription = new Subscription();


  projectsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/projects",
    deserializer: msg => String(msg.data)
  })
  collaboratorsProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/collaborators/project",
    deserializer: msg => String(msg.data)
  })
  tagsProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/tags/project",
    deserializer: msg => String(msg.data)
  })
  linksProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/link/project",
    deserializer: msg => String(msg.data)
  })
  mediaProjectWebSocket: WebSocketSubject<string> = webSocket({
    url:environment.API_URL.replace('http', 'ws') + "/topic/media/project",
    deserializer: msg => String(msg.data)
  })
  constructor(private readonly router:Router,
    readonly projectService: ProjectService,
    private readonly tagService: TagService,
    private readonly linkService: LinkService,
    private readonly mediaService: MediaService,
    private readonly collaboratorService: CollaboratorService,
              private confirmationService: ConfirmationService,
              private messageService: MessageService,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private accountService: AccountService,
    private authenticationService: AuthenticationService) {
    this.isMobile = window.innerWidth <= 767;
  }

  getCollaborators(): string {
    return this.collaborators
      .map(collaborator => `<a href="${this.APP_URL}/${collaborator.name.replaceAll(" ","-")}">${collaborator.name} (<b>${collaborator.role}</b>)</a>`)
      .join(', ');
  }


  async ngOnInit() {

    await this.initializeProject();

    this.wsProjectsSubscription = this.projectsWebSocket.subscribe(
     async msg => {
       const words = msg.split(" ");
       if(words[1] == this.projectId) {
         switch (words[0]) {
           case "edited" : {
             const newProject = await this.getProjectById(this.projectId);
             this.project.title = newProject.title;
             this.projectDescription = newProject.description.split(/\r?\n|\r|\n/g);
             return;
           }
           case "deleted" : {
             this.router.navigate(['/']);
             return;
           }
         }
       }
     }
    );

    this.wsCollaboratorsProjectSubscription = this.collaboratorsProjectWebSocket.subscribe(
     async msg => {
       if(msg == "all" || msg == this.projectId) {
         this.collaborators = await this.getCollaboratorsByProjectId(this.projectId);
       }
     }
    );

    this.wsTagsProjectSubscription = this.tagsProjectWebSocket.subscribe(
     async msg => {
      if(msg == "all" || msg == this.projectId) {
        this.tags = await this.getTagsByProjectId(this.projectId);
      }
     }
    );

    this.wsLinksProjectSubscription = this.linksProjectWebSocket.subscribe(
     async msg => {
       if(msg == "all" || msg == this.projectId) {
         this.links = await this.getLinksByProjectId(this.projectId);
       }
     }
    );

    this.wsMediaProjectSubscription = this.mediaProjectWebSocket.subscribe(
     async msg => {
       if(msg == this.projectId) {
         const mediaFileData = await this.getMediaContentByProjectId();
         this.images = mediaFileData.filter(media => media.filePath && (media.filePath.endsWith(".jpg") || media.filePath.endsWith(".png")));
         this.bibTeX = mediaFileData.find(media => media.filePath && media.filePath.endsWith(".bib"));
         this.project.thumbnail = this.images[0];
         const documentData = await this.getDocumentsByProjectId(this.projectId);
         this.documents = documentData.filter(media => media.path && !(
           media.path.endsWith(".jpg") ||
           media.path.endsWith(".png")
         ));
       }
     }
    );

    this.isLoggedIn = this.storageService.isLoggedIn();
      if(this.isLoggedIn) {

        this.username = this.storageService.getUser();
        try {
          const role = await this.authenticationService.getRole(this.username).toPromise();
          if(role && role != this.storageService.getRole()) {
            this.storageService.saveRole(role);
          }

          if(this.storageService.getRole() === "ROLE_ADMIN") {
            this.role_on_project = "ADMIN";
            return;
          }

          this.accountService.getRoleOnProject(this.username, this.projectId).subscribe({
            next: (role: string) => {
              this.role_on_project = role;
            },
            error: (err) => {
              console.error('Error fetching the role of the user from the database', err);
            },
          });
        }
        catch (error) {
          console.error('Error fetching role, waiting took too long', error);
        }
      }
    }
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= 767;
  }

  ngOnDestroy(): void {
    if(this.wsProjectsSubscription)
      this.wsProjectsSubscription.unsubscribe()
    if(this.wsTagsProjectSubscription)
      this.wsTagsProjectSubscription.unsubscribe()
    if(this.wsCollaboratorsProjectSubscription)
      this.wsCollaboratorsProjectSubscription.unsubscribe()
    if(this.wsMediaProjectSubscription)
      this.wsMediaProjectSubscription.unsubscribe()
    if(this.wsLinksProjectSubscription)
      this.wsLinksProjectSubscription.unsubscribe()
  }

  async initializeProject(): Promise<void> {
    this.route.params.subscribe(params => {
      this.projectId = (params['id']);
      this.projectService.getProjectById(params['id']).subscribe((responseProject: Project) => {
        this.project = responseProject;
        this.projectDescription = this.project.description.split(/\r?\n|\r|\n/g);
      });
      this.linkService.getLinksByProjectId(params['id']).subscribe((responseLinks: Link[]) => {
        this.links = responseLinks;
      });
      this.collaboratorService.getCollaboratorsByProjectId(params['id']).subscribe((responseCollaborators: CollaboratorTransfer[]) => {
        this.collaborators = responseCollaborators;
      });
      this.tagService.getTagsByProjectId(params['id']).subscribe((responseTags: Tag[]) => {
        this.tags = responseTags;
        console.log(this.tags);
      });
    });
    this.mediaService.getMediasContentByProjectId(this.projectId).subscribe({
       next: (data: MediaFileContent[]) => {
         this.images = data.filter(media => media.filePath && (media.filePath.endsWith(".jpg") || media.filePath.endsWith(".png")));
         this.project.thumbnail = this.images[0];
         this.bibTeX = data.find(media => media.filePath && media.filePath.endsWith(".bib"));
       },
       error: (err: unknown) => {
         console.error('Error fetching media files', err);
       }
     })
     this.mediaService.getDocumentsByProjectId(this.projectId).subscribe({
         next: (data: Media[]) => {
           this.documents = data.filter(media => media.path && !(
             media.path.endsWith(".jpg") ||
             media.path.endsWith(".png")
           ));
         },
         error: (err: unknown) => {
           console.error('Error fetching media files', err);
         }
       }
     );
  }

  async getProjectById(id: string): Promise<Project> {
    return firstValueFrom(this.projectService.getProjectById(id))
  }

  async getCollaboratorsByProjectId(id: string): Promise<CollaboratorTransfer[]> {
    return firstValueFrom(this.collaboratorService.getCollaboratorsByProjectId(id))
  }

  async getTagsByProjectId(id: string): Promise<Tag[]> {
    return firstValueFrom(this.tagService.getTagsByProjectId(id))
  }

  async getLinksByProjectId(id: string): Promise<Link[]> {
    return firstValueFrom(this.linkService.getLinksByProjectId(id))
  }

  async getMediaContentByProjectId(): Promise<MediaFileContent[]> {
    return firstValueFrom(this.mediaService.getMediasContentByProjectId(this.projectId))
  }

  async getDocumentsByProjectId(id: string): Promise<Media[]> {
    return firstValueFrom(this.mediaService.getDocumentsByProjectId(id))
  }

  getImageSrc(media: MediaFileContent): string {
    const type = media.filePath.substring(media.filePath.lastIndexOf('.') + 1);
    return `data:image/${type};base64,${media.fileContent}`;
  }
  downloadFile(media: MediaFileContent) {
    this.mediaService.downloadFile(media);
  }
  isAbsoluteUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  convertBibtex(): string | undefined {
    if (this.bibTeX == undefined) {
      return undefined;
    }
    const decodedStr = atob(this.bibTeX.fileContent);
    const utf8Str = decodeURIComponent(escape(decodedStr));
    const lines = utf8Str.split('\n');
    let maxIndex = 0;
    const parts = lines.map(line => {
      const index = line.indexOf('=');
      if (index > maxIndex) {
        maxIndex = index;
      }
      return {line, index};
    });
    const formattedLines = parts.map(part => {
      if (part.index === -1) {
        return part.line;
      }
      const padding = ' '.repeat(maxIndex - part.index);
      return part.line.replace('=', `${padding} =`);
    });
    const formattedBibtex = formattedLines.map(line => {
      return line.replace(/\{(.*?)\}/g, '"$1"');
    });
    return formattedBibtex.join('\n');
  }
  async downloadDocument(mediaId: string){
    let mediaFile : MediaFileContent = {
      fileName:"",
      filePath:"",
      fileContent:""
    };
    this.mediaService.getDocumentContent(mediaId).subscribe({
       next: (data: MediaFileContent) => {
        mediaFile = data;
        this.downloadFile(mediaFile);
       },
       error: (err:unknown) => {
         console.error('Error fetching media files', err);
       }
     })
  }
  showDeleteDialog() {
    this.visible = true;
  }
  deleteProject(projectId:string){
    this.projectService.deleteProject(projectId).subscribe(() => {});
    this.router.navigateByUrl('');
  }
  getColorCode(color: string): string {
    return this.tagService.getColorCode(color);
  }
  logout() {
    this.confirmationService.confirm({
      message: "Are you sure you want to log out of the account " + this.storageService.getUser() + "?",
      accept: () => {
        this.authenticationService.logout().subscribe({
          next: () => {
            this.isLoggedIn = false;
            this.storageService.clean();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Logged out successfully.' });
            return;
          },
          error: err => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not be logged out.: ' + err.message });
          }
        })
      }
    })
  }

  isDarkColor(color: string): boolean {
    return this.tagService.isDarkColor(color);
  }
}
