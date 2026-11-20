import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import mermaid from 'mermaid';
import { DatasetService } from '../../service/dataset.service';
import { FormService } from '../../service/form.service';
import { LookupService } from '../../run/_service/lookup.service';
import {
  buildUmlClassDiagram,
  getUmlFormActionMarker,
  getUmlFormFieldCount,
  getUmlRelationships,
  UML_FORM_FIELD_LIMIT,
  UmlDataset,
  UmlForm,
  UmlLookup,
  UmlRelationship
} from './uml-diagram.util';

interface PageResult<T> {
  content?: T[];
}

function records<T>(result: T[] | PageResult<T> | null | undefined): T[] {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.content) ? result.content : [];
}

@Component({
  selector: 'app-uml-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './uml-diagram.component.html',
  styleUrl: './uml-diagram.component.scss'
})
export class UmlDiagramComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formService = inject(FormService);
  private readonly lookupService = inject(LookupService);
  private readonly datasetService = inject(DatasetService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private diagramElement?: ElementRef<HTMLElement>;

  @ViewChild('diagramContainer')
  set diagramContainer(element: ElementRef<HTMLElement> | undefined) {
    this.diagramElement = element;
    if (element && this.diagramSource) void this.renderDiagram();
  }

  @ViewChild('diagramViewport') private diagramViewport?: ElementRef<HTMLElement>;

  appId?: number;
  loading = true;
  error = '';
  diagramSource = '';
  private renderSequence = 0;
  forms: UmlForm[] = [];
  lookups: UmlLookup[] = [];
  datasets: UmlDataset[] = [];
  expandedFormIds = new Set<number>();
  zoom = 1;
  isDragging = false;
  selectedClassId: string | null = null;
  private relationships: UmlRelationship[] = [];

  readonly formFieldLimit = UML_FORM_FIELD_LIMIT;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private suppressNextClassClick = false;
  private panStart?: { x: number; y: number; scrollLeft: number; scrollTop: number };
  private pinchStart?: {
    distance: number;
    centerX: number;
    centerY: number;
    zoom: number;
    scrollLeft: number;
    scrollTop: number;
  };

  get formsWithMoreFields(): UmlForm[] {
    return this.forms.filter(form => getUmlFormFieldCount(form) > this.formFieldLimit);
  }

  get zoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  ngOnInit(): void {
    this.route.parent?.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(params => {
          const appId = Number(params.get('appId'));
          if (!Number.isSafeInteger(appId) || appId <= 0) {
            this.loading = false;
            this.error = 'A valid app ID is required to generate the UML diagram.';
            this.cdr.markForCheck();
            return of(null);
          }

          this.appId = appId;
          this.loading = true;
          this.error = '';
          this.diagramSource = '';
          this.expandedFormIds = new Set<number>();
          this.selectedClassId = null;
          this.renderSequence++;

          return forkJoin({
            formRefs: this.formService.getListBasic({ appId }),
            lookupRefs: this.lookupService.getFullLookupList({ appId }),
            datasets: this.datasetService.getDatasetList(appId)
          }).pipe(
            switchMap(({ formRefs, lookupRefs, datasets }) => {
              const forms = records<UmlForm>(formRefs);
              const lookups = records<UmlLookup>(lookupRefs);

              return forkJoin({
                forms: forms.length
                  ? forkJoin(forms.map(form => this.formService.getForm(form.id)))
                  : of([] as UmlForm[]),
                lookups: lookups.length
                  ? forkJoin(lookups.map(lookup => this.lookupService.getLookup(lookup.id)))
                  : of([] as UmlLookup[]),
                datasets: of(records<UmlDataset>(datasets))
              });
            })
          );
        })
      )
      .subscribe({
        next: result => {
          if (!result) return;
          this.forms = result.forms;
          this.lookups = result.lookups;
          this.datasets = result.datasets;
          this.relationships = getUmlRelationships(this.forms, this.lookups, this.datasets);
          this.diagramSource = buildUmlClassDiagram(this.forms, this.lookups, this.datasets);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: error => {
          console.error('Unable to load UML diagram metadata', error);
          this.loading = false;
          this.error = 'Unable to load app forms, lookups, or datasets for the UML diagram.';
          this.cdr.markForCheck();
        }
      });
  }

  toggleFormFields(formId: number): void {
    const expanded = new Set(this.expandedFormIds);
    if (expanded.has(formId)) expanded.delete(formId);
    else expanded.add(formId);
    this.expandedFormIds = expanded;
    void this.rebuildDiagram();
  }

  zoomBy(amount: number): void {
    this.zoom = this.clampZoom(this.zoom + amount);
  }

  resetZoom(): void {
    this.zoom = 1;
  }

  fitDiagram(): void {
    const svg = this.diagramElement?.nativeElement.querySelector('svg');
    const viewport = this.diagramViewport?.nativeElement;
    if (!svg || !viewport) return;

    const bounds = svg.viewBox.baseVal;
    const width = bounds.width || svg.getBoundingClientRect().width;
    const height = bounds.height || svg.getBoundingClientRect().height;
    if (!width || !height) return;

    const availableWidth = Math.max(1, viewport.clientWidth - 32);
    this.zoom = this.clampZoom(Math.min(1, availableWidth / width));
  }

  onPointerDown(event: PointerEvent): void {
    if (this.pointers.size >= 2) return;
    if ((event.target as Element).closest('[data-uml-show-more]')) return;
    const viewport = event.currentTarget as HTMLElement;
    if (this.pointers.size === 0) this.suppressNextClassClick = false;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.isDragging = true;

    if (this.pointers.size === 1) {
      this.panStart = {
        x: event.clientX,
        y: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop
      };
    } else {
      const [first, second] = Array.from(this.pointers.values());
      this.pinchStart = {
        distance: this.pointerDistance(first, second),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
        zoom: this.zoom,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop
      };
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    const viewport = event.currentTarget as HTMLElement;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 2 && this.pinchStart) {
      this.suppressNextClassClick = true;
      for (const pointerId of this.pointers.keys()) {
        if (!viewport.hasPointerCapture(pointerId)) viewport.setPointerCapture(pointerId);
      }
      const [first, second] = Array.from(this.pointers.values());
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      this.zoom = this.clampZoom(
        this.pinchStart.zoom * this.pointerDistance(first, second) / this.pinchStart.distance
      );
      viewport.scrollLeft = this.pinchStart.scrollLeft - (centerX - this.pinchStart.centerX);
      viewport.scrollTop = this.pinchStart.scrollTop - (centerY - this.pinchStart.centerY);
    } else if (this.panStart) {
      if (Math.hypot(event.clientX - this.panStart.x, event.clientY - this.panStart.y) > 4) {
        this.suppressNextClassClick = true;
        if (!viewport.hasPointerCapture(event.pointerId)) viewport.setPointerCapture(event.pointerId);
      }
      viewport.scrollLeft = this.panStart.scrollLeft - (event.clientX - this.panStart.x);
      viewport.scrollTop = this.panStart.scrollTop - (event.clientY - this.panStart.y);
    }
  }

  onPointerEnd(event: PointerEvent): void {
    const viewport = event.currentTarget as HTMLElement;
    this.pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);

    this.pinchStart = undefined;
    if (this.pointers.size === 1) {
      const [point] = Array.from(this.pointers.values());
      this.panStart = {
        x: point.x,
        y: point.y,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop
      };
    } else {
      this.panStart = undefined;
    }
    this.isDragging = this.pointers.size > 0;
  }

  async printDiagram(): Promise<void> {
    this.expandedFormIds = new Set(this.formsWithMoreFields.map(form => form.id));
    await this.rebuildDiagram();
    window.print();
  }

  private selectClass(classId: string): void {
    this.selectedClassId = this.selectedClassId === classId ? null : classId;
    this.applyDiagramHighlight();
  }

  private bindDiagramInteractions(): void {
    const container = this.diagramElement?.nativeElement;
    if (!container) return;

    const groups = Array.from(container.querySelectorAll<SVGGElement>('g.node[id^="classId-"]'));
    const classEntries = [
      ...this.forms.map(form => ({
        classId: `Form_${form.id}`,
        label: form.title || `Form ${form.id}`,
        form
      })),
      ...this.lookups.map(lookup => ({
        classId: `Lookup_${lookup.id}`,
        label: lookup.name || `Lookup ${lookup.id}`,
        form: undefined
      }))
    ];

    for (const entry of classEntries) {
      const group = groups.find(candidate => candidate.id.startsWith(`classId-${entry.classId}-`));
      if (!group) continue;

      group.dataset['umlClassId'] = entry.classId;
      group.setAttribute('role', 'group');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', `${entry.label}. Click to highlight related classes.`);
      group.addEventListener('click', event => {
        if ((event.target as Element).closest('[data-uml-show-more]')) return;
        if (this.suppressNextClassClick) {
          this.suppressNextClassClick = false;
          return;
        }
        this.selectClass(entry.classId);
      });
      group.addEventListener('keydown', event => {
        if (event.target !== group || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        this.selectClass(entry.classId);
      });

      if (!entry.form || getUmlFormFieldCount(entry.form) <= this.formFieldLimit) continue;
      const marker = getUmlFormActionMarker(
        this.expandedFormIds.has(entry.form.id),
        getUmlFormFieldCount(entry.form)
      );
      const markerText = marker.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      const actionLabelGroup = Array.from(group.querySelectorAll('g.label'))
        .find(label => label.textContent?.replace(/[^A-Za-z0-9]/g, '').toLowerCase().includes(markerText));
      const markerLabel = actionLabelGroup?.querySelector<HTMLElement>('.nodeLabel');
      if (!markerLabel) continue;

      const expanded = this.expandedFormIds.has(entry.form.id);
      const actionLabel = expanded
        ? 'Show fewer fields'
        : `Show all ${getUmlFormFieldCount(entry.form)} fields`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'uml-show-more-button';
      button.textContent = actionLabel;
      button.setAttribute('aria-label', `${actionLabel} in ${entry.label}`);
      button.dataset['umlShowMore'] = 'true';
      markerLabel.replaceWith(button);

      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleFormFields(entry.form!.id);
      });
    }

    this.applyDiagramHighlight();
  }

  private applyDiagramHighlight(): void {
    const container = this.diagramElement?.nativeElement;
    if (!container) return;

    const related = this.selectedClassId
      ? this.relationships.filter(relationship =>
          relationship.fromClassId === this.selectedClassId ||
          relationship.toClassId === this.selectedClassId)
      : [];
    const relatedClasses = new Set(
      related.flatMap(relationship => [relationship.fromClassId, relationship.toClassId])
    );
    if (this.selectedClassId) relatedClasses.add(this.selectedClassId);
    const relatedEdges = new Set(related.map(relationship => relationship.edgeId));

    for (const group of container.querySelectorAll<SVGGElement>('g.node[id^="classId-"]')) {
      const isRelated = !this.selectedClassId || relatedClasses.has(group.dataset['umlClassId'] ?? '');
      group.classList.toggle('is-highlighted', Boolean(this.selectedClassId && isRelated));
      group.classList.toggle('is-dimmed', Boolean(this.selectedClassId && !isRelated));
    }

    for (const edge of container.querySelectorAll<SVGPathElement>('path.relation')) {
      const isRelated = !this.selectedClassId || relatedEdges.has(edge.id);
      edge.classList.toggle('is-highlighted', Boolean(this.selectedClassId && isRelated));
      edge.classList.toggle('is-dimmed', Boolean(this.selectedClassId && !isRelated));
    }
  }

  private async rebuildDiagram(): Promise<void> {
    this.diagramSource = buildUmlClassDiagram(
      this.forms,
      this.lookups,
      this.datasets,
      this.expandedFormIds
    );
    this.cdr.markForCheck();
    await this.renderDiagram();
  }

  private clampZoom(value: number): number {
    return Math.max(0.25, Math.min(3, value));
  }

  private pointerDistance(first: { x: number; y: number }, second: { x: number; y: number }): number {
    return Math.max(1, Math.hypot(first.x - second.x, first.y - second.y));
  }

  private async renderDiagram(): Promise<void> {
    const sequence = ++this.renderSequence;
    const source = this.diagramSource;
    if (!source || !this.diagramElement) return;

    try {
      mermaid.initialize({
        startOnLoad: false,
        layout: 'dagre',
        class: {
          defaultRenderer: 'dagre-wrapper',
          nodeSpacing: 36,
          rankSpacing: 48,
          diagramPadding: 24
        }
      });
      const { svg } = await mermaid.render(`uml_diagram_${this.appId}_${sequence}`, source);
      if (sequence !== this.renderSequence || !this.diagramElement) return;
      this.diagramElement.nativeElement.innerHTML = svg;
      this.bindDiagramInteractions();
      requestAnimationFrame(() => this.fitDiagram());
    } catch (error) {
      console.error('Unable to render UML diagram', error);
      if (sequence !== this.renderSequence) return;
      this.error = 'Unable to render the UML diagram.';
      this.cdr.markForCheck();
    }
  }
}
