// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, forwardRef, inject, input, signal, untracked } from '@angular/core';
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
    // 👇 1. Inject the Change Detector
    private cdr = inject(ChangeDetectorRef);

    screen = input<any>();
    param = input<any>();

    user = computed<any>(() => this.runService.$user());
    appId = computed<number | null>(() => this.runService.$app()?.id || null);
    email = computed<string>(() => this.user()?.email || '');

    // 1. Strictly typed Signal to replace the standard dictionary
    activeTab = signal<Record<string, number>>({});

    constructor() {
        effect(() => {
            const currentScreen = this.screen();
            const urlTab = this.param()?.['tab'];
            
            if (currentScreen?.id) {
                untracked(() => {
                    if (urlTab !== undefined) {
                        this.setActiveTab(currentScreen.id, Number(urlTab));
                    }
                });

                // 👇 2. Force NgBootstrap to recognize the dynamic DOM insertion 
                // shortly after the @defer block resolves and the @for loop runs.
                untracked(() => {
                    setTimeout(() => {
                        this.cdr.detectChanges();
                    }, 50);
                });
            }
        });
    }

    // 3. Clean helper methods for the template to interact with the Signal
    setActiveTab(screenId: string, index: number) {
        this.activeTab.update(tabs => ({ ...tabs, [screenId]: index }));
    }
    
    getActiveTab(screenId: string): number {
        return this.activeTab()[screenId] ?? 0;
    }

}