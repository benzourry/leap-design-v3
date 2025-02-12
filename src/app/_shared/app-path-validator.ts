import { Injectable, Directive, forwardRef, Input } from "@angular/core";
import { AsyncValidator, AbstractControl, ValidationErrors, NG_ASYNC_VALIDATORS } from "@angular/forms";
import { Observable } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { AppService } from "../service/app.service";

@Directive({
    selector: '[uniqueAppPath]',
    providers: [
        {
            provide: NG_ASYNC_VALIDATORS,
            useExisting: forwardRef(() => UniqueAppPathDirective),
            multi: true
        }
    ],
    standalone: true
})
export class UniqueAppPathDirective implements AsyncValidator {
    constructor( private appService: AppService) { }

    @Input('uniqueAppPath') uniqueAppPath: string;

    @Input('uniqueAppPathFn') fn;

    validate(
        ctrl: AbstractControl
    ): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
        return this.fn(ctrl.value).pipe(
            map(res => (res && this.uniqueAppPath!=ctrl.value ? { uniqueAppPath: true } : null)),
            catchError(() => null)
        );
    }
}
