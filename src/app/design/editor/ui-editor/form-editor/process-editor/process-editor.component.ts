// Copyright (C) 2018 Razif Baital
//
// This file is part of LEAP and is licensed under the GNU General Public
// License, version 2 or (at your option) any later version.

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnChanges, SimpleChanges, effect, inject, input, output, viewChild } from '@angular/core';
import { KeyValue, KeyValuePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbNav, NgbNavItem, NgbNavLink, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormService } from '../../../../../service/form.service';
import { ToastService } from '../../../../../_shared/service/toast-service';
import { AsListPipe } from '../../../../../_shared/pipe/as-list.pipe';
import { NgCmComponent } from '../../../../../_shared/component/ng-cm/ng-cm.component';
import { toSnakeCase } from '../../../../../_shared/utils';
import { EditorIdChipComponent } from '../../editor-id-chip.component';

@Component({
    selector: 'app-process-editor',
    templateUrl: './process-editor.component.html',
    styleUrls: ['../../../../../../assets/css/element-action.css', './process-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, FaIconComponent, NgSelectModule, KeyValuePipe, SlicePipe, AsListPipe, NgCmComponent,
        NgbNav, NgbNavItem, NgbNavLink, NgbNavContent, NgbNavOutlet, EditorIdChipComponent]
})
export class ProcessEditorComponent implements OnChanges {
    readonly form = input.required<any>();
    readonly formRefreshVersion = input(0);
    readonly timeWarping = input(false);
    readonly accessMap = input<any>({});
    readonly accessList = input<any[]>([]);
    readonly mailerList = input<any[]>([]);
    readonly extraAutoCompleteTier = input<any[]>([]);
    readonly refreshRequested = output<void>();
    readonly formReplaced = output<any>();
    readonly formErrorChanged = output<any>();
    readonly reorderRequested = output<{items: any[]; index: number; operation: number}>();
    readonly mailerRequested = output<{data: any; property: string}>();
    readonly groupRequested = output<{data: any; property: string}>();

    get curForm() { return this.form(); }
    get isTimeWarpingForm() { return this.timeWarping(); }
    readonly toSnakeCase = toSnakeCase;
    readonly getObjLength = (obj: object) => Object.keys(obj).length;
    private readonly formService = inject(FormService);
    private readonly toastService = inject(ToastService);
    private readonly modalService = inject(NgbModal);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);
    reconLoading = false;

    constructor() {
        this.destroyRef.onDestroy(() => {
            if (this.tierLinesTimer !== null) clearTimeout(this.tierLinesTimer);
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['formRefreshVersion'] && this.curForm?.tiers?.length) this.highlightSubmit();
        if (changes['form']) this.scheduleTierLineRedraw();
    }

    highlightSubmit() {
        this.highlightLine({ id: -1 }, { id: -1, color: 'rgb(0, 123, 255)', action: 'goTier', nextTier: this.curForm.tiers[0].id });
    }

    // TimeWarp and reorder animations mutate the shared form in place.
    refreshView() {
        this.cdr.markForCheck();
        this.scheduleTierLineRedraw();
    }

    private tierLinesTimer: ReturnType<typeof setTimeout> | null = null;

    // The app is zoneless, so scheduled redraws must run after Angular's own render
    // tick; otherwise the tab content is not in the DOM yet and nothing can be measured.
    scheduleTierLineRedraw() {
        if (this.tierLinesTimer !== null) return;

        this.tierLinesTimer = setTimeout(() => {
            this.tierLinesTimer = null;
            this.drawTierLines();
        });
    }

    // The Process pane is created lazily and shown only after the tab transition, so
    // observe its size: any layout change (first display, toggle, resize) redraws the lines.
    processPane = viewChild<ElementRef<HTMLElement>>('processPane');
    private processPaneObserver: ResizeObserver | null = null;
    private processPaneEffect = effect(onCleanup => {
        const pane = this.processPane()?.nativeElement;
        if (!pane) return;
        this.processPaneObserver = new ResizeObserver(() => this.scheduleTierLineRedraw());
        this.processPaneObserver.observe(pane);
        onCleanup(() => {
            this.processPaneObserver?.disconnect();
            this.processPaneObserver = null;
        });
    });

    maxValue = (a, b) => Math.max(a, b);

    lines: HTMLElement[];
    hasLineToComplete = false;
    tierMap: any = {}
    drawTierLines() {
        // ngb-nav creates the Process pane hidden and only displays it when its fade
        // transition ends, so there is nothing to measure before that.
        var rail = document.getElementById('t_-1_line');
        if (!rail || rail.getBoundingClientRect().width === 0) return;

        this.lines = [];
        this.tierMap = {};
        this.hasLineToComplete = false;
        var allTaIndex = 0;
        this.drawSubmitLine();
        this.curForm?.tiers?.forEach((t) => {
            this.tierMap[t.id] = t;

            let actionsObj: any[] = Object.values(t.actions || {})
                .sort((a: any, b: any) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
            if (t.alwaysApprove) {
                actionsObj = [{ id: -2323, color: "rgb(0, 123, 255)", action: 'nextTier' }]; 
            }

            actionsObj.forEach((ta) => {
                let addToLines = false;
                let tElem;
                if (ta.action == 'nextTier') {
                    var nextTier = this.curForm.tiers[t.sortOrder + 1];
                    if (nextTier) {
                        tElem = document.getElementById("t_" + nextTier.id);
                        addToLines = true;
                    } else if (t.sortOrder == this.curForm.tiers?.length - 1) {
                        tElem = document.getElementById("t_999");
                        this.hasLineToComplete = true;
                    }
                } else if (ta.action == 'prevTier') {
                    var nextTier = this.curForm.tiers[t.sortOrder - 1];
                    if (nextTier) {
                        tElem = document.getElementById("t_" + nextTier.id);
                        addToLines = true;
                    }
                } else if (ta.action == 'goTier') {
                    tElem = document.getElementById("t_" + ta.nextTier);
                    addToLines = true;
                } else if (ta.action == 'curTier') {
                    if (ta.userEdit) {
                        tElem = document.getElementById("t_" + t.id);
                    }
                }

                if (tElem) {
                    var taElem = document.getElementById("ta_" + ta.id);
                    var line = document.getElementById("line_" + ta.id);
                    if (!taElem || !line) {
                        return;
                    }

                    var taOffsets = taElem.getBoundingClientRect();
                    var sourceCenterY = taOffsets.top + taOffsets.height / 2;
                    var tOffsets = tElem.getBoundingClientRect();
                    var targetCenterY = tOffsets.top + tOffsets.height / 2;
                    var lineContainer = line.offsetParent?.getBoundingClientRect();
                    if (!lineContainer) return;

                    line.style.top = (Math.min(sourceCenterY, targetCenterY) - lineContainer.top - 1) + "px";
                    line.style.height = (Math.abs(targetCenterY - sourceCenterY) + 2) + "px";
                    line.style.opacity = ".5";
                    if (addToLines) {
                        line.style.width = (6 + allTaIndex * 3) + "px";
                        this.lines.push(line);
                        allTaIndex++;
                    }
                }
            });
        })
        this.cdr.detectChanges();
    }

    // The Submission bracket has no fixed height, so align it with the first tier anchor.
    private drawSubmitLine() {
        var firstTier = this.curForm?.tiers?.[0];
        if (!firstTier) return;

        var submitLine = document.getElementById('line_-1');
        var rail = document.getElementById('t_-1_line');
        var anchor = document.getElementById('t_' + firstTier.id);
        if (!submitLine || !rail || !anchor) return;

        var railBounds = rail.getBoundingClientRect();
        var railCenterY = railBounds.top + railBounds.height / 2;
        var anchorBounds = anchor.getBoundingClientRect();
        var anchorCenterY = anchorBounds.top + anchorBounds.height / 2;
        var lineContainer = submitLine.offsetParent?.getBoundingClientRect();
        if (!lineContainer) return;

        submitLine.style.top = (Math.min(railCenterY, anchorCenterY) - lineContainer.top - 1) + 'px';
        submitLine.style.height = (Math.abs(anchorCenterY - railCenterY) + 2) + 'px';
    }

    selectedLine: number = -1;
    selectedLineTier: number = -1;
    selectedTier: number = -1;
    selectedColor: string = "rgb(0, 123, 255)";
    
    highlightLine(tier, tierAction) {
        this.selectedLine = tierAction.id;
        this.selectedTier = tier.id;
        this.selectedColor = tierAction.color;
        if (tierAction.action == 'goTier') {
            this.selectedLineTier = tierAction.nextTier;
        } else if (tierAction.action == 'nextTier') {
            if (this.curForm.tiers[tier.sortOrder + 1]) {
                this.selectedLineTier = this.curForm.tiers[tier.sortOrder + 1]?.id;
            } else if (tier.sortOrder == this.curForm?.tiers?.length - 1) {
                this.selectedLineTier = 999;
            } else {
                this.selectedLineTier = -1;
            }

        } else if (tierAction.action == 'prevTier') {
            this.selectedLineTier = this.curForm.tiers[tier.sortOrder - 1]?.id;

        } else if (tierAction.action == 'curTier') {
            if (tierAction.userEdit) {
                this.selectedLineTier = tier.id;
            } else {
                this.selectedLineTier = -1;
            }
        } else {
            this.selectedLineTier = -1;
        }
        this.scheduleTierLineRedraw();
    }

    simplifiedProcessView: boolean;

    editTierData: any;
    editTier(content, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.editTierData = data;
        if (!this.editTierData.x) {
            this.editTierData.x = {};
        }
        if (this.editTierData.orgMapParam) {
            this.editTierData.orgMapParamStr = JSON.stringify(this.editTierData.orgMapParam);
        }
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                if (rItem.orgMapParam) {
                    rItem.orgMapParam = JSON.parse(rItem.orgMapParamStr);
                }
                this.formService.saveTier(this.curForm.id, rItem)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.formService.getForm(this.curForm.id)
                                .pipe(takeUntilDestroyed(this.destroyRef))
                                .subscribe(res => {
                                    this.formReplaced.emit(res);
                                    this.reorderAllTier(res);
                                    this.cdr.detectChanges();
                                    this.scheduleTierLineRedraw();
                                }, err => {
                                    this.formErrorChanged.emit(err.error);
                                })
                            this.toastService.show("Tier saved successfully", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges();
                        },
                        error: (err) => {
                            this.toastService.show("Tier saving failed", { classname: 'bg-danger text-light' });
                        }
                    })
                this.cdr.detectChanges();
            }, dismiss => {
                if (this.editTierData.orgMapParamStr) {
                    this.editTierData.orgMapParam = JSON.parse(this.editTierData.orgMapParamStr);
                }
            });
        this.cdr.detectChanges();
    }

    editTierActionData: any;
    editTierAction(content, tier, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.editTierActionData = data;
        this.editTierActionData.tierOrder = tier.sortOrder;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                this.formService.saveTierAction(this.curForm.id, tier.id, rItem)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.refreshRequested.emit();
                            this.reorderAllTier();
                            this.toastService.show("Tier action saved successfully", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges(); 
                        }, error: (error) => {
                            this.toastService.show("Tier action saving failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { });
    }

    actionIcons = ['check', 'share', 'reply', 'times', 'square'];
    actionColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6c757d'];
    actionPreset: any = {
        approved: {
            action: 'nextTier',
            label: 'Approved',
            code: 'approved',
            color: '#28a745',
            icon: 'check',
            userEdit: false,
            sortOrder: 0
        },
        rejected: {
            action: 'curTier',
            label: 'Rejected',
            code: 'rejected',
            color: '#dc3545',
            icon: 'times',
            userEdit: false,
            sortOrder: 1
        },
        returned: {
            action: 'curTier',
            label: 'Returned',
            code: 'returned',
            color: '#007bff',
            icon: 'reply',
            userEdit: true,
            sortOrder: 2
        }
    }

    removeTierAction(ta) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (confirm('Are you sure you want to remove this action:' + ta.label)) {
            this.formService.removeTierAction(this.curForm.id, ta.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (res) => {
                        this.refreshRequested.emit();
                        this.toastService.show("Tier action removed successfully", { classname: 'bg-success text-light' });

                    }, error: (error) => {
                        this.toastService.show("Tier action removal failed", { classname: 'bg-danger text-light' });
                    }
                })
        }
    }

    removeTierData: any;
    removeTier(content, tier) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.removeTierData = tier;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                this.formService.removeTier(this.curForm.id, tier.id)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.formService.getForm(this.curForm.id)
                                .pipe(takeUntilDestroyed(this.destroyRef))
                                .subscribe(res => {
                                    this.formReplaced.emit(res);
                                    this.reorderAllTier(res);
                                    this.cdr.detectChanges(); 
                                    this.scheduleTierLineRedraw();
                                }, err => {
                                    this.formErrorChanged.emit(err.error);
                                })
                            this.toastService.show("Tier removed successfully", { classname: 'bg-success text-light' });

                        }, error: (error) => {
                            this.toastService.show("Tier removal failed", { classname: 'bg-danger text-light' });

                        }
                    })
            }, res => { });
    }

    reorderTier(tier: any, op: number) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (confirm(`Are you sure you want to reorder this tier?\n\nTier: ${tier.name}\nAction: ${op == -1 ? 'Move up' : 'Move down'}`)) {
            let index = this.curForm.tiers.findIndex((t: any) => t.id === tier.id);

            if (index > -1 && index + op >= 0 && index + op < this.curForm.tiers.length) {
                this.reorderRequested.emit({items: this.curForm.tiers, index, operation: op});
                this.saveTierOrder();
            }
        }
    }
    
    reorderAllTier(form = this.curForm) {
        var list = form.tiers
            .map((val, index) => {
                return { id: val.id, sortOrder: index }
            });
        return this.formService.saveTierOrder(form.id, list)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
                return res;
            });
    }

    saveTierOrder() {
        var list = this.curForm.tiers
            .map((val) => {
                return { id: val.id, sortOrder: val.sortOrder }
            });
        return this.formService.saveTierOrder(this.curForm.id, list)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
                this.scheduleTierLineRedraw();
                this.cdr.detectChanges();
                return res;
            });
    }

    reorderTierAction(tier: any, actionRef: any, op: number) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        var orderList = Object.values(tier.actions)
            .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

        let index = orderList.findIndex((a: any) => a.id === actionRef.id);

        if (index > -1 && index + op >= 0 && index + op < orderList.length) {
            this.reorderRequested.emit({items: orderList, index, operation: op});
            this.saveTierActionOrder(tier, orderList);
        }
    }

    saveTierActionOrder(tier: any, orderList: any[]) {
        var list = orderList.map((val: any) => {
            return { id: val.id, sortOrder: val.sortOrder };
        });

        return this.formService.saveTierActionOrder(this.curForm.id, tier.id, list)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
                tier.actions = res;
                this.cdr.detectChanges();
                this.scheduleTierLineRedraw();
            });
    }
    
    sortOrder = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {
        return a.value.sortOrder - b.value.sortOrder;
    }

    forceApf: any = {};
    showlogApf: any = {};
    apfResult: any = {};
    apfLoading: any = {};
    backendApf(tier, force) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (tier.orgMapParamStr) {
            tier.orgMapParam = JSON.parse(tier.orgMapParamStr);
        }

        this.formService.saveTier(this.curForm.id, tier)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.refreshRequested.emit();
                    this.toastService.show("Tier saved successfully", { classname: 'bg-success text-light' });

                    this.apfLoading[tier.id] = true;
                    this.formService.backendApf(this.curForm.id, tier.id, force == true)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe(res => {
                            let result = `<table width="100%">
                                <tr><td>Success</td><td>: ${res.successCount}</td></tr>
                                <tr><td>Failed</td><td>: ${res.errorCount}</td></tr>
                                <tr><td>Not updated (unchanged)</td><td>: ${res.notEmptyCount}</td></tr>
                              </table>`;
                            this.apfResult[tier.id] = res;

                            this.toastService.show("Approver updated successfully " + result + " ", { classname: 'bg-success text-light' });
                            this.apfLoading[tier.id] = false;
                            this.cdr.detectChanges(); 
                        })
                    this.cdr.detectChanges(); 

                }, error: (error) => {
                    this.toastService.show("Tier saving failed", { classname: 'bg-danger text-light' });
                    this.cdr.detectChanges(); 
                }
            })
    }

    reconApprover() {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (prompt("Are you sure you want to update the approver for all tiers in this form?\n Type 'update-all-tier' and press OK to proceed") == 'update-all-tier') {
            this.reconLoading = true;
            this.formService.reconApprover(this.curForm.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (res) => {
                        this.reconLoading = false;
                        this.toastService.show("Tier approver reconstructed successfully ", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); 
                    },
                    error: (error) => {
                        this.reconLoading = false;
                        this.toastService.show("Tier approver reconstruction failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges(); 
                    }
                })
        }
    }

}
