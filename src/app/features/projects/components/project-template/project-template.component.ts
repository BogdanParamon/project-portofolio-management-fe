import { Component , OnDestroy, OnInit } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { AbstractControl, FormsModule, ValidationErrors, Validators } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ChipsModule } from 'primeng/chips';
import { Template, TemplateAddition } from '../../models/project-models';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProjectService } from '../../services/project/project.service';
import { TemplateService } from '../../services/template/template.service';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { firstValueFrom } from 'rxjs';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ChipModule } from 'primeng/chip';
import { DataViewModule } from 'primeng/dataview';
import { MediaService } from '../../services/media/media.service';
import { LinkService } from '../../services/link/link.service';
import { CollaboratorService } from '../../services/collaborator/collaborator.service';
import { TagService } from '../../services/tag/tag.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { environment } from 'src/environments/environment';

interface StateOption {
  label: string;
  value: boolean;
}

@Component({
  selector: 'app-project-template',
  standalone: true,
  imports: [FormsModule, InputTextModule, FloatLabelModule,
     InputTextareaModule, ChipsModule, TableModule, TagModule,
     RatingModule, ButtonModule, CommonModule, FileUploadModule,
     DropdownModule, ToastModule, AutoCompleteModule, ChipModule,
     ReactiveFormsModule, DataViewModule, SelectButtonModule 
    ],
  providers: [TemplateService, MessageService],
  templateUrl: './project-template.component.html',
  styleUrls: ['./project-template.component.css']
})
export class ProjectTemplateComponent implements OnInit, OnDestroy {

  APP_URL = environment.APP_URL;
  formGroup!: FormGroup;
  stateOptions: StateOption[] = [
      { label: 'Link', value: false },
      { label: 'Media', value: true }
  ];
  numberOptions: { label: string, value: number }[] = [];
  selectedNumber: number | undefined;
  additions: TemplateAddition[] = [];
  title: string = '';
  description: string = '';
  collaborators?: number
  titleInput = new FormControl('', [Validators.required]);
  descriptionInput = new FormControl('', [Validators.required]);
  collaboratorsInput = new FormControl('', [Validators.required]);

  invalidTitle: boolean = false
  invalidDescription: boolean = false
  invalidAddition: boolean = false

  constructor(
    private projectService: ProjectService, 
    private messageService: MessageService,
    private mediaService: MediaService, 
    private templateService: TemplateService, 
    private linkService: LinkService, 
    private collaboratorService: CollaboratorService,
    private tagService: TagService
  ) {}

  ngOnDestroy(): void {
  }

  async ngOnInit() {
    for (let i = 1; i <= 100; i++) {
      this.numberOptions.push({ label: `${i}`, value: i });
    }

    this.collaboratorsInput.setValue("")
    this.titleInput.setValue("")
    this.descriptionInput.setValue("")
  }

  requireSelection(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value !== false && value !== true) {
      return { required: true };
    }
    return null;
  }

  async saveTemplate(): Promise<void> {
    if (this.isAnyAdditionEmpty()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'All addition titles and types must be filled out' });
      return;
    }
    if(!this.isTitleAndDescriptionValid()) {
      if(this.title.length == 0){
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Title can not be empty' });
        return;
      }
      if(this.description.length == 0){
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Description can not be empty' });
        return;
      }
      return;
    }
    try {
      this.titleInput.setErrors({ invalid: false });
      this.descriptionInput.setErrors({ invalid: false });
      const template: Template = {
        templateName: this.title,
        standardDescription: this.description,
        numberOfCollaborators: this.selectedNumber,
        projects: [],
        templateAdditions: this.additions
      };
  
      const createdTemplate = await firstValueFrom(this.templateService.createTemplate(template));
      console.log('Template created successfully', createdTemplate);

      console.log(this.additions)
      for (const addition of this.additions) {
        await firstValueFrom(this.templateService.addTemplateAddition(template.templateName, addition))
        console.log('Template addition added successfully', createdTemplate);
      }

      this.resetForm();
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Template saved successfully' });

    } catch (error) {
      console.error('Error saving template or additions', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: (error as Error).message });
    }
  }

  cancel(): void {
    console.log('Operation cancelled');
    this.resetForm();
  }

  isAnyAdditionEmpty(): boolean {
    this.additions.map(addition => console.log(addition.media));
    return this.additions.some(addition => addition.templateAdditionName == '' || addition.media == null);
  }

  addAddition() {
    const addition: TemplateAddition = { templateAdditionId: '', templateAdditionName: '', media: false, template: null };
    this.additions.push(addition);
  }

  removeAddition(additionToRemove: TemplateAddition): void {
    const index = this.additions.findIndex(obj => obj === additionToRemove);

    if (index !== -1) {
      this.additions.splice(index, 1);
    }
  }

  isTitleAndDescriptionValid(): boolean {
    return this.title.length > 0 && this.description.length > 0 
  }

  resetForm(): void {
    this.title = '';
    this.description = '';
    this.selectedNumber = undefined;
    this.additions = [];
  }
  
  updateAdditionMedia(addition: TemplateAddition, value: boolean) {
    addition.media = value;
  }
}
