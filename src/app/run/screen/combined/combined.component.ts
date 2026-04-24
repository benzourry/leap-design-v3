// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { 
  NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, 
  NgbAccordionToggle, NgbAccordionButton, NgbCollapse, 
  NgbAccordionCollapse, NgbAccordionBody, NgbNav, 
  NgbNavItem, NgbNavItemRole, NgbNavLink, 
  NgbNavLinkBase, NgbNavContent, NgbNavOutlet 
} from '@ng-bootstrap/ng-bootstrap';

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
    templateUrl: './combined.component.html',
    styleUrl: './combined.component.scss',
    imports: [
        // Angular Core & Utilities
        NgTemplateOutlet,
        FaIconComponent,
        IconSplitPipe,
        
        // NgBootstrap Accordion & Nav Elements
        NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, 
        NgbAccordionToggle, NgbAccordionButton, NgbCollapse, 
        NgbAccordionCollapse, NgbAccordionBody, NgbNav, 
        NgbNavItem, NgbNavItemRole, NgbNavLink, 
        NgbNavLinkBase, NgbNavContent, NgbNavOutlet,
        
        // Dynamic Sub-Components (forwardRef prevents circular dependency crashes)
        forwardRef(() => ListComponent), 
        forwardRef(() => DashboardComponent),
        forwardRef(() => FormComponent), 
        forwardRef(() => ViewComponent), 
        forwardRef(() => ScreenComponent), 
        forwardRef(() => UserComponent),
        forwardRef(() => LookupComponent)
    ]
})
export class CombinedComponent {
    
    private runService = inject(RunService);

    screen = input<any>();
    param = input<any>();

    user = computed<any>(() => this.runService.$user());
    appId = computed<number | null>(() => this.runService.$app()?.id || null);
    email = computed<string>(() => this.user()?.email || '');

    // Strictly typed state for tracking NgBootstrap Nav/Accordion active tabs
    activeTab: Record<string, any> = {};

}