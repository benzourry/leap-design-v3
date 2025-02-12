import { Injectable } from "@angular/core";
import { NgbDateStruct, NgbDateAdapter } from "@ng-bootstrap/ng-bootstrap";

@Injectable({
  providedIn: 'root'
})
export class NgbUnixTimestampAdapter extends NgbDateAdapter<number> {

  // private year: number = new Date().getUTCFullYear();
  // private month: number = new Date().getUTCMonth() + 1;
  // private day: number = new Date().getUTCDate();

  fromModel(number): NgbDateStruct {

   var f: Date = new Date(number);

  //  return number == null? null : {
  //     year : f.getUTCFullYear(),
  //     month : f.getUTCMonth() + 1,
  //     day : f.getUTCDate()
  //  };

  // console.log(Number.isInteger(number));

    return (number == null || !Number.isInteger(number))? null : {
      year: f.getFullYear(),
      month: f.getMonth() + 1,
      day: f.getDate(),
    };
  }

  toModel(date: NgbDateStruct): number {
    
    // var d: Date = new Date(date.year, date.month, date.day);
    var d:Date = date && date.year && date.month ? new Date(date.year, date.month - 1, date.day, 0, 0, 0) : null;

    // var t:number=d?Math.round((d).getTime()):null;
    // console.log("toModel:"+ d+":");

    // if (!date || !isInt(date.day) || !isInt(date.day) || !isInt(date.day)) {
    //   return null;
    // }

    return d?Math.round((d).getTime()):null;// moment(`${date.year}-${date.month}-${date.day}`, 'YYYY-MM-DD');
  }
}