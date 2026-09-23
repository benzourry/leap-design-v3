// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, forwardRef, inject, input, signal, untracked, DestroyRef, viewChildren, ElementRef, OnInit, OnDestroy } from '@angular/core';
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
import { ViewportService } from '../../../_shared/service/viewport.service';

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
    private destroyRef = inject(DestroyRef); 
    private viewport = inject(ViewportService);

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

    // Mobile state trackers
    isMobile = this.viewport.isMobile;
    // private mediaQueryList: MediaQueryList | null = null;
    // private mediaQueryListener: (e: MediaQueryListEvent) => void;

    // Touch coordinate trackers
    touchStartX = 0;
    touchStartY = 0;
    touchEndX = 0;
    touchEndY = 0;

    constructor() {
        // this.mediaQueryListener = (e: MediaQueryListEvent) => {
        //     this.isMobile.set(e.matches);
        // };

        effect(() => {
            const currentScreen = this.screen();
            const urlTab = this.param()?.['tab'];

            if (currentScreen?.id) {
                let tabChanged = false;

                untracked(() => {
                    if (urlTab !== undefined) {
                        const targetIdx = Number(urlTab);
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

        this.destroyRef.onDestroy(() => {
            clearTimeout(this.animTimeout);
            clearTimeout(this.routeTimeout);
        });
    }

    // ngOnInit() {
    //     // Setup media query listener (matches Bootstrap 'sm' breakpoint)
    //     this.mediaQueryList = window.matchMedia('(max-width: 575.98px)');
    //     this.isMobile.set(this.mediaQueryList.matches);
    //     this.mediaQueryList.addEventListener('change', this.mediaQueryListener);
    // }

    setActiveTab(screenId: string, index: number) {
        const currentIdx = this.getActiveTab(screenId);

        if (currentIdx === index) return; 

        if (index > currentIdx) {
            this.swipeDirection.set('left');
        } else if (index < currentIdx) {
            this.swipeDirection.set('right');
        }

        this.activeTab.update(tabs => ({ ...tabs, [screenId]: index }));

        this.scrollToActiveTab(index);

        this.isAnimating = true;
        clearTimeout(this.animTimeout);

        this.animTimeout = setTimeout(() => {
            this.isAnimating = false;
            this.swipeDirection.set('none'); 
        }, 350);
    }

    getActiveTab(screenId: string): number {
        return this.activeTab()[screenId] ?? 0;
    }

    // private scrollToActiveTab(index: number) {
    //     setTimeout(() => {
    //         const tab = this.tabItems()[index]?.nativeElement;
    //         const container = tab?.closest('.nav-wrap, .tab-hscroll, .tab-simple') || tab?.closest('ul.nav');

    //         if (!tab || !container) return; // Exit if elements aren't found

    //         container.scrollTo({
    //             left: tab.offsetLeft - container.clientWidth / 2 + tab.clientWidth / 2,
    //             behavior: 'smooth'
    //         });
    //     }, 50);
    // }

    private scrollToActiveTab(index: number) {
        setTimeout(() => {
            const tab = this.tabItems()[index]?.nativeElement;
            // const container = tab?.closest('.nav-wrap, .tab-hscroll, .tab-simple') || tab?.closest('ul.nav');
            const container = tab?.closest('.tab-hscroll, .nav-wrap') || tab?.closest('ul.nav');

            if (!tab || !container) return;

            // Grab exact screen coordinates
            const tRect = tab.getBoundingClientRect(), cRect = container.getBoundingClientRect();

            // ⚡ PWA FIX: Bypass buggy native JS API using CSS scrollBehavior
            container.style.scrollBehavior = 'smooth';
            
            // Calculate center and scroll in one step using +=
            container.scrollLeft += (tRect.left - cRect.left) - (cRect.width / 2) + (tRect.width / 2);

            // Clean up CSS override after animation
            setTimeout(() => container.style.scrollBehavior = '', 350);
        }, 50);
    }

    // Touch Event Handlers
    onTouchStart(event: TouchEvent) {
        if (!this.isMobile()) return; // <-- Early exit if not mobile

        this.touchStartX = event.changedTouches[0].screenX;
        this.touchStartY = event.changedTouches[0].screenY;
    }

    onTouchEnd(event: TouchEvent) {
        if (!this.isMobile()) return; // <-- Early exit if not mobile

        this.touchEndX = event.changedTouches[0].screenX;
        this.touchEndY = event.changedTouches[0].screenY;
        this.handleSwipe();
    }

    handleSwipe() {
        if (this.isAnimating) return; 

        const swipeThreshold = 50;
        const diffX = this.touchEndX - this.touchStartX;
        const diffY = this.touchEndY - this.touchStartY;

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
                this.setActiveTab(screenData.id, targetIdx);

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

    // ngOnDestroy() {
    //     if (this.mediaQueryList) {
    //         this.mediaQueryList.removeEventListener('change', this.mediaQueryListener);
    //     }
    // }
}