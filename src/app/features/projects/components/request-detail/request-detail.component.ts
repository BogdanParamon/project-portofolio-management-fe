import { Component, OnDestroy, OnInit } from '@angular/core';
import { Collaborator, Link, Media, Project, Request, Tag } from '../../models/project-models';
import { StorageService } from 'src/app/features/accounts/services/authentication/storage.service';
import { AuthenticationService } from 'src/app/features/accounts/services/authentication/authentication.service';
import { AccountService } from 'src/app/features/accounts/services/accounts/account.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestService } from '../../services/request/request.service';
import { firstValueFrom } from 'rxjs';
import { CollaboratorService } from '../../services/collaborator/collaborator.service';
import { TagService } from '../../services/tag/tag.service';
import { MediaService } from '../../services/media/media.service';
import { LinkService } from '../../services/link/link.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import {DataViewModule} from "primeng/dataview";
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule} from "primeng/autocomplete";
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FormsModule } from '@angular/forms';
import { ChipModule } from 'primeng/chip';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, FloatLabelModule, DataViewModule, InputTextModule, AutoCompleteModule, InputTextareaModule, 
    FormsModule, ChipModule
  ],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.css'
})
export class RequestDetailComponent implements OnInit, OnDestroy {

  APP_URL = environment.APP_URL;
  requestId: string | null = null
  projectId: string | null = null
  request!: Request
  project!: Project

  originalTags: Tag[] = []
  addedTags: Tag[] = []
  removedTags: Tag[] = []
  allTags: Tag[] = []

  originalCollaborators: Collaborator[] = []
  addedCollaborators: Collaborator[] = []
  removedCollaborators: Collaborator[] = []
  allCollaborators: Collaborator[] = []

  originalMedia: Media[] = []
  addedMedia: Media[] = []
  removedMedia: Media[] = []
  allMedia: Media[] = []

  originalLinks: Link[] = []
  addedLinks: Link[] = []
  removedLinks: Link[] = []
  allLinks: Link[] = []

  username: string = ""
  isLoggedIn: boolean = false
  role_on_project: string = ""

  constructor(
    private route: ActivatedRoute,
    private storageService: StorageService,
    private authenticationService: AuthenticationService,
    private accountService: AccountService,
    private requestService: RequestService,
    private collaboratorService: CollaboratorService,
    private tagService: TagService,
    private mediaService: MediaService,
    private linkService: LinkService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.initializeFields()
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

        if(this.project.projectId) { 
         this.accountService.getRoleOnProject(this.username, this.project.projectId).subscribe({
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
    this.requestId = this.route.snapshot.paramMap.get('id');
    this.projectId = this.route.snapshot.paramMap.get('idProject')
    if(this.requestId && this.projectId) {
      console.log(this.requestId)
      const newRequest = await firstValueFrom(this.requestService.getRequestById(this.requestId, this.projectId))
      console.log(newRequest)
      this.request = newRequest
      this.project = newRequest.project
      console.log(this.request)
      console.log(this.project)

      const newCollaborators = await firstValueFrom(this.collaboratorService.getChangesCollaboratorsForRequest(this.requestId, this.projectId))
      const oldCollaborators = (await firstValueFrom (this.collaboratorService.getCollaboratorsByProjectId(this.projectId)))
      this.originalCollaborators = oldCollaborators.map(x => x as unknown as Collaborator)
      this.addedCollaborators = newCollaborators.filter( x => x.isRemove == false).map(x => x.collaborator)
      this.removedCollaborators = newCollaborators.filter( x => x.isRemove == true).map( x => x.collaborator)
      this.allCollaborators = this.originalCollaborators.concat(this.addedCollaborators)


      const oldTags = await firstValueFrom(this.tagService.getTagsByProjectId(this.projectId))
      this.originalTags = oldTags
      const newTags = await firstValueFrom(this.tagService.getTagsChangedForRequest(this.requestId, this.projectId))
      this.addedTags = newTags.filter(x => x.isRemove == false).map(x => x.tag)
      this.removedTags = newTags.filter(x => x.isRemove == true).map(x => x.tag)
      this.allTags = this.originalTags.concat(this.addedTags)


      const oldmedia = await firstValueFrom(this.mediaService.getDocumentsByProjectId(this.projectId))
      this.originalMedia = oldmedia
      const newMedia = await firstValueFrom(this.mediaService.getMediaChangedForRequest(this.requestId, this.projectId))
      this.addedMedia = newMedia.filter(x => x.isRemove == false).map(x => x.media)
      this.removedMedia = newMedia.filter(x => x.isRemove == true).map(x => x.media)
      this.allMedia = this.originalMedia.concat(this.addedMedia)

      const oldLinks = await firstValueFrom(this.linkService.getLinksByProjectId(this.projectId))
      this.originalLinks = oldLinks
      const newLinks = await firstValueFrom(this.linkService.getChangedLinksForRequest(this.requestId, this.projectId))
      this.addedLinks = newLinks.filter(x => x.isRemove == false).map(x => x.link)
      this.removedLinks = newLinks.filter(x => x.isRemove == true).map(x => x.link)
      this.allLinks = this.originalLinks.concat(this.addedLinks)
}

  }

  decideColorTag(tag: Tag): string {
    if(this.removedTags.some(x => x.tagId == tag.tagId))
      return "rgba(255, 93, 70, 0.45)"
    else if(this.addedTags.includes(tag))
      return "rgba(10, 118, 77, 0.45)"
    else return "rgba(111, 118, 133, 0.45)"
  }

  decideColorCollaborator(collaborator: Collaborator): string {
    if(this.removedCollaborators.some(x => x.collaboratorId == collaborator.collaboratorId))
      return "rgba(255, 93, 70, 0.45)"
    else if(this.addedCollaborators.includes(collaborator))
      return "rgba(10, 118, 77, 0.45)"
    else return "rgba(111, 118, 133, 0.45)"
  }

  decideColorLink(link: Link): string {
    if(this.removedLinks.some(x => x.linkId == link.linkId))
      return "rgba(255, 93, 70, 0.45)"
    else if(this.addedLinks.includes(link))
      return "rgba(10, 118, 77, 0.45)"
    else return "rgba(111, 118, 133, 0.45)"
  }

  decideColorMedia(media: Media): string {
    console.log(media)
    if(this.removedMedia.some(x => x.mediaId == media.mediaId))
      return "rgba(255, 93, 70, 0.45)"
    else if(this.addedMedia.includes(media))
      return "rgba(10, 118, 77, 0.45)"
    else return "rgba(111, 118, 133, 0.45)"
  }


  ngOnDestroy(): void {
    
  }

  acceptRequest(): void {
    if(this.requestId && this.projectId){
      firstValueFrom(this.requestService.acceptRequest(this.requestId, this.projectId))}
    this.router.navigate([''])
  }

  rejectRequest(): void {
    if(this.requestId && this.projectId)
      firstValueFrom(this.requestService.rejectRequest(this.requestId, this.projectId))
    this.router.navigate([''])
  }


}
