import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { IconSplitPipe } from '../../../../../_shared/pipe/icon-split.pipe';

@Component({
  selector: 'app-dataset-card-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkDropList,
    CdkDrag,
    FaIconComponent,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    IconSplitPipe,
  ],
  templateUrl: './dataset-card-preview.component.html',
  styleUrl: './dataset-card-preview.component.scss',
})
export class DatasetCardPreviewComponent {
  @Input({ required: true }) dataset: any;
  @Input() form: any;
  @Input() disabled = false;

  @Output() editItem = new EventEmitter<any>();
  @Output() dropField = new EventEmitter<CdkDragDrop<any>>();

  showCardPreview = false;
  enableCardPreviewEdit = false;

  sameDropList = () => true;

  hasDropdown(actions: any[]): boolean {
    return Array.isArray(actions) && actions.some((a) => a.type === 'dropdown');
  }
}