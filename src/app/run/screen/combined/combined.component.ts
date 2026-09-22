// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, forwardRef, inject, input, signal, untracked, DestroyRef, viewChildren, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
        NgTemplateOutlet,
        FaIconComponent,
        IconSplitPipe,
        
        NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, 
        NgbAccordionToggle, NgbAccordionButton, NgbCollapse, 
        NgbAccordionCollapse, NgbAccordionBody, NgbNav, 
        NgbNavItem, NgbNavItemRole, NgbNavLink, 
        NgbNavLinkBase, NgbNavContent, NgbNavOutlet,
        
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
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private destroyRef = inject(DestroyRef); // 👈 Optimization: Memory management

    screen = input<any>();
    param = input<any>();

    user = computed<any>(() => this.runService.$user());
    appId = computed<number | null>(() => this.runService.$app()?.id || null);
    email = computed<string>(() => this.user()?.email || '');

    activeTab = signal<Record<string, number>>({});
    swipeDirection = signal<'left' | 'right' | 'none'>('none');

    tabItems = viewChildren<ElementRef>('tabItem');
    
    isAnimating = false;
    private animTimeout: any;
    private routeTimeout: any;

    // Touch coordinate trackers
    touchStartX = 0;
    touchStartY = 0;
    touchEndX = 0;
    touchEndY = 0;

    constructor() {
        effect(() => {
            const currentScreen = this.screen();
            const urlTab = this.param()?.['tab'];
            
            if (currentScreen?.id) {
                let tabChanged = false;

                untracked(() => {
                    if (urlTab !== undefined) {
                        const targetIdx = Number(urlTab);
                        // Optimization: Only update and trigger CD if the URL dictates a new tab
                        if (this.getActiveTab(currentScreen.id) !== targetIdx) {
                            this.setActiveTab(currentScreen.id, targetIdx);
                            tabChanged = true;
                        }
                    }
                });

                if (tabChanged) {
                    untracked(() => setTimeout(() => this.cdr.detectChanges(), 50));
                }
            }
        });

        // Optimization: Cleanup timeouts to prevent memory leaks or ghost navigations
        this.destroyRef.onDestroy(() => {
            clearTimeout(this.animTimeout);
            clearTimeout(this.routeTimeout);
        });
    }

    setActiveTab(screenId: string, index: number) {
        const currentIdx = this.getActiveTab(screenId);
        
        if (currentIdx === index) return; 
        
        // Determine animation direction
        if (index > currentIdx) {
            this.swipeDirection.set('left');
        } else if (index < currentIdx) {
            this.swipeDirection.set('right');
        }

        this.activeTab.update(tabs => ({ ...tabs, [screenId]: index }));

        this.scrollToActiveTab(index);

        // Lock swiping while the CSS transition plays
        this.isAnimating = true;
        clearTimeout(this.animTimeout);
        
        // Reset to a clean baseline after animation finishes
        this.animTimeout = setTimeout(() => {
            this.isAnimating = false;
            this.swipeDirection.set('none'); 
        }, 350);
    }
    
    getActiveTab(screenId: string): number {
        return this.activeTab()[screenId] ?? 0;
    }

    private scrollToActiveTab(index: number) {
        setTimeout(() => {
            const tab = this.tabItems()[index]?.nativeElement;
            const container = tab?.parentElement;

            if (!tab || !container) return; // Exit if elements aren't found

            container.scrollTo({
                left: tab.offsetLeft - container.clientWidth / 2 + tab.clientWidth / 2,
                behavior: 'smooth'
            });
        }, 50);
    }

    // Touch Event Handlers
    onTouchStart(event: TouchEvent) {
        this.touchStartX = event.changedTouches[0].screenX;
        this.touchStartY = event.changedTouches[0].screenY;
    }

    onTouchEnd(event: TouchEvent) {
        this.touchEndX = event.changedTouches[0].screenX;
        this.touchEndY = event.changedTouches[0].screenY;
        this.handleSwipe();
    }

    handleSwipe() {
        if (this.isAnimating) return; // Prevent rapid-swipe glitching

        const swipeThreshold = 50;
        const diffX = this.touchEndX - this.touchStartX;
        const diffY = this.touchEndY - this.touchStartY;

        // Ensure swipe is horizontal and meets threshold length
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            const screenData = this.screen();
            const comps = screenData?.data?.comps;
            
            if (!screenData?.id || !comps || comps.length === 0) return;

            const currentIdx = this.getActiveTab(screenData.id) || 0;
            let targetIdx = currentIdx;

            if (diffX > 0) {
                if (currentIdx > 0) targetIdx = currentIdx - 1; // Swipe Right
            } else {
                if (currentIdx < comps.length - 1) targetIdx = currentIdx + 1; // Swipe Left
            }

            if (targetIdx !== currentIdx) {
                // 1. Trigger the visual tab change and animation immediately
                this.setActiveTab(screenData.id, targetIdx);
                
                // 2. Delay the URL update until AFTER the 300ms animation finishes
                clearTimeout(this.routeTimeout);
                this.routeTimeout = setTimeout(() => {
                    this.router.navigate([], {
                        relativeTo: this.route,
                        queryParams: { tab: targetIdx },
                        queryParamsHandling: 'preserve',
                        replaceUrl: true
                    });
                }, 300);
            }
        }
    }
}