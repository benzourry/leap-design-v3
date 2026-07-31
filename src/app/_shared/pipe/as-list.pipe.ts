import { Pipe, PipeTransform } from '@angular/core';
import { splitAsList } from '../utils'; // <-- Adjust this path to your actual utility file

@Pipe({
  name: 'asList',
  standalone: true,
  pure: true
})
export class AsListPipe implements PipeTransform {
  transform(value: string | null | undefined): string[] {
    if (!value) return [];
    
    const result = splitAsList(value);
    return result ? result : [];
  }
}