import { Pipe, PipeTransform } from '@angular/core';
import { byString } from '../utils';
import { DatePipe } from '@angular/common';

@Pipe({
    name: 'groupBy',
    standalone: true,
    pure: true // ensures Angular caches results unless input changes
})
export class GroupByPipe implements PipeTransform {

    datePipe = new DatePipe('en-US');

  transform(collection: any[], property: string, enabled:boolean=true, sort?:string): any[] {
    // prevents the application from breaking if the array of objects doesn't exist yet
    if(!collection) {
        return null;
    }

    // make immutable copy
    const cloned = collection.map((item, index) => ({ ...item, __index: index }));


    if(!property || !enabled){
        return [{key:'Ungroup',value:cloned}];
    }

    let splitted = property.split(/[|:]/);
    // console.log(splitted)

    var mapOrder = {};

    let groupedCollection:any={}
    if (splitted.length>1 && splitted[1]=='date'){
        groupedCollection = cloned.reduce((previous, current)=> {
            let v = this.datePipe.transform(byString(current,splitted[0]),splitted[2]);
            // if sort included
            if (sort){
                let so = byString(current,sort);
                mapOrder[v]=so;
            }

            if(!previous[v]) {
                previous[v] = [current];
            } else {
                previous[v].push(current);
            }
            return previous;
        }, {});  
    }else{
        groupedCollection = cloned.reduce((previous, current)=> {
            let v = byString(current,property);
            // if sort included
            if (sort){
                let so = byString(current,sort);
                mapOrder[v]=so;
            }
            if(!previous[v]) {
                previous[v] = [current];
            } else {
                previous[v].push(current);
            }
            return previous;
        }, {});   
    }

    // console.log('groupedCollection', groupedCollection);

    // this will return an array of objects, each object containing a group of objects
    var list = Object
    .keys(groupedCollection).map(key => ({ key, value: groupedCollection[key],sortOrder: mapOrder[key] }));

    if (sort){
        list.sort((a,b)=> a.sortOrder - b.sortOrder)
    }

    return list;
        // .sort((a,b) => (a.sortOrder > b.last_nom) ? 1 : ((b.last_nom > a.last_nom) ? -1 : 0));
  }

}
