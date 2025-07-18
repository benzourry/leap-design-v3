import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'iconSplit' })
export class IconSplitPipe implements PipeTransform {
  transform(str: string, defaultIcon: string = 'far:file'): string[] {
    return str ? str.split(':') : defaultIcon.split(':');
  }
}