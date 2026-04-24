import { ChangeDetectionStrategy, Component, ElementRef, contentChild, signal } from '@angular/core';
import { CdkDrag, CdkDragMove } from '@angular/cdk/drag-drop';

@Component({
    selector: '[split-pane]',
    templateUrl: './split-pane.component.html',
    styleUrls: ['./split-pane.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CdkDrag]
})
export class SplitPaneComponent {

    // Content child for the projected sidebar element
    sidebar = contentChild<ElementRef>('sidebar');

    // Signal-based state for OnPush performance
    dragPosition = signal({ x: 0, y: 0 });
    
    // Extracted constants for layout math
    private readonly DEFAULT_WIDTH = 240;
    private readonly LEFT_NAV_OFFSET = 46;
    private readonly HANDLE_OFFSET = 23;

    sidebarResize(event: CdkDragMove) {
        // CDK automatically normalizes mouse vs touch events via pointerPosition
        const x = event.pointerPosition.x; 
        
        const halfScreen = (window.innerWidth / 2) - this.HANDLE_OFFSET;
        
        let newWidth: number;
        let newX: number;

        if (x - this.LEFT_NAV_OFFSET >= halfScreen) {
            // Max width constraint (half screen)
            newWidth = halfScreen;
            newX = halfScreen - this.DEFAULT_WIDTH;
        } else if (x <= this.LEFT_NAV_OFFSET) {
            // Min width constraint (collapsed)
            newWidth = 0;
            newX = -this.DEFAULT_WIDTH;
        } else {
            // Free dragging
            newWidth = x - this.LEFT_NAV_OFFSET;
            newX = x - this.DEFAULT_WIDTH - this.LEFT_NAV_OFFSET;
        }

        // Update handle position reactively
        this.dragPosition.set({ x: newX, y: 0 });

        // Direct DOM manipulation during drag events is actually best-practice 
        // to avoid triggering Angular Change Detection at 60fps and causing lag.
        const sidebarEl = this.sidebar()?.nativeElement;
        if (sidebarEl) {
            sidebarEl.style.maxWidth = `${newWidth}px`;
        }
    }
}