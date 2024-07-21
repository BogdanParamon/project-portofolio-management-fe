import { ChangeDetectorRef, Component , OnDestroy, OnInit } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { FormControl, FormsModule, Validators } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ChipsModule } from 'primeng/chips';
import { Collaborator, Link, Media, Project, Tag, Template, CollaboratorSelectEvent, TemplateSelectEvent } from '../../models/project-models';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '../../services/project/project.service';
import { TemplateService } from '../../services/template/template.service';
import {FileUpload, FileUploadHandlerEvent, FileUploadModule} from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { Subscription, firstValueFrom, map } from 'rxjs';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ChipModule } from 'primeng/chip';
import { ReactiveFormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { MediaService } from '../../services/media/media.service';
import { LinkService } from '../../services/link/link.service';
import { CollaboratorService } from '../../services/collaborator/collaborator.service';
import { TagService } from '../../services/tag/tag.service';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import {DialogModule} from "primeng/dialog";
import {Router} from "@angular/router";
import { AccountService } from 'src/app/features/accounts/services/accounts/account.service';
import { CollaboratorTransfer } from '../../models/project-models';
import { AccountDisplay } from 'src/app/features/accounts/models/accounts-models';
import { StorageService } from 'src/app/features/accounts/services/authentication/storage.service';
import { ColorPickerModule } from 'primeng/colorpicker';
import { environment } from 'src/environments/environment';

export interface UsernameSelectEvent{
  value: string;
}



@Component({
  selector: 'app-project-add',
  templateUrl: './project-add.component.html',
  styleUrls: ['./project-add.component.css'],
  standalone: true,
  imports: [FormsModule, InputTextModule, FloatLabelModule,
    InputTextareaModule, ChipsModule, TableModule, TagModule,
    RatingModule, ButtonModule, CommonModule, FileUploadModule,
    DropdownModule, ToastModule, AutoCompleteModule, ChipModule, ReactiveFormsModule, DataViewModule, DialogModule,
    ColorPickerModule
  ],
  providers: [ProjectService, MessageService]

})
export class ProjectAddComponent implements OnInit, OnDestroy {

  APP_URL = environment.APP_URL;
  media: Media[] = [];
  templateMedia: Media[] = []
  mediaNames: string[] = [];
  addTagVisible: boolean = false;
  project!: Project;
  title: string = '';
  description: string = '';
  tags: Tag[] = [];
  newTagName: string = "";
  newTagColor: string = "";
  selectedTags: Tag[] = []
  collaborators: Collaborator[] = []
  tagNames: string[] = [];
  selectedCollaborators: CollaboratorTransfer[] = []
  editIndexCollaborator: number | null = null;
  editIndexAccount: number | null = null;
  currentUser: string = '';
  links: Link[] = [];
  templateLinks: Link[] = [];
  templates!: Template[];
  templateNames: string[] = [];
  selectedTemplateName: string | undefined;
  currentTemplate: Template | undefined;
  filteredTags: Tag[] = [];
  filteredCollaborators: Collaborator[] = []
  titleInput = new FormControl('', [Validators.required]);
  tagColorInput = new FormControl('', [Validators.required]);
  tagNameInput = new FormControl('', [Validators.required]);
  descriptionInput = new FormControl('', [Validators.required]);
  addedMediaList: FormData[] = [];
  templateMediaNames: string[] = [];

  addedTemplateMediaList: FormData[] = [];
  deleteDialogVisible = false;
  showHelp: boolean = false;

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
  allAccounts: string[] = [];
  filteredAccounts: string[] = [];
  selectedAccounts: AccountDisplay[] = []
  roles: { label: string, value: string }[] = [
    { label: 'Project Manager', value: 'PM' },
    { label: 'Editor', value: 'EDITOR' },
    { label: 'Content Creator', value: 'CONTENT_CREATOR' },
  ];

  wsTagsSubscription: Subscription = new Subscription()
  wsCollaboratorsSubscription: Subscription = new Subscription()
  wsAccountSubscription: Subscription = new Subscription()

  wsAccountWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/accounts",
    deserializer: msg => String(msg.data)
  })

  tagsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/tags",
    deserializer: msg => String(msg.data)
  })
  collaboratorsWebSocket: WebSocketSubject<string> = webSocket({
    url: environment.API_URL.replace('http', 'ws') + "/topic/collaborators",
    deserializer: msg => String(msg.data)
  })

  constructor(
    private projectService: ProjectService,
    private messageService: MessageService,
    private mediaService: MediaService,
    private templateService: TemplateService,
    private linkService: LinkService,
    private collaboratorService: CollaboratorService,
    private tagService: TagService,
    private accountService: AccountService,
    private storageService: StorageService,
    private readonly router: Router,
    private cd: ChangeDetectorRef
  ) {
  }

  ngOnDestroy(): void {
    if (this.wsTagsSubscription)
      this.wsTagsSubscription.unsubscribe()
    if (this.wsCollaboratorsSubscription)
      this.wsCollaboratorsSubscription.unsubscribe()
    if (this.wsAccountSubscription)
      this.wsAccountSubscription.unsubscribe()
  }

  async ngOnInit() {

    await this.initializeFields()

    this.wsTagsSubscription = this.tagsWebSocket.subscribe(
      async msg => {
        const words = msg.split(" ")
        if (words[0] == "deleted") {
          const tag = this.tags.filter(x => x.tagId == words[1])[0]
          if (this.selectedTags.includes(tag))
            this.selectedTags.splice(this.selectedTags.indexOf(tag), 1)
        }
        const newTags = await this.getAllTags();
        this.tags = newTags
        this.tagNames = newTags.map(x => x.name)
        this.filteredTags = newTags
      }
    )

    this.wsCollaboratorsSubscription = this.collaboratorsWebSocket.subscribe(
      async () => {
        const newCollaborators = await this.getAllCollaborators()
        this.collaborators = newCollaborators
      }
    )

    this.wsAccountSubscription = this.wsAccountWebSocket.subscribe(
      async () => {
        this.allAccounts = await firstValueFrom(this.accountService.getAllUsernames())
      }
    )

    this.selectedTags = []
    this.selectedCollaborators = []
    this.titleInput.setValue("")
    this.descriptionInput.setValue("")
  }

  async initializeFields() {
    this.tags = await this.getAllTags();
    this.tagNames = this.tags.map(x => x.name)
    this.filteredTags = this.tags
    this.templates = await this.getAllTemplates()
    this.templateNames = await this.getAllTemplateNames()
    this.collaborators = await this.getAllCollaborators()
    this.allAccounts = await firstValueFrom(this.accountService.getAllUsernames())
    this.currentUser = this.storageService.getUser()
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

  filterTags(event: unknown) {
    const query = (event as AutoCompleteCompleteEvent).query
    this.filteredTags = this.tags.filter(tag => tag.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
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
    const currentUser = this.currentUser.toLowerCase();

    this.filteredAccounts = this.allAccounts
        .filter(account => 
            !selectedUsernames.includes(account.toLowerCase()) &&
            account.toLowerCase().startsWith(query) && 
            account.toLowerCase() !== currentUser
        );
}




  onTemplateSelect(event: TemplateSelectEvent) {
    this.clearTemplateFields()
    this.selectedTemplateName = event.value;
    this.currentTemplate = this.templates.find(template => template.templateName === this.selectedTemplateName);
    console.log(this.currentTemplate?.templateName)
    if(this.currentTemplate != undefined) {
      this.description = this.currentTemplate.standardDescription;
      this.currentTemplate.templateAdditions.forEach(addition => {
        if (addition.media === true) {
          this.uploadTemplateFile(addition.templateAdditionName);
        } else {
          this.addTemplateLink(addition.templateAdditionName)
        }
      });
    }
  }

  clearTemplateFields() {
    this.selectedTemplateName = undefined;
    this.currentTemplate = undefined;
    this.description = '';
    this.templateLinks = [];
    this.templateMedia = [];
    this.templateMediaNames = [];
    this.addedTemplateMediaList = [];
  }

  async saveNewTag(): Promise<void> {
    if (this.newTagName.length == 0) {
      this.messageService.add({severity: 'error', summary: 'Error', detail: 'Please select a Tag Name'});
      return;
    }
    if (this.newTagColor.length == 0) {
      this.messageService.add({severity: 'error', summary: 'Error', detail: 'Please select a Tag Color'});
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
      this.addTagVisible=false;
      this.messageService.add({ severity: 'success', summary: 'Success', detail:"The tag was successfully added" });
    }
    catch (error) {
      console.error('Error saving the new tag', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: (error as Error).message });
    }
  }

  async saveProject(): Promise<void> {

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
      if(this.media.length == 0 && this.templateMedia.length == 0){
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Media can not be empty' });
        return
      }
      for (const medianName of this.mediaNames) {
        if(medianName.length < 1) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Media can not have an empty display name' });
          return
        }
      }
      for (const medianName of this.templateMediaNames) {
        if(medianName.length < 1) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Media can not have an empty display name' });
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

      return;
    }
    try {
      this.titleInput.setErrors({ invalid: false });
      this.descriptionInput.setErrors({ invalid: false });
      let templateToBeAdded = null;
      if (this.currentTemplate != undefined) templateToBeAdded = this.currentTemplate;
      console.log(templateToBeAdded?.templateName)
      const project: Project = {
        projectId: "",
        title: this.title,
        description: this.description,
        archived: false,
        template: templateToBeAdded,
        media: [],
        projectsToAccounts: [],
        projectsToCollaborators: [],
        tagsToProjects: [],
        links: [],
        requests: [],
        collaboratorNames: [],
        tagNames: [],
        tags: [],
        thumbnail:undefined
      };

      const createdProject = await firstValueFrom(this.projectService.createProject(project));

      this.title = ""
      this.description = ""

      if (this.currentTemplate != undefined) {
        await firstValueFrom(this.projectService.updateProjectTemplate(createdProject.projectId, this.currentTemplate))
      } 

      for (const link of this.links) {
        await firstValueFrom(this.linkService.addLinkToProject(link, createdProject.projectId))
      }
      this.links = []


      for (const link of this.templateLinks) {
        await firstValueFrom(this.linkService.addLinkToProject(link, createdProject.projectId))
      }
      this.templateLinks = []

      // const finalCollaborators = this.collaborators.filter(x => this.selectedCollaborators.includes(x.name))
      for(const collaborator of this.selectedCollaborators) {
        await firstValueFrom(this.collaboratorService.createAndAddCollaboratorToProject(collaborator, createdProject.projectId))
      }

      for(const account of this.selectedAccounts) {
        await firstValueFrom(this.accountService.addRoleOnProject(account.username, createdProject.projectId, account.roleInProject))
      }

      this.selectedCollaborators = []

      const finalTags = this.tags.filter(x => this.selectedTags.includes(x));

      for(const tag of finalTags) {
        await firstValueFrom(this.tagService.addTagToProject(tag, createdProject.projectId))
      }

      this.selectedTags = []

      for (const [index, media] of this.addedMediaList.entries()) {
        media.append('name', this.media[index].name);
        await firstValueFrom(this.mediaService.addDocumentToProject(createdProject.projectId, media));
      }
      this.addedMediaList = []
      this.media = []

      for (const [index, templateMedia] of this.addedTemplateMediaList.entries()) {
        templateMedia.append('name', this.templateMedia[index].name);
        await firstValueFrom(this.mediaService.addDocumentToProject(createdProject.projectId, templateMedia));
      }
      this.addedTemplateMediaList = []
      this.templateMedia = []
      this.messageService.add({ severity: 'Success', summary: 'Success', detail: "The project was successfully saved!"});
      await this.router.navigate(['/project-detail/', createdProject.projectId])
    } catch (error) {
      console.error('Error saving project or links', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: (error as Error).message });
    }
  }

  async getAllTags(): Promise<Tag[]> {
    return firstValueFrom(this.tagService.getAllTags());
  }

  cancel(): void {
    this.selectedTags = []
  }

  isAnyLinkFieldEmpty(): boolean {
    return this.links.some(link => link.name == '' || link.url == '') || this.templateLinks.some(link => link.name == '' || link.url == '');
  }

  addLink() {
    const link: Link = { linkId: '', name: '', url: '', requestLinkProjects: [] };
    this.links.push(link);
  }

  addTemplateLink(nameOfLink: string) {
    const link: Link = { linkId: '', name: nameOfLink, url: '', requestLinkProjects: [] };
    this.templateLinks.push(link);
  }

  removeLink(index: number): void {
    this.links.splice(index, 1);
  }

  getNamesForTags(tags: Tag[]): string[] {
    return tags.map(x => x.name)
  }

  getNamesForCollaborators(collaborators: Collaborator[]): string[] {
    return collaborators.map(x => x.name)
  }

  getAllCollaborators(): Promise<Collaborator[]> {
    return firstValueFrom(this.collaboratorService.getAllCollaborators())
  }

  isTitleDescriptionAndMediaValid(): boolean{
    return this.title.length > 0 && this.description.length > 0
    && (this.media.length > 0 || this.templateMedia.length > 0)
  }

  uploadTemplateFile(nameOfMedia: string) {
    const emptyFile = nameOfMedia;
    const formData = new FormData();
    formData.append('emptyFile', emptyFile);
    this.templateMediaNames.push(emptyFile);
    this.addedTemplateMediaList.push(formData);
    this.messageService.add({severity: 'info', summary: 'Success', detail: 'Media added! The media will be uploaded when the edit will be saved!'});
    const newMedia:Media = {
      mediaId:'',
      name:nameOfMedia,
      path: '',
      project:this.project,
      requestMediaProjects:[]
    }
    this.templateMedia.push(newMedia)
  }

  async uploadFile(event: FileUploadHandlerEvent, form: FileUpload) {
    const file = event.files[0];
    const formData = new FormData();
    formData.append('file', file);
    this.mediaNames.push("");
    this.addedMediaList.push(formData);
    this.messageService.add({severity: 'info', summary: 'Success', detail: 'Media added! The media will be uploaded when the edit will be saved!'});
    const newMedia:Media = {
      mediaId:'',
      name:file.name,
      path:file.name,
      project:this.project,
      requestMediaProjects:[]
    }
    this.media.push(newMedia)
    form.clear();
  }

  downloadTemplateDocument(index: number){
    const link = document.createElement('a');
    link.href = URL.createObjectURL(<File>this.addedTemplateMediaList[index].get('file'));
    link.download = this.templateMedia[index].path; // Adjust filename based on actual file type
    link.click();
    document.body.removeChild(link);
  }

  downloadDocument(index: number){
    const link = document.createElement('a');
    link.href = URL.createObjectURL(<File>this.addedMediaList[index].get('file'));
    link.download = this.media[index].path; // Adjust filename based on actual file type
    link.click();
    document.body.removeChild(link);
  }

  removeMedia(index: number): void {
    this.mediaNames.splice(index);
    this.media.splice(index);
    this.addedMediaList.splice(index);
  }
  showAddTagDialog() {
    this.addTagVisible = true;
  }

  changeTemplateMedia(event: FileUploadHandlerEvent, form: FileUpload, index: number) {
    const file = event.files[0];
    const formData = new FormData();
    formData.append('file', file);
    this.addedTemplateMediaList[index] = formData;
    this.messageService.add({severity: 'info', summary: 'Success', detail: 'Media changed successfully! The media will be saved when the save button is clicked!'});
    const newMedia:Media = {
      mediaId:'',
      name: this.templateMediaNames[index],
      path:file.name,
      project:this.project,
      requestMediaProjects:[]
    }
    this.templateMedia[index] = newMedia
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
    this.selectedCollaborators.splice(index, 1);
  }

  async saveNewCollaborator() {
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

    const newCollaborator: CollaboratorTransfer = {
      collaboratorId: '',
      name: this.newCollaboratorName,
      role: this.newCollaboratorRole,
    };

    if (this.editIndexCollaborator !== null) {
      this.selectedCollaborators[this.editIndexCollaborator] = newCollaborator;
      this.editIndexCollaborator = null;
    } else {
      this.selectedCollaborators.push(newCollaborator);
    }

    this.addCollaboratorVisible = false;
    this.newCollaboratorName = '';
    this.newCollaboratorRole = '';
    this.collaboratorNameInput.reset();
    this.collaboratorRoleInput.reset();
  }

  cancelAddCollaborator() {
    this.addCollaboratorVisible = false;
    this.newCollaboratorName = '';
    this.newCollaboratorRole = '';
    this.collaboratorNameInput.reset();
    this.collaboratorRoleInput.reset();
    this.editIndexCollaborator = null;
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
  
}



