import { JsonPipe, KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
    selector: 'app-obj-viewer',
    imports: [KeyValuePipe, NgTemplateOutlet],
    templateUrl: './obj-viewer.component.html',
    styleUrl: './obj-viewer.component.scss'
})
export class ObjViewerComponent {

  data = input();

  isArray = (obj) => Array.isArray(obj);

  isObject = (obj) => typeof obj === 'object' && obj !== null;

  asIsOrder() {
    return 0;
  }
}
