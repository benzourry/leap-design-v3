import { Component, ElementRef, contentChild } from '@angular/core';
import { CdkDrag } from '@angular/cdk/drag-drop';

@Component({
    selector: '[split-pane]',
    templateUrl: './split-pane.component.html',
    styleUrls: ['./split-pane.component.scss'],
    imports: [CdkDrag]
})
export class SplitPaneComponent {

//   @ContentChild("sidebar", { static: true }) sidebar: ElementRef;

  sidebar = contentChild<ElementRef>('sidebar')

  dragPosition = { x: 0, y: 0 };
  sidebarWidth: number = 240;
  sidebarResize($event, sidebarMenu) {
      // console.log($event);
      let x = $event.event.clientX ?? $event.event.changedTouches[0].clientX;
      let half = ($event.event.view.innerWidth / 2) - 23;
      if (x - 46 >= half) {
          this.dragPosition = { x: half - 240, y: 0 };
          this.sidebarWidth = half;
      } else if (x <= 46) {
          this.dragPosition = { x: 0 - 240, y: 0 };
          this.sidebarWidth = 0;
      } else {
          this.dragPosition = { x: x - 240 - 46, y: 0 };
          this.sidebarWidth = x - 46;
      }
      this.sidebar().nativeElement.style.maxWidth = this.sidebarWidth + 'px';
  }


}
