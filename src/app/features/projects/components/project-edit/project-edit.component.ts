import { Component , OnInit } from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import {FormControl, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ChipsModule } from 'primeng/chips';
import {
  Collaborator,
  EditMedia,
  Link,
  Media,
  MediaFileContent,
  Project,
  Tag,
  Template,
  Request
} from '../../models/project-models';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '../../services/project/project.service';
import {FileUpload, FileUploadEvent, FileUploadHandlerEvent, FileUploadModule} from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import{ MediaService} from "../../services/media/media.service";
import { DropdownModule } from 'primeng/dropdown';
import { Subscription, firstValueFrom, map } from 'rxjs';
import { LinkService } from '../../services/link/link.service';
import { CollaboratorService } from '../../services/collaborator/collaborator.service';
import { TemplateService } from '../../services/template/template.service';
import { TagService } from '../../services/tag/tag.service';
import { Serializer } from '@angular/compiler';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { AccountService } from 'src/app/features/accounts/services/accounts/account.service';
import { StorageService } from 'src/app/features/accounts/services/authentication/storage.service';
import { AuthenticationService } from 'src/app/features/accounts/services/authentication/authentication.service';
import { RequestService } from '../../services/request/request.service';
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {DataViewModule} from "primeng/dataview";
import {DialogModule} from "primeng/dialog";
@Component({
  selector: 'app-project-edit',
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.css'],
  standalone: true,
  imports: [FormsModule, InputTextModule, FloatLabelModule,
    InputTextareaModule, ChipsModule, TableModule, TagModule,
    RatingModule, ButtonModule, CommonModule, FileUploadModule,
    DropdownModule, ToastModule, RouterLink, AutoCompleteModule, DataViewModule, DialogModule, ReactiveFormsModule],
  providers: [ProjectService, MessageService]
})

export class ProjectEditComponent implements OnInit {
  projectId: string | null = null;
  project!: Project;
  title!: string;
  description!: string;
  newTagName: string = "";
  newTagColor: string = "";
  addTagVisible: boolean = false;
  platformCollaborators: Collaborator[] = [];
  selectedCollaborators: Collaborator[] = []
  selectedCollaboratorNames: string[] = []
  filteredCollaborators: Collaborator[] = []
  addCollaborators: Collaborator[] = []
  removeCollaborators: Collaborator[] = []

  platformTags: Tag[] = [];
  selectedTags: Tag[] = []
  selectedTagNames: string[] = []
  filteredTags: Tag[] = [];
  addTags:Tag[] =[]
  removeTags:Tag[] =[]
  links: Link[] = [];
  templates!: Template[];
  templateNames: string[] = [];
  selectedTemplateName: string | undefined;
  selectedTemplate: Template | null = null;
  deleteLinkList: Link[] = [];

  editMediaList: EditMedia[] = []

  tags: Tag[] | undefined;
  colaborators: Collaborator[] | undefined;
  tagnames: string[] | undefined;
  collaboratornames: string[] | undefined;
  tagColorInput = new FormControl('', [Validators.required]);
  tagNameInput = new FormControl('', [Validators.required]);

  role_on_project: string = '';
  username: string = '';
  isLoggedIn: boolean = false;

  wsProjectsSubscription: Subscription = new Subscription()
  wsCollaboratorsProjectSubscription: Subscription = new Subscription()
  wsCollaboratorsSubscription: Subscription = new Subscription()
  wsTagsProjectSubscription: Subscription = new Subscription()
  wsTagsSubscription: Subscription = new Subscription()
  wsLinksProjectSubscription: Subscription = new Subscription()
  wsMediaProjectSubscription: Subscription = new Subscription()

  projectsWebSocket: WebSocketSubject<any> = webSocket({
    url: "ws://localhost:8080/topic/projects",
    deserializer: msg => String(msg.data)
  })
  collaboratorsProjectWebSocket: WebSocketSubject<any> = webSocket({
    url: "ws://localhost:8080/topic/collaborators/project",
    deserializer: msg => String(msg.data)
  })
  collaboratorsWebSocket: WebSocketSubject<any> = webSocket({
    url: "ws://localhost:8080/topic/collaborators",
    deserializer: msg => String(msg.data)
  })
  tagsProjectWebSocket: WebSocketSubject<any> = webSocket({
    url: "ws://localhost:8080/topic/tags/project",
    deserializer: msg => String(msg.data)
  })
  tagsWebSocket: WebSocketSubject<any> = webSocket({
    url: "ws://localhost:8080/topic/tags",
    deserializer: msg => String(msg.data)
  })
  linksProjectWebSocket: WebSocketSubject<any> = webSocket({
    url: "ws://localhost:8080/topic/link/project",
    deserializer: msg => String(msg.data)
  })
  mediaProjectWebSocket: WebSocketSubject<any> = webSocket({
    url: "ws://localhost:8080/topic/media/project",
    deserializer: msg => String(msg.data)
  })

  constructor(private route: ActivatedRoute,
    private projectService: ProjectService,
    private messageService: MessageService,
    private mediaService: MediaService,
    private linkService: LinkService, 
    private collaboratorService: CollaboratorService, 
    private templateService: TemplateService,
    private tagService: TagService, 
    private accountService: AccountService, 
    private storageService: StorageService,
    private authenticationService: AuthenticationService,
    private requestService: RequestService,
    private readonly router: Router
    ) {}

  async ngOnInit() {
    await this.initializeFields()

    this.wsProjectsSubscription = this.projectsWebSocket.subscribe(
      async msg => {
        const words = msg.split(" ")
        if(words[1] == this.projectId) {
          switch (words[0]) {
            case "edited" : {
              if(this.projectId){
                const newProject = await this.getProjectById(this.projectId)
                this.title = newProject.title
                this.description = newProject.description}
              return
            }
            case "deleted" : {
              this.router.navigate(['/'])
              return
            }
          }
        }
      }
    )

    this.wsCollaboratorsProjectSubscription = this.collaboratorsProjectWebSocket.subscribe(
      async msg => {
        if(msg == "all" || msg == this.projectId) {
          if(this.projectId){
            const newCollaborators = await this.getCollaboratorsByProjectId(this.projectId)
            this.colaborators = newCollaborators
            this.collaboratornames = newCollaborators.map(x => x.name)
          }
        }
      }
     )

     this.wsTagsProjectSubscription = this.tagsProjectWebSocket.subscribe(
      async msg => {
        if(msg == "all" || msg == this.projectId) {
          if(this.projectId){
            const newTags  = await this.getTagsByProjectId(this.projectId)
            this.tags = newTags
            this.tagnames = newTags.map(x => x.name);
          }
        }
      }
     )

     this.wsMediaProjectSubscription = this.mediaProjectWebSocket.subscribe(
      async msg => {
        if(msg == "all" || msg == this.projectId) {
          if(this.projectId){
          const newMedia = await this.getDocumentsByProjectId(this.projectId)
            for (const mediaObject of newMedia) {
            {
              const editMedia:EditMedia = {
                media:mediaObject,
                mediaFileContent:null,
                file:null,
                delete:false
              }
              this.editMediaList.push(editMedia)
            }
        }
          }
        }
      }
     )

     this.wsLinksProjectSubscription = this.linksProjectWebSocket.subscribe(
      async msg => {
        if(msg == "all" || msg == this.projectId) {
          if(this.projectId){
            const newLinks = await this.getLinksByProjectId(this.projectId)
            this.links = newLinks
          }
        }
      }
     )



     //should define here the collaborators and tags websocket such that it updates autocomplete
     //as in project-add components. The autocomplete is done on dev, we do it after we merge this with dev
     
     
    
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

         if(this.projectId) { 
          this.accountService.getRoleOnProject(this.username, this.projectId).subscribe({
           next: (role: string) => {
             this.role_on_project = role;
           },
           error: (err) => {
             console.error('Error fetching the role of the user from the database', err);
           },
         });
        }
       }
       catch (error) {
         console.error('Error fetching role, waiting took too long', error);
       }
     }

  }

  async initializeFields() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    this.templates = await this.getAllTemplates()
    this.templateNames = await this.getAllTemplateNames()
    this.platformTags = await this.getAllTags();
    this.platformCollaborators = await this.getAllCollaborators()

    if (this.projectId) {
      this.linkService.getLinksByProjectId(this.projectId).subscribe((response: Link[]) => {
        this.links = response
      });
      this.mediaService.getDocumentsByProjectId(this.projectId).subscribe((response: Media[]) => {
        for (const mediaObject of response) {
          {
            const editMedia:EditMedia = {
              media:mediaObject,
              mediaFileContent:null,
              file:null,
              delete:false
            }
            this.editMediaList.push(editMedia)
          }
        }
      });
      this.projectService.getProjectById(this.projectId).subscribe((response: Project) => {
        this.project = response;
        this.title = this.project.title;
        this.description = this.project.description;
        this.selectedTemplate = this.project.template;
        this.selectedTemplateName = this.project.template?.templateName;
      });
      this.tagService.getTagsByProjectId(this.projectId).subscribe((response: Tag[]) => {
        this.selectedTags = response;
        this.selectedTagNames = this.selectedTags.map(x => x.name)
      });
      this.collaboratorService.getCollaboratorsByProjectId(this.projectId).subscribe((response: Collaborator[]) => {
        this.selectedCollaborators = response
        this.selectedCollaboratorNames = this.selectedCollaborators.map(x => x.name)
      });
    } else {
      console.error('Project ID is null');
    }
  }
  async getAllTags(): Promise<Tag[]> {
    return firstValueFrom(this.tagService.getAllTags());
  }
  getAllCollaborators(): Promise<Collaborator[]> {
    return firstValueFrom(this.collaboratorService.getAllCollaborators())
  }

  async getProjectById(id: string): Promise<Project> {
    return firstValueFrom(this.projectService.getProjectById(id))
  }
  getNamesForCollaborators(collaborators: Collaborator[]): string[] {
    return collaborators.map(x => x.name)
  }

  async getCollaboratorsByProjectId(id: string): Promise<Collaborator[]> {
    return firstValueFrom(this.collaboratorService.getCollaboratorsByProjectId(id))
  }
  filterCollaborators(event: any) {
    const query = (event as AutoCompleteCompleteEvent).query
    this.filteredCollaborators = this.platformCollaborators.filter(collaborator => collaborator.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  }
  getNamesForTags(tags: Tag[]): string[] {
    return tags.map(x => x.name)
  }
  filterTags(event: any) {
    const query = (event as AutoCompleteCompleteEvent).query
    this.filteredTags = this.platformTags.filter(tag => tag.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  }
  async getTagsByProjectId(id: string): Promise<Tag[]> {
    return firstValueFrom(this.tagService.getTagsByProjectId(id))
  }

  async getLinksByProjectId(id: string): Promise<Link[]> {
    return firstValueFrom(this.linkService.getLinksByProjectId(id))
  }

  async getDocumentsByProjectId(id: string): Promise<Media[]> {
    return firstValueFrom(this.mediaService.getDocumentsByProjectId(id))
  }

  async getAllTemplates(): Promise<Template[]> {
    return firstValueFrom(this.templateService.getTemplates())
  }

  async getAllTemplateNames(): Promise<string[]> {
    return firstValueFrom(this.templateService.getTemplates()
    .pipe(
      map(x => x.map(y => y.templateName))
    ))
  }

  async saveProject(): Promise<void> {

    if(this.projectId == null) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Project id is null, cannot be saved' });
      return;
    }

    if (this.isAnyLinkFieldEmpty()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'All link fields must be filled out' });
      return;
    }

    try {
      const thumbnail: MediaFileContent = {
        filePath: '',
        fileContent: '',
        fileName:''
      }

      const foundTemplate = this.templates.find(x => x.templateName === this.selectedTemplateName);
      this.selectedTemplate = foundTemplate !== undefined ? foundTemplate : null;

      const prj: Project = {
        projectId: "",
        title: this.title,
        description: this.description,
        archived: false,
        template: this.selectedTemplate,
        media: [],
        projectsToAccounts: [],
        projectsToCollaborators: [],
        tagsToProjects: [],
        links: this.links,
        requests: [],
        collaboratorNames: [],
        tagNames: [],
        tags: [],
        thumbnail: thumbnail
      };

      if(this.role_on_project == "ADMIN" || this.role_on_project == "EDITOR" || this.role_on_project == "PM") {

      this.removeTags = this.selectedTags.filter(x=>!this.selectedTagNames.includes(x.name));
      this.addTags = this.platformTags.filter(x=>this.selectedTagNames.includes(x.name) && !this.selectedTags.flatMap(x=>x.name).includes(x.name));

      this.removeCollaborators = this.selectedCollaborators.filter(x=>!this.selectedCollaboratorNames.includes(x.name));
      this.addCollaborators = this.platformCollaborators.filter(x=>this.selectedCollaboratorNames.includes(x.name) && !this.selectedCollaborators.flatMap(x=>x.name).includes(x.name));

      const createdProject = await firstValueFrom(this.projectService.editProject(this.projectId, prj));

      for (const collaborator of this.removeCollaborators) {
        await firstValueFrom(this.collaboratorService.deleteCollaboratorFromProject(collaborator,this.projectId))
      }
      for (const collaborator of this.addCollaborators) {
        await firstValueFrom(this.collaboratorService.addCollaboratorToProject(collaborator,this.projectId))
      }
      for (const tag of this.removeTags) {
        await firstValueFrom(this.tagService.removeTagFromProject(tag,this.projectId))
      }
      for (const tag of this.addTags) {
        await firstValueFrom(this.tagService.addTagToProject(tag,this.projectId));
      }


      for (const link of this.links) {
        if(link.linkId == '') {
          await firstValueFrom(this.linkService.addLinkToProject(link, createdProject.projectId))
        } else {
          await firstValueFrom(this.linkService.editLinkOfProject(link))
        }
      }

      for (const link of this.deleteLinkList) {
        await firstValueFrom(this.linkService.deleteLinkById(link.linkId));
      }
      this.deleteLinkList = []
      for (const editMedia of this.editMediaList) {
          if(editMedia.delete && editMedia.media != null && editMedia.media.mediaId!='')
          {
            await firstValueFrom(this.mediaService.deleteMedia(this.projectId,editMedia.media.mediaId).pipe(map(x => x as String)));
          }
          else if(!editMedia.delete && editMedia.media != null && editMedia.file!=null && editMedia.media.mediaId=='')
          {
            const formData = new FormData();
            formData.append('file', editMedia.file);
            formData.append('name', editMedia.media.name);
            await firstValueFrom(this.mediaService.addDocumentToProject(this.project.projectId, formData));
          }
          else if(editMedia.media != null && editMedia.media.mediaId!='')
        {
          await firstValueFrom(this.mediaService.editMedia(editMedia.media));
        }
      }
      this.editMediaList = []
      this.router.navigate(['/project-detail/', this.projectId]) }

      else {
        const req: Request = {
          requestId: "", 
          newTitle: this.title,
          newDescription: this.description,
          isCounterOffer: false,
          project: this.project
        }

        const createdRequest = await firstValueFrom(this.requestService.createRequest(req))

        for(const link of this.links) {
          if(link.linkId == '') {
            const addedLink = await firstValueFrom(this.linkService.addAddedLinkToRequest(createdRequest.requestId, link))
            console.log(addedLink) 
          } else {
            const removedLink = await firstValueFrom(this.linkService.addRemovedLinkToRequest(createdRequest.requestId, link.linkId))
            console.log("removed: " + removedLink)
            const addedLink = await firstValueFrom(this.linkService.addAddedLinkToRequest(createdRequest.requestId, link))
            console.log("added: " + addedLink)
          }
        }

        for(const link of this.deleteLinkList) {
          const removedLink = await firstValueFrom(this.linkService.addRemovedLinkToRequest(createdRequest.requestId, link.linkId))
          console.log("removed: " + removedLink)
        }

        // for(const media of this.deletedMediaList) {
        //   const removedMedia = await firstValueFrom(this.mediaService.addRemovedMediaToRequest(createdRequest.requestId, media.mediaId))
        //   console.log("deleted: " + removedMedia)
        // }

        // for(const media of this.addedMediaList) {
        //   const addedMedia = await firstValueFrom(this.mediaService.addAddedMediaToRequest(createdRequest.requestId, media))
        //   console.log("added: " + addedMedia)
        // }


      

      }
      

    } catch (error) {
      console.error('Error saving project,media or links', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save project or links' });
    }
  }

  cancel(): void {
  }

  isAnyLinkFieldEmpty(): boolean {
    return this.links.some(link => link.name == '' || link.url == '');
  }
  addLink() {
    const link: Link = { linkId: '', name: '', url: '', requestLinkProjects: [] };
    this.links.push(link);
  }

  removeLink(index: number): void {
    this.deleteLinkList.push(this.links[index])
    this.links.splice(index, 1);
  }

   removeMedia(index: number): void {
     this.editMediaList[index].delete=true
   }

  removeTemplate(): void {
    this.selectedTemplateName = ''
    this.selectedTemplate = null;}

  downloadFile(media: MediaFileContent) {
   this.mediaService.downloadFile(media);
  }

  downloadDocument(mediaId: string) {
    let mediaFile: MediaFileContent = {
      fileName: "",
      filePath: "",
      fileContent:""
    };
    this.mediaService.getDocumentContent(mediaId).subscribe({
      next: (data: MediaFileContent) => {
        mediaFile = data;
        this.downloadFile(mediaFile);
      },
      error: (err: any) => {
        console.error('Error fetching media files', err);
      }
    })
  }

  async uploadFile(event: FileUploadHandlerEvent, form: FileUpload) {
    const file = event.files[0];
    this.messageService.add({
      severity: 'info',
      summary: 'Success',
      detail: 'Media added! The media will be uploaded when the edit will be saved!'
    });
    let newMedia: Media = {
      mediaId: '',
      name: file.name,
      path: file.name,
      project: this.project,
      requestMediaProjects: []
    }
    const newEditMedia:EditMedia={
      media:newMedia,
      mediaFileContent:null,
      file:file,
      delete:false
    }
    this.editMediaList.push(newEditMedia);
    form.clear()
  }
  showAddTagDialog() {
    this.addTagVisible = true;
  }
  async saveNewTag(): Promise<void> {
    if (this.newTagName.length == 0) {
      this.messageService.add({severity: 'error', summary: 'Error', detail: 'The Tag Name cannot be empty'});
      return;
    }
    if (this.newTagColor.length == 0) {
      this.messageService.add({severity: 'error', summary: 'Error', detail: 'The Tag Color cannot be empty'});
      return;
    }
    try {
      const newTag:Tag = {
        tagId: "",
        color: "",
        name: "",
        requestTagProjects: [],
        tagsToProjects: []
      }

      newTag.name = this.newTagName;
      newTag.color = this.newTagColor;
      await firstValueFrom(this.tagService.createTag(newTag));
      this.addTagVisible=false
      this.messageService.add({ severity: 'success', summary: 'Success', detail:"The tag was successfully added" });
    }
    catch (error) {
      console.error('Error saving the new tag', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: (error as Error).message });
    }
  }
}
