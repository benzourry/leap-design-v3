import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filter',
    standalone: true
})
export class FilterPipe implements PipeTransform {

  // transform(value: any, args?: any): any {
  //   if(!value) return [];
  //   if(!args) return value;

  //   args = args.toLowerCase();
  //       return value.filter( it => {
  //         return it.name.toLowerCase().includes(args);
  //       });
  // }

  transform(items: any[], filter: any): any {
    if (!items || !filter) {
      return items;
    }

    let f:string="";
    if (typeof filter === 'object'){
      f = JSON.stringify(filter); 
    }else{
      f=filter
    }

    // console.log(filter);
    // To search in values of every variable of your object(item)
    return items.filter(item => JSON.stringify(item).toLowerCase().indexOf(f.toLowerCase()) !== -1);


    //   return items.filter(obj=>{
    //     return Object.keys(obj)
    //     .some(k => { 
    //         return obj[k].indexOf(filter) !== -1; 
    //     });
    // });

    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    // return items.filter(item => item.indexOf(filter) !== -1);
    // if (!items || !filter) {
    //   return items;
    // }
    // filter items array, items which match and return true will be kept, false will be filtered out
    // return items.filter((item: any) => this.applyFilter(item, filter));


  }


  applyFilter(book: any, filter: any): boolean {
    for (let field in filter) {
      if (typeof (filter) === 'string') {
        if (book[field]) {
          if (book[field].toLowerCase().indexOf(filter.toLowerCase()) === -1) {
            return false;
          }
        }
      } else {
        if (filter[field]) {
          if (typeof filter[field] === 'string') {
            if (book[field]) {
              if (book[field].toLowerCase().indexOf(filter[field].toLowerCase()) === -1) {
                return false;
              }
            }
          } else if (typeof filter[field] === 'number') {
            if (book[field]) {
              if (book[field] !== filter[field]) {
                return false;
              }
            }
          }
        }
      }

    }
    return true;
  }

}
