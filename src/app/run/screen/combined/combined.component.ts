import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, forwardRef, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { ListComponent } from '../../list/list.component';
import { FormComponent } from '../../form/form.component';
import { ViewComponent } from '../../view/view.component';
import { ScreenComponent } from '../screen.component';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { LookupComponent } from '../../lookup/lookup.component';
import { UserComponent } from '../../user/user.component';
import { RunService } from '../../_service/run.service';
import { IconSplitPipe } from '../../../_shared/pipe/icon-split.pipe';

@Component({
    selector: 'app-combined',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton,
        NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgTemplateOutlet, NgbNav, 
        NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet,
        FaIconComponent, forwardRef(() => ListComponent), forwardRef(() => DashboardComponent),
        forwardRef(() => FormComponent), forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent), forwardRef(() => UserComponent),
        forwardRef(() => LookupComponent), IconSplitPipe],
    templateUrl: './combined.component.html',
    styleUrl: './combined.component.scss'
})
export class CombinedComponent {
    
    appId = computed<number>(()=>this.runService.$app()?.id || null);

    email = computed(()=>this.user()?.email || '');

    screen = input<any>();

    param = input<any>();

    user = computed<any>(()=>this.runService.$user());

    private runService = inject(RunService);

    // ngOnInit(): void {
      
    // }

    activeTab:any = {};

    // getIcon = (str) => str ? str.split(":") : ['far', 'file'];

}
