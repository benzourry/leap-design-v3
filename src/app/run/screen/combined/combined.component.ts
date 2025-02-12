import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, forwardRef, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton, NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { ListComponent } from '../../list/list.component';
import { FormComponent } from '../../form/form.component';
import { ViewComponent } from '../../view/view.component';
import { ScreenComponent } from '../screen.component';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { LookupComponent } from '../../lookup/lookup.component';
import { UserComponent } from '../../user/user.component';

@Component({
    selector: 'app-combined',
    imports: [NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton,
        NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgTemplateOutlet, NgbNav,
        NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet,
        FaIconComponent, forwardRef(() => ListComponent), forwardRef(() => DashboardComponent),
        forwardRef(() => FormComponent), forwardRef(() => ViewComponent), forwardRef(() => ScreenComponent), forwardRef(() => UserComponent),
        forwardRef(() => LookupComponent)],
    templateUrl: './combined.component.html',
    styleUrl: './combined.component.scss'
})
export class CombinedComponent  implements OnInit{
    // @Input("appId")
    appId = input<number>();

    // @Input("tplId")
    email = input<string>();
    screen = input<any>();

    ngOnInit(): void {
      
    }

    getIcon = (str) => str ? str.split(":") : ['far', 'file'];

}
