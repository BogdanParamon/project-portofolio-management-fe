import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {Media, MediaFile, Project} from '../../models/project-models';
import { Collaborator } from '../../models/project-models';
import { Tag } from '../../models/project-models';
import { ProjectService } from '../../services/project/project.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { DataView } from 'primeng/dataview';
import { CollaboratorService } from '../../services/collaborator/collaborator.service';
import { firstValueFrom, map } from 'rxjs';
import { TagService } from '../../services/tag/tag.service';
import { ChipsModule } from 'primeng/chips';
import {MediaService} from "../../services/media/media.service";
@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {
  data: Project[] = [];
  filteredData: Project[] = [];
  layout: DataView["layout"] = "list";
  collaborators: string[] = []
  projectName: string = '';
  projectCollaborator: string = ''
  tagNames: string[] = []
  selectedTagNames: string[] = []

  constructor(
    private readonly projectService: ProjectService,
    private readonly collaboratorService: CollaboratorService,
    private tagService: TagService,
    private mediaService: MediaService
  ) {}

  async ngOnInit(): Promise<void> {
      this.projectService.getAllProjects().subscribe((response: Project[]) => {
        this.data = response;
        this.data.forEach(async x => x.collaboratorNames = await this.getCollaboratorsForId(x.projectId))
        this.data.forEach(async x => x.tagNames = await this.getTagNamesForId(x.projectId))
        this.data.forEach(async x => x.tags = await this.getTagsForId(x.projectId))
        this.data.forEach(async x => x.media = await this.getMediasByProjectId(x.projectId))
        this.filteredData = this.data
      })

      this.tagNames = await this.getAllTagNames()
    }


  async getCollaboratorsForId(id: string): Promise<string[]> {
    return firstValueFrom(this.collaboratorService.getCollaboratorsByProjectId(id).pipe(
      map(data => data.map(x => x.name))
    ))
  }

  async getTagsForId(id: string): Promise<Tag[]> {
    return firstValueFrom(this.tagService.getTagsByProjectId(id))
  }
  async getMediasByProjectId(id: string): Promise<Media[]> {
    return firstValueFrom(this.mediaService.getDocumentsByProjectId(id).pipe(map(x=>x.filter(y=> y.path.endsWith(".png")))));
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
    return dataToFilter.filter(x => x.title.toLocaleLowerCase().includes(this.projectName.toLocaleLowerCase()))
  }


  onCollaboratorFilterChange(event: Event): void {
    this.projectCollaborator = (event.target as HTMLInputElement).value
    this.filterProjects()
  }

  filterByCollaborator(dataToFilter: Project[]): Project[] {
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
    return dataToFilter.filter(project => this.selectedTagNames.every(name => project.tagNames.includes(name)))
  }


  filterProjects(): void {
    this.filteredData = this.filterByTitle(this.data)
    this.filteredData = this.filterByCollaborator(this.filteredData)
    this.filteredData = this.filterByTags(this.filteredData)
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
          return "rgba(0, 0, 0, 0.4)"
        default:
          return "rgba(111, 118, 133, 0.45)"
      }
  }
  async downloadDocument(mediaId: string){
    let mediaFile : MediaFile = {
      a:"",
      b:"",
      c:""
    };
    this.mediaService.getDocumentContent(mediaId).subscribe({
      next: (data: MediaFile) => {
        mediaFile = data;
      },
      error: (err:any) => {
        console.error('Error fetching media files', err);
      }
    })
    return mediaFile;
  }
    getImageSrc(): string {
    let media: Media = this.filteredData[0].media[0];
    console.log(media.mediaId);
    //let md: MediaFile = await this.downloadDocument(media.mediaId);
    //console.log(media.mediaId)
   /*let mediaFile: MediaFile = {
      a: "",
      b: "",
      c: ""
    }



    console.log(mediaFile.a)
    console.log(mediaFile.b)

    */
    return '';
  }
 }
