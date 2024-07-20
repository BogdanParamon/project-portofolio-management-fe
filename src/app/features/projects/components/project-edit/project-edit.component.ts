import { Component , OnInit } from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import {FormControl, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ChipsModule } from 'primeng/chips';
import {
  Collaborator,
  CollaboratorTransfer,
  EditMedia,
  Link,
  Media,
  MediaFileContent,
  Project,
  Tag,
  Template,
  CollaboratorSelectEvent,
  TemplateSelectEvent,
  Request
} from '../../models/project-models';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '../../services/project/project.service';
import {FileUpload, FileUploadHandlerEvent, FileUploadModule} from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import{ MediaService} from "../../services/media/media.service";
import { DropdownModule } from 'primeng/dropdown';
import { Subscription, firstValueFrom, map} from 'rxjs';
import { LinkService } from '../../services/link/link.service';
import { CollaboratorService } from '../../services/collaborator/collaborator.service';
import { TemplateService } from '../../services/template/template.service';
import { TagService } from '../../services/tag/tag.service';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { AccountService } from 'src/app/features/accounts/services/accounts/account.service';
import { StorageService } from 'src/app/features/accounts/services/authentication/storage.service';
import { AuthenticationService } from 'src/app/features/accounts/services/authentication/authentication.service';
import { RequestService } from '../../services/request/request.service';
import {AutoCompleteCompleteEvent, AutoCompleteModule} from "primeng/autocomplete";
import {DataViewModule} from "primeng/dataview";
import {DialogModule} from "primeng/dialog";
import { AccountDisplay } from 'src/app/features/accounts/models/accounts-models';
import { ColorPickerModule } from 'primeng/colorpicker';
import { environment } from 'src/environments/environment';

export interface UsernameSelectEvent{
  value: string;
}

@Component({
  selector: 'app-project-edit',
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.css'],
  standalone: true,
  imports: [FormsModule, InputTextModule, FloatLabelModule,
    InputTextareaModule, ChipsModule, TableModule, TagModule,
    RatingModule, ButtonModule, CommonModule, FileUploadModule,
    DropdownModule, ToastModule, RouterLink, AutoCompleteModule, DataViewModule, DialogModule, ReactiveFormsModule, ColorPickerModule],
  providers: [ProjectService, MessageService]
})

export class ProjectEditComponent implements OnInit {
  APP_URL = environment.APP_URL;
  projectId: string | null = null;
  project!: Project;
  title!: string;
  description!: string;
  newTagName: string = "";
  newTagColor: string = "";
  addTagVisible: boolean = false;
  deleteDialogVisible = false;
  platformCollaborators: Collaborator[] = [];
  projectCollaborators: CollaboratorTransfer[] = []
  editIndexCollaborator: number | null = null;
  editIndexAccount: number | null = null;
  currentUser: string = '';
  selectedCollaboratorNames: string[] = []
  filteredCollaborators: Collaborator[] = []
  removeCollaborators: string[] = []
  selectedCollaborators: CollaboratorTransfer[] = [];
  initialTags: Tag[] = [];

  addCollaboratorVisible: boolean = false;
  newCollaboratorName: string = '';
  newCollaboratorRole: string = '';
  collaboratorNameInput = new FormControl('', [
    Validators.required,
    Validators.pattern('^[a-zA-Z ]{1,50}$')
  ]);
  collaboratorRoleInput = new FormControl('', Validators.required);

  addAccountVisible: boolean = false;
  newAccountUsername: string = '';
  newAccountName: string = '';
  newAccountRole: string = 'CONTENT_CREATOR';
  accountUsernameInput = new FormControl('', Validators.required);
  filteredAccounts: string[] = []
  allAccounts: string[] = []
  currentAccounts: AccountDisplay[] = []
  selectedAccounts: AccountDisplay[] = []
  removeAccounts: string[] = []
  roles: string[] = ['CONTENT_CREATOR', 'EDITOR', 'PM'];
  toBeDeletedTemplateEditMedia: EditMedia[] = [];

  platformTags: Tag[] = [];
  selectedTags: Tag[] = []
  selectedTagNames: string[] = []
  filteredTags: Tag[] = [];
  addTags:Tag[] =[]
  removeTags:Tag[] =[]
  links: Link[] = [];
  templateLinks: Link[] = [];
  templates!: Template[];
  templateNames: string[] = [];
  selectedTemplateName: string | undefined;
  selectedTemplate: Template | undefined ;
  deleteLinkList: Link[] = [];

  editMediaList: EditMedia[] = [];
  editTemplateMediaList: EditMedia[] = [];

  tags: Tag[] | undefined;
  tagnames: string[] | undefined;
  collaboratornames: string[] | undefined;
  collaborators: Collaborator[] = [];
  tagColorInput = new FormControl('', [Validators.required]);
  tagNameInput = new FormControl('', [Validators.required]);

  role_on_project: string = '';
  username: string = '';
  isLoggedIn: boolean = false;
  roleDecided: boolean = false;

  wsProjectsSubscription: Subscription = new Subscription()
  wsCollaboratorsProjectSubscription: Subscription = new Subscription()
  wsCollaboratorsSubscription: Subscription = new Subscription()
  wsTagsProjectSubscription: Subscription = new Subscription()
  wsTagsSubscription: Subscription = new Subscription()
  wsLinksProjectSubscription: Subscription = new Subscription()
  wsMediaProjectSubscription: Subscription = new Subscription()
  wsAccountSubscription: Subscription = new Subscription()


  wsAccountWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/accounts",
    deserializer: msg => String(msg.data)
  })

  projectsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/projects",
    deserializer: msg => String(msg.data)
  })
  collaboratorsProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/collaborators/project",
    deserializer: msg => String(msg.data)
  })
  collaboratorsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/collaborators",
    deserializer: msg => String(msg.data)
  })
  tagsProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/tags/project",
    deserializer: msg => String(msg.data)
  })
  tagsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/tags",
    deserializer: msg => String(msg.data)
  })
  linksProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/link/project",
    deserializer: msg => String(msg.data)
  })
  mediaProjectWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/media/project",
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

  ngOnDestroy(): void {
    if (this.wsTagsSubscription)
      this.wsTagsSubscription.unsubscribe()
    if (this.wsCollaboratorsSubscription)
      this.wsCollaboratorsSubscription.unsubscribe()
    if (this.wsAccountSubscription)
      this.wsAccountSubscription.unsubscribe()
    if(this.wsTagsProjectSubscription)
      this.wsTagsProjectSubscription.unsubscribe()
    if(this.wsCollaboratorsProjectSubscription)
      this.wsCollaboratorsProjectSubscription.unsubscribe()
  }

  async ngOnInit() {

    console.log("OnInitCalleed")

    this.isLoggedIn = this.storageService.isLoggedIn();
    this.projectId = this.route.snapshot.paramMap.get('id');
     if(this.isLoggedIn) {

       this.username = this.storageService.getUser();
       try {
         const role = await this.authenticationService.getRole(this.username).toPromise();
         if(role && role != this.storageService.getRole()) {
           this.storageService.saveRole(role);
         }

         if(this.storageService.getRole() === "ROLE_ADMIN") {
           this.role_on_project = "ADMIN";
           this.roleDecided = true;
         }

         console.log(this.projectId)
         if(this.projectId && !this.roleDecided) {
          const newRole = await firstValueFrom(this.accountService.getRoleOnProject(this.username, this.projectId))
          this.role_on_project = newRole
          if(this.role_on_project == '')
            console.log("not loaded")
          console.log(this.role_on_project)
        }
       }
       catch (error) {
         console.error('Error fetching role, waiting took too long', error);
       }
     }
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
            this.collaboratornames = newCollaborators.map(x => x.name)
          }
        }
      }
     )

     this.wsAccountSubscription = this.wsAccountWebSocket.subscribe(
      async () => {
        this.allAccounts = await firstValueFrom(this.accountService.getAllUsernames())
      }
    )

     this.wsTagsProjectSubscription = this.tagsProjectWebSocket.subscribe(
      async msg => {
        if(msg == "all" || msg == this.projectId) {
          if(this.projectId){
            const newTags  = await this.getTagsByProjectId(this.projectId)
            this.tags = newTags
            this.tagnames = newTags.map(x => x.name);
            this.selectedTags = newTags;
            this.selectedTagNames = newTags.map(x => x.name);
          }
        }
      }
     )

     this.wsMediaProjectSubscription = this.mediaProjectWebSocket.subscribe(
      async msg => {
        if(msg == "all" || msg == this.projectId) {
          if(this.projectId){
            this.editMediaList=[]
            this.editTemplateMediaList=[]
            const newMedia = await this.getDocumentsByProjectId(this.projectId)
            for (const mediaObject of newMedia) {
            {
              const editMedia:EditMedia = {
                media:mediaObject,
                mediaFileContent:null,
                file:null,
                delete:false
              }
              if (this.selectedTemplate != undefined) {
                if (this.selectedTemplate.templateAdditions.some(addition => addition.templateAdditionName === mediaObject.name)) {
                  this.editTemplateMediaList.push(editMedia)
                } else {
                  this.editMediaList.push(editMedia)
                }
              } else {
                this.editMediaList.push(editMedia)
              }
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
            this.links=[]
            this.templateLinks=[]
            const newLinks = await this.getLinksByProjectId(this.projectId)
            for (const linkObject of newLinks) {
              if (this.selectedTemplate != undefined) {
                if (this.selectedTemplate.templateAdditions.some(addition => addition.templateAdditionName === linkObject.name)) {
                  this.templateLinks.push(linkObject)
                } else {
                  this.links.push(linkObject)
                }
              } else {
                this.links.push(linkObject)
              }
            }
          }
        }
      }
     )

     this.wsCollaboratorsSubscription = this.collaboratorsWebSocket.subscribe(
      async () => {
        const newCollaborators = await this.getAllCollaborators()
        this.collaborators = newCollaborators
      }
    )

    this.wsTagsSubscription = this.tagsWebSocket.subscribe(
      async msg => {
        if(msg == "tag added") {
          this.platformTags = await this.getAllTags();
        }
      }
    )


     //should define here the collaborators websocket such that it updates autocomplete
     //as in project-add components. The autocomplete is done on dev, we do it after we merge this with dev
     
     
    

  }

  async initializeFields() {
    
    this.templates = await this.getAllTemplates();
    this.templateNames = await this.getAllTemplateNames();
    this.platformTags = await this.getAllTags();
    this.collaborators = await this.getAllCollaborators()
    this.platformCollaborators = await this.getAllCollaborators()
    if(this.role_on_project == "PM" || this.role_on_project == "ADMIN"){
    this.allAccounts = await firstValueFrom(this.accountService.getAllUsernames())}
    this.currentUser = this.storageService.getUser()

    if (this.projectId) {
      this.selectedTemplate = await firstValueFrom(this.projectService.getTemplateByProjectId(this.projectId));
      if (this.selectedTemplate != undefined) {
        this.selectedTemplateName = this.selectedTemplate.templateName
      }
      this.templateLinks = [];
      this.links = [];
      this.linkService.getLinksByProjectId(this.projectId).subscribe((response: Link[]) => {
        for (const linkObject of response) {
          if (this.selectedTemplate != undefined) {
            if (this.selectedTemplate.templateAdditions.some(addition => addition.templateAdditionName === linkObject.name)) {
              this.templateLinks.push(linkObject)
            } else {
              this.links.push(linkObject)
            }
          } else {
            this.links.push(linkObject)
          }
        }
      });
      this.mediaService.getDocumentsByProjectId(this.projectId).subscribe((response: Media[]) => {
        this.editMediaList = [];
        this.editTemplateMediaList = [];
        for (const mediaObject of response) {
          {
            const editMedia:EditMedia = {
              media:mediaObject,
              mediaFileContent:null,
              file:null,
              delete:false
            }
            if (this.selectedTemplate != undefined) {
              if (this.selectedTemplate.templateAdditions.some(addition => addition.templateAdditionName === mediaObject.name)) {
                this.editTemplateMediaList.push(editMedia)
              } else {
                this.editMediaList.push(editMedia)
              }
            } else {
              this.editMediaList.push(editMedia)
            }
          }
        }
      });

      this.projectService.getProjectById(this.projectId).subscribe((response: Project) => {
        this.project = response;
        this.title = this.project.title;
        this.description = this.project.description;
      });
      this.tagService.getTagsByProjectId(this.projectId).subscribe((response: Tag[]) => {
        this.tags = response;
        this.initialTags = response;
        this.tagnames = this.tags.map(x => x.name);
        this.selectedTags = this.tags;
        this.selectedTagNames = this.tagnames;
      });
      this.collaboratorService.getCollaboratorsByProjectId(this.projectId).subscribe((response: CollaboratorTransfer[]) => {
        this.projectCollaborators = response;
        this.selectedCollaboratorNames = this.projectCollaborators.map(x => x.name);
        this.selectedCollaborators = [...this.projectCollaborators];
      });
    if(this.role_on_project == "PM" || this.role_on_project == "ADMIN"){
      this.accountService.getAccountsInProject(this.projectId).subscribe((response: AccountDisplay[]) => {
        this.currentAccounts = response.filter(account => account.username !== this.currentUser);
      });}
    } else {
      console.error('Project ID is null');
    }
  }
  async getAllTags(): Promise<Tag[]> {
    return firstValueFrom(this.tagService.getAllTags());
  }
  getAllCollaborators(): Promise<Collaborator[]> {
    return firstValueFrom(this.collaboratorService.getAllCollaborators());
  }

  async getProjectById(id: string): Promise<Project> {
    return firstValueFrom(this.projectService.getProjectById(id));
  }
  getNamesForCollaborators(collaborators: Collaborator[]): string[] {
    return collaborators.map(x => x.name);
  }

  async getCollaboratorsByProjectId(id: string): Promise<CollaboratorTransfer[]> {
    return firstValueFrom(this.collaboratorService.getCollaboratorsByProjectId(id));
  }

  filterCollaborators(event: unknown) {
    const query = (event as AutoCompleteCompleteEvent).query.toLowerCase();
    this.filteredCollaborators = this.collaborators
      .filter(collaborator => collaborator.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  filterAccounts(event: unknown) {
    const query = (event as AutoCompleteCompleteEvent).query.toLowerCase();
    const selectedUsernames = this.selectedAccounts.map(account => account.username.toLowerCase());
    const existingUsernames = this.currentAccounts.map(account => account.username.toLowerCase());
    const currentUser = this.currentUser.toLowerCase();

    this.filteredAccounts = this.allAccounts
        .filter(account =>
            !selectedUsernames.includes(account.toLowerCase()) &&
            !existingUsernames.includes(account.toLowerCase()) &&
            account.toLowerCase().startsWith(query) &&
            account.toLowerCase() !== currentUser
        );
}


  getNamesForTags(tags: Tag[]): string[] {
    return tags.map(x => x.name)
  }
  filterTags(event: unknown) {
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

  isTitleDescriptionAndMediaValid(): boolean{
    return this.title.length > 0 && this.description.length > 0
    && (this.editMediaList.length > 0 || this.editTemplateMediaList.length > 0)
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

    if(!this.isTitleDescriptionAndMediaValid()) {
      if(this.title.length == 0){
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Title can not be empty' });
        return;
      }
      if(this.description.length == 0){
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Description can not be empty' });
        return;
      }
      if(this.editMediaList.length == 0 && this.editTemplateMediaList.length == 0){
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Media can not be empty' });
        return
      }

      return;
    }

    for (const editMed of this.editMediaList) {
      if(editMed.media!.name.length < 1 || editMed.media?.path == '') {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Media can not have an empty display name' });
        return
      }
    }
    for (const editTempMed of this.editTemplateMediaList) {
      if(editTempMed.media!.name.length < 1 || editTempMed.media?.path == '') {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Template Media can not have an empty display name' });
        return
      }
    }
    for (const link of this.links) {
      if(link.name.length < 1) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Links can not have an empty title' });
        return
      }
      if(link.url.length < 1) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Links can not have an empty url' });
        return
      }
    }

    for (const link of this.templateLinks) {
      if(link.name.length < 1) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Template links can not have an empty title' });
        return
      }
      if(link.url.length < 1) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Template links can not have an empty url' });
        return
      }
    }

    try {
      const thumbnail: MediaFileContent = {
        filePath: '',
        fileContent: '',
        fileName:''
      }

      let templateToBeAdded = null;
      if (this.selectedTemplate != undefined) templateToBeAdded = this.selectedTemplate;


      const prj: Project = {
        projectId: "",
        title: this.title,
        description: this.description,
        archived: false,
        template: templateToBeAdded,
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

      // this.removeCollaborators = this.selectedCollaborators.filter(x=>!this.selectedCollaboratorNames.includes(x.name));
      // this.addCollaborators = this.platformCollaborators.filter(x=>this.selectedCollaboratorNames.includes(x.name) && !this.selectedCollaborators.flatMap(x=>x.name).includes(x.name));
      this.removeTags = this.initialTags.filter(tag => !this.selectedTags.includes(tag));
      this.addTags = this.selectedTags.filter(tag => !this.initialTags.includes(tag));

      // this.removeTags = this.selectedTags.filter(x=>!this.selectedTagNames.includes(x.name));
      // this.removeTags = this.tags.filter(x=>!this.selectedTags.includes(x));
      // this.addTags = this.platformTags.filter(x=>this.selectedTagNames.includes(x.name) && !this.selectedTags.flatMap(x=>x.name).includes(x.name));
      // this.removeCollaborators = this.projectCollaborators.filter(x=>!this.selectedCollaboratorNames.includes(x.name)).map(x => x.collaboratorId);
      // this.addCollaborators = this.platformCollaborators.filter(x=>this.selectedCollaboratorNames.includes(x.name) && !this.projectCollaborators.flatMap(x=>x.name).includes(x.name));

      
      if(this.role_on_project == "ADMIN" || this.role_on_project == "EDITOR" || this.role_on_project == "PM") {

      const createdProject = await firstValueFrom(this.projectService.editProject(this.projectId, prj));

      console.log(this.editTemplateMediaList)
      if (this.selectedTemplate == undefined) {
        firstValueFrom(this.projectService.removeTemplateFromProject(createdProject.projectId, "delete-template"))
      } else {
        firstValueFrom(this.projectService.updateProjectTemplate(createdProject.projectId, this.selectedTemplate))
      }


    
      for (const collaborator of this.removeCollaborators) {
        await firstValueFrom(this.collaboratorService.deleteCollaboratorFromProject(this.projectId, collaborator))
      }
      for (const collaborator of this.selectedCollaborators) {
        await firstValueFrom(this.collaboratorService.createAndAddCollaboratorToProject(collaborator,this.projectId))
      }
      for (const account of this.removeAccounts) {
        await firstValueFrom(this.accountService.deleteRoleOnProject(account,this.projectId))
      }
      for (const account of this.selectedAccounts) {
        await firstValueFrom(this.accountService.addRoleOnProject(account.username,this.projectId,account.roleInProject))
      }
      for (const account of this.currentAccounts) {
        await firstValueFrom(this.accountService.updateRoleOnProject(account.username,this.projectId,account.roleInProject))
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
          await firstValueFrom(this.linkService.editLinkOfProject(link, this.projectId))
        }
      }
      this.links = []

      for (const link of this.templateLinks) {
        if(link.linkId == '') {
          await firstValueFrom(this.linkService.addLinkToProject(link, createdProject.projectId))
        } else {
          await firstValueFrom(this.linkService.editLinkOfProject(link, this.projectId))
        }
      }
      this.templateLinks = []

      for (const link of this.deleteLinkList) {
        firstValueFrom(this.linkService.deleteLinkById(link.linkId, this.projectId));
      }
      this.deleteLinkList = []


      for (const editMedia of this.editMediaList) {
          if(editMedia.delete && editMedia.media != null && editMedia.media.mediaId!='')
          {
            await firstValueFrom(this.mediaService.deleteMedia(this.projectId,editMedia.media.mediaId).pipe(map(x => x as string)));
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



      for (const editMedia of this.editTemplateMediaList) {
        if(editMedia.delete && editMedia.media != null && editMedia.media.mediaId!='')
        {
          await firstValueFrom(this.mediaService.deleteMedia(this.projectId,editMedia.media.mediaId).pipe(map(x => x as string)));
        }
        else if(!editMedia.delete && editMedia.media != null && editMedia.file!=null && editMedia.media.mediaId=='')
        {
          const formData = new FormData();
          formData.append('file', editMedia.file);
          formData.append('name', editMedia.media.name);
          await firstValueFrom(this.mediaService.addDocumentToProject(this.project.projectId, formData));
        }
        else if(editMedia.media != null && editMedia.file!=null && editMedia.media.mediaId!='') {
          const formData = new FormData();
          formData.append('file', editMedia.file);
          await firstValueFrom(this.mediaService.editMediaTemplate(editMedia.media.mediaId,formData));
        }
        else if(editMedia.media != null && editMedia.media.mediaId!='') {
          await firstValueFrom(this.mediaService.editMedia(editMedia.media));
        }
      }
      this.editTemplateMediaList = []
      this.editMediaList = []
      this.router.navigate(['/project-detail/', this.projectId]) 
    } else {
        const req: Request = {
          requestId: "", 
          newTitle: this.title,
          newDescription: this.description,
          isCounterOffer: false,
          project: this.project,
          account: {
            username: this.username,
            name: "",
            password: "",
            role: "ROLE_USER",
            projectsToAccounts: [],
            requests: []
          },
          requestTagProjects: [],
          requestMediaProjects: [],
          requestLinkProjects: [],
          requestCollaboratorsProjects: []
        }

        const createdRequest = await firstValueFrom(this.requestService.createRequest(req))

        for(const link of this.links) {
          if(link.linkId == '') {
            const addedLink = await firstValueFrom(this.linkService.addAddedLinkToRequest(createdRequest.requestId, link, this.projectId))
            console.log(addedLink) 
          } else {
            const removedLink = await firstValueFrom(this.linkService.addRemovedLinkToRequest(createdRequest.requestId, link.linkId, this.projectId))
            console.log("removed: " + removedLink)
            const addedLink = await firstValueFrom(this.linkService.addAddedLinkToRequest(createdRequest.requestId, link, this.projectId))
            console.log("added: " + addedLink)
          }
        }

        for(const link of this.deleteLinkList) {
          const removedLink = await firstValueFrom(this.linkService.addRemovedLinkToRequest(createdRequest.requestId, link.linkId, this.projectId))
          console.log("removed: " + removedLink)
        }

        this.deleteLinkList = []

        

        

      console.log(this.selectedCollaborators)

      console.log(this.addTags)

      for(const tag of this.addTags) {
        await firstValueFrom(this.tagService.addTagToRequest(createdRequest.requestId, tag.tagId, false, this.projectId))
      }

      console.log(this.removeTags)

      for (const tag of this.removeTags) {
        await firstValueFrom(this.tagService.addTagToRequest(createdRequest.requestId, tag.tagId, true, this.projectId))
      }


      for (const editMedia of this.editMediaList) {
        if(editMedia.delete && editMedia.media != null && editMedia.media.mediaId!='')
        {
          await firstValueFrom(this.mediaService.addRemovedMediaToRequest(createdRequest.requestId,editMedia.media.mediaId, this.projectId));
        }
        else if(!editMedia.delete && editMedia.media != null && editMedia.file!=null && editMedia.media.mediaId=='')
        {
          const formData = new FormData();
          formData.append('file', editMedia.file);
          formData.append('name', editMedia.media.name);
          await firstValueFrom(this.mediaService.addAddedMediaToRequest(createdRequest.requestId, formData, this.projectId));
        }
        else if(editMedia.media != null && editMedia.media.mediaId!='')
      {
        // await firstValueFrom(this.mediaService.addRemovedMediaToRequest(createdRequest.requestId, editMedia.media.mediaId));
        // await firstValueFrom(this.mediaService.addAddedMediaToRequest(createdRequest.requestId, editMedia.media))
      }
    }
    this.editMediaList = []
    this.router.navigate(['/project-detail/', this.projectId])
      }
      

    } catch (error) {

      if((error as Error).message.includes("409 OK")) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'You already have an open request for this project!' });
      }
      else {
      console.error('Error saving project,media or links', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save project or links' });}
    }
  }

  cancel(): void {
    this.router.navigateByUrl(this.APP_URL + "/project-detail/" + this.projectId);
  }

  isAnyLinkFieldEmpty(): boolean {
    return this.links.some(link => link.name == '' || link.url == '') || this.templateLinks.some(link => link.name == '' || link.url == '');
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

  clearTemplateFields() {
    for (const link of this.templateLinks) {
      if (link.url != '')
        this.links.push(link)
    }
    for (const editTempMed of this.editTemplateMediaList) {
      if (!this.editMediaList.some(m => m.media!.name == editTempMed.media!.name)) {
        if (editTempMed.media != null && editTempMed.media.mediaId!='') {
          this.editMediaList.push(editTempMed);
        }
      }
    }
    this.selectedTemplateName = undefined;
    this.selectedTemplate = undefined;
    this.templateLinks = [];
    this.editTemplateMediaList = [];
  }

  downloadFile(media: MediaFileContent) {
   this.mediaService.downloadFile(media);
  }

  async downloadDocument(mediaId: string) {
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
      error: (err: unknown) => {
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
    const newMedia: Media = {
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

  changeTemplateMedia(event: FileUploadHandlerEvent, form: FileUpload, index: number) {
      const newMediaId: string = this.editTemplateMediaList[index].media?.mediaId || "";
      const file = event.files[0];
      this.messageService.add({
        severity: 'info',
        summary: 'Success',
        detail: 'Media changed successfully! The media will be saved when the save button is clicked!'
      });
      const newMedia: Media = {
        mediaId: newMediaId,
        name: this.editTemplateMediaList[index].media!.name,
        path: file.name,
        project: this.project,
        requestMediaProjects: []
      }
      const newEditMedia: EditMedia = {
        media: newMedia,
        mediaFileContent: null,
        file: file,
        delete: false
      }
      this.editTemplateMediaList[index] = newEditMedia
      form.clear()
  }

  uploadEmptyTemplateMedia(mediaName: string) {
    const file = null;
    this.messageService.add({severity: 'info', summary: 'Success', detail: 'Media changed successfully! The media will be saved when the save button is clicked!'});
    const newMedia:Media = {
      mediaId:'',
      name: mediaName,
      path: '',
      project:this.project,
      requestMediaProjects:[]
    }
    const newEditMedia:EditMedia={
      media:newMedia,
      mediaFileContent:null,
      file:file,
      delete:false
    }
    this.editTemplateMediaList.push(newEditMedia);
  }

  addTemplateLink(nameOfLink: string) {
    const foundLink = this.links.find(link => link.name === nameOfLink)
    if (foundLink != undefined) {
      const index = this.links.findIndex(l => l == foundLink);
      this.links.splice(index, 1);
      this.templateLinks.push(foundLink);
    } else {
      const link: Link = { linkId: '', name: nameOfLink, url: '', requestLinkProjects: [] };
      this.templateLinks.push(link);
    }
  }

  onTemplateSelect(event: TemplateSelectEvent) {
    this.clearTemplateFields()
    this.selectedTemplateName = event.value;
    this.selectedTemplate = this.templates.find(template => template.templateName === this.selectedTemplateName);

    if(this.selectedTemplate != undefined) {
      this.description = this.selectedTemplate.standardDescription;
      this.selectedTemplate.templateAdditions.forEach(addition => {
        if (addition.media === true) {
          this.uploadEmptyTemplateMedia(addition.templateAdditionName);
        } else {
          this.addTemplateLink(addition.templateAdditionName)
        }
      });
    }
  }

  showAddCollaboratorDialog() {
    this.addCollaboratorVisible = true;
  }

  onCollaboratorSelect(event: CollaboratorSelectEvent) {
    const selectedCollaborator = event.value;
    this.newCollaboratorName = selectedCollaborator.name;
    this.collaboratorNameInput.setValue(selectedCollaborator.name);
  }

  editCollaborator(collaborator: CollaboratorTransfer, index: number) {
    this.newCollaboratorName = collaborator.name;
    this.newCollaboratorRole = collaborator.role;
    this.editIndexCollaborator = index;
    this.showAddCollaboratorDialog();
  }

  removeCollaborator(index: number) {
    const collaborator = this.selectedCollaborators[index];
    if (collaborator.collaboratorId) {
      this.removeCollaborators.push(collaborator.collaboratorId);
      collaborator.collaboratorId = '';
    }
    this.selectedCollaborators.splice(index, 1);
  }

  saveNewCollaborator() {
    if (this.collaboratorNameInput.invalid || this.collaboratorRoleInput.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid collaborator name or role' });
      return;
    }

    const isDuplicate = this.selectedCollaborators.some((collaborator, index) =>
      collaborator.name.toLowerCase() === this.newCollaboratorName.toLowerCase() && index !== this.editIndexCollaborator
    );

    if (isDuplicate) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'A collaborator with the same name already exists' });
      return;
    }
    if (this.editIndexCollaborator !== null) {
      const collaborator = this.selectedCollaborators[this.editIndexCollaborator];
      if (collaborator && collaborator.collaboratorId) {
        this.removeCollaborators.push(collaborator.collaboratorId);
      }
      collaborator.name = this.newCollaboratorName;
      collaborator.role = this.newCollaboratorRole;
    } else {
      const newCollaborator: CollaboratorTransfer = {
        collaboratorId: '',
        name: this.newCollaboratorName,
        role: this.newCollaboratorRole
      };
      this.selectedCollaborators.push(newCollaborator);
    }

    this.newCollaboratorName = '';
    this.newCollaboratorRole = '';
    this.editIndexCollaborator = null;
    this.addCollaboratorVisible = false;
  }

  cancelAddCollaborator() {
    this.addCollaboratorVisible = false;
    this.newCollaboratorName = '';
    this.newCollaboratorRole = '';
    this.collaboratorNameInput.reset();
    this.collaboratorRoleInput.reset();
    this.editIndexCollaborator = null;
  }

  changeRole(account: AccountDisplay, newRole: string) {
    if(account.roleInProject === newRole) {
      return;
    }
    account.roleInProject = newRole;
  }

  removeCurrentAccount(account: AccountDisplay) {
    if (confirm('Are you sure you want to remove ' + account.username + ' from the project?')) {
      this.currentAccounts = this.currentAccounts.filter(acc => acc.username !== account.username);
      this.removeAccounts.push(account.username);
    }
  }

  onAccountSelect(event: UsernameSelectEvent) {
    this.newAccountUsername = event.value;
    this.accountUsernameInput.setValue(this.newAccountUsername);
  }

  showAddAccountDialog() {
    this.addAccountVisible = true;
  }

  editAccount(account: AccountDisplay, index: number) {
    this.newAccountUsername = account.username;
    this.newAccountRole = account.roleInProject;
    this.editIndexAccount = index;
    this.showAddAccountDialog();
  }

  removeAccount(index: number) {
    this.selectedAccounts.splice(index, 1);
  }

  async saveNewAccount() {
    if (this.accountUsernameInput.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid account username' });
      return;
    }

    const isDuplicate = this.selectedAccounts.some((account, index) =>
      account.username.toLowerCase() === this.newAccountUsername.toLowerCase() && index !== this.editIndexAccount
    );

    if (isDuplicate) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An account with the same username already exists' });
      return;
    }

    const newAccount: AccountDisplay = {
      username: this.newAccountUsername,
      name: '',
      roleInProject: this.newAccountRole,
    };

    if (this.editIndexAccount !== null) {
      this.selectedAccounts[this.editIndexAccount] = newAccount;
      this.editIndexAccount = null;
    } else {
      this.selectedAccounts.push(newAccount);
    }

    this.addAccountVisible = false;
    this.newAccountUsername = '';
    this.newAccountRole = 'CONTENT_CREATOR'
    this.accountUsernameInput.reset();
  }

  cancelAddAccount() {
    this.addAccountVisible = false;
    this.newAccountUsername = '';
    this.newAccountRole = 'CONTENT_CREATOR'
    this.accountUsernameInput.reset();
    this.editIndexAccount = null;
  }

  isDarkColor(color: string): boolean {
    return this.tagService.isDarkColor(color);
  }

  showDeleteDialog(): void {
    this.deleteDialogVisible = true;
  }

  isPM(): boolean {
    return this.role_on_project == "PM" || this.role_on_project == "ADMIN"
  }

}
