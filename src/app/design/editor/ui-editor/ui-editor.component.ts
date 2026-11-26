import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-ui-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './ui-editor.component.html',
    styleUrl: '../_workspace-sidebar.scss',
    imports: [RouterOutlet]
})
export class UiEditorComponent {}
