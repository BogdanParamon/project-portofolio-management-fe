import { Component , OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ChipsModule } from 'primeng/chips';
import { Collaborator, Link, Media, MediaFileContent, Project, Tag, Template } from '../../models/project-models';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '../../services/project/project.service';
import {FileUploadEvent, FileUploadModule} from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import{ MediaService} from "../../services/media/media.service";
import { DropdownModule } from 'primeng/dropdown';
import { firstValueFrom, map } from 'rxjs';
interface UploadEvent {
  originalEvent: Event;
  files: File[];
}

@Component({
  selector: 'app-project-edit',
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.css'],
  standalone: true,
  imports: [FormsModule, InputTextModule, FloatLabelModule,
     InputTextareaModule, ChipsModule, TableModule, TagModule,
      RatingModule, ButtonModule, CommonModule, FileUploadModule,
      DropdownModule, ToastModule],
  providers: [ProjectService, MessageService]
})

export class ProjectEditComponent implements OnInit {
  media!: Media[];
  projectId: string | null = null;
  project!: Project;
  title!: string;
  description!: string;
  tags: Tag[] | undefined;
  colaborators: Collaborator[] | undefined;
  tagnames: string[] | undefined;
  collaboratornames: string[] | undefined;
  links: Link[] = [];
  templates!: Template[];
  templateNames: string[] = [];
  selectedTemplateName: string | undefined;
  selectedTemplate: Template | null = null;
  deleteLinkList: Link[] = [];


  constructor(private route: ActivatedRoute,
     private projectService: ProjectService, private messageService: MessageService,private mediaService: MediaService,) {}

  async ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    this.templates = await this.getAllTemplates()
    this.templateNames = await this.getAllTemplateNames()
    if (this.projectId) {
      this.projectService.getLinksByProjectId(this.projectId).subscribe((response: Link[]) => {
        this.links = response
      });
      this.projectService.getDocumentsByProjectId(this.projectId).subscribe((response: Media[]) => {
        this.media = response;
      });
      this.projectService.getProjectById(this.projectId).subscribe((response: Project) => {
        this.project = response;
        this.title = this.project.title;
        this.description = this.project.description;
        this.selectedTemplate = this.project.template;
        this.selectedTemplateName = this.project.template?.templateName;
        console.log(this.selectedTemplateName)
      });
      this.projectService.getTagsByProjectId(this.projectId).subscribe((response: Tag[]) => {
        this.tags = response;
        this.tagnames = this.tags.map(x => x.name);
      });
      this.projectService.getCollaboratorsByProjectId(this.projectId).subscribe((response: Collaborator[]) => {
        this.colaborators = response;
        this.collaboratornames = this.colaborators.map(x => x.name)
      });
    } else {
      console.error('Project ID is null');
    }
  }

  async onBasicUploadAuto(event: FileUploadEvent) {
    const file = event.files[0];
    const formData = new FormData();
    console.log(this.projectId);
    formData.append('file', file);
    formData.append('name', "testName");
    console.log(await firstValueFrom(this.mediaService.addDocumentToProject(this.project.projectId, formData, "test2")));
    this.messageService.add({severity: 'info', summary: 'Success', detail: 'File Uploaded with Auto Mode'});
  }

  async getAllTemplates(): Promise<Template[]> {
    return firstValueFrom(this.projectService.getTemplates())
  }

  async getAllTemplateNames(): Promise<string[]> {
    return firstValueFrom(this.projectService.getTemplates()
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
      const tmb: MediaFileContent = {
        a: '',
        b: ''
      }

      const foundTemplate = this.templates.find(x => x.templateName === this.selectedTemplateName);
      this.selectedTemplate = foundTemplate !== undefined ? foundTemplate : null;

      const prj: Project = {
        projectId: "",
        title: this.title,
        description: this.description,
        archived: false,
        template: this.selectedTemplate,
        media: this.media,
        projectsToAccounts: [],
        projectsToCollaborators: [],
        tagsToProjects: [],
        links: this.links,
        requests: [],
        collaboratorNames: [],
        tagNames: [],
        tags: [],
        tmb: tmb
      };

      const createdProject = await firstValueFrom(this.projectService.editProject(this.projectId, prj));
      console.log('Project created successfully', createdProject);

      for (const link of this.links) {
        if(link.linkId == '') {
          await firstValueFrom(this.projectService.addLinkToProject(link, createdProject.projectId))
          console.log('Links added successfully in project', createdProject);
        } else {
          console.log(link)
          await firstValueFrom(this.projectService.editLinkOfProject(link))
          console.log('Links updated successfully in project', createdProject);
        }
      }

      for (const link of this.deleteLinkList) {
        await firstValueFrom(this.projectService.deleteLinkById(link.linkId));
        console.log('Link deleted successfully', link);
      }

    } catch (error) {
      console.error('Error saving project or links', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save project or links' });
    }
  }

  cancel(): void {
    console.log('Operation cancelled');
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
    this.media.splice(index, 1);
  }

  removeTemplate(): void {
    this.selectedTemplateName = ''
    this.selectedTemplate = null;
  }
  private mimeTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'html': 'text/html',
    'bib': 'application/x-bibtex'
  };
  getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return this.mimeTypes[extension] || 'application/octet-stream';
  }
  downloadFile(media: MediaFileContent) {
    console.log(media);
    const mimeType = this.getMimeType(media.a)
    const byteArray = new Uint8Array(atob(media.b).split('').map(char => char.charCodeAt(0)));
    const file = new Blob([byteArray], {type: mimeType});
    const fileUrl = URL.createObjectURL(file);
    const fileName = media.a;
    let link = document.createElement("a");
    link.download = fileName;
    link.href = fileUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(fileUrl);
  }
  downloadDocument(mediaId: string){
    let mediaFile : MediaFileContent = {
      a:"",
      b:"",
    };
    console.log(mediaId);
    this.mediaService.getDocumentContent(mediaId).subscribe({
      next: (data: MediaFileContent) => {
        mediaFile = data;
        this.downloadFile(mediaFile);
      },
      error: (err:any) => {
        console.error('Error fetching media files', err);
      }
    })
  }
}
