import { Pipe, PipeTransform } from '@angular/core';
import { byString } from '../utils';

@Pipe({
    name: 'orderBy',
    standalone: true
})
export class OrderByPipe implements PipeTransform {

  transform(array: Array<any>, orderField: string, orderType: boolean): Array<string> {
    if (array !== undefined) {
      array.sort((a: any, b: any) => {
        // let ae = a[orderField];
        let ae = byString(a,orderField);
        // let be = b[orderField];
        let be = byString(b,orderField);
        console.log("sort",orderField,ae,be)
        if (ae == undefined && be == undefined) return 0;
        if (ae == undefined && be != undefined) return orderType ? 1 : -1;
        if (ae != undefined && be == undefined) return orderType ? -1 : 1;
        if (ae == be) return 0;
        return orderType ? (ae.toString().toLowerCase() > be.toString().toLowerCase() ? -1 : 1) : (be.toString().toLowerCase() > ae.toString().toLowerCase() ? -1 : 1);
      });
    }
    console.log(array);
    return array;
  }

}
