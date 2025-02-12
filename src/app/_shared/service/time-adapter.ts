import { Injectable } from "@angular/core";
import { NgbTimeAdapter, NgbTimeStruct } from "@ng-bootstrap/ng-bootstrap";

// function isInteger(value: any): value is number {
//   return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
// }

// function isString(value: any): value is string {
//   return typeof value === 'string';
// }

@Injectable({
  providedIn: 'root'
})
export class NgbUnixTimestampTimeAdapter extends NgbTimeAdapter<number> {

  private year: number = new Date().getFullYear();
  private month: number = new Date().getMonth() + 1;
  private day: number = new Date().getDate();

  fromModel(number): NgbTimeStruct {

    // console.log(number);
    var date = new Date(number);
    // console.log(date);
    const isValidDate = !isNaN(date.valueOf());

    if (!isValidDate){
      // console.log("frommodel")
      // console.log("in not valid", isValidDate, date, number)
      date = new Date();
      date.setHours(0,0,0);
    }

    // if (!dateString || !isString(dateString) || !isValidDate) {
    //   return null;
    // }

    this.year = date.getFullYear();
    this.month = date.getMonth() + 1;
    this.day = date.getDate();

    // console.log(date.getHours());

    return { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() };

  //  var f: Date = new Date(number);
  //   return number == null? null : {
  //     year: f.getFullYear(),
  //     month: f.getMonth() + 1,
  //     day: f.getDate(),
  //   };
  }

  toModel(time: NgbTimeStruct): number {
    /*
    // var d: Date = new Date(date.year, date.month, date.day);
    var d:Date = date && date.year && date.month ? new Date(date.year, date.month - 1, date.day, 12) : null;

    // var t:number=d?Math.round((d).getTime()):null;
    // console.log("toModel:"+ d+":");

    // if (!date || !isInt(date.day) || !isInt(date.day) || !isInt(date.day)) {
    //   return null;
    // }
    

    return d?Math.round((d).getTime()):null;// moment(`${date.year}-${date.month}-${date.day}`, 'YYYY-MM-DD');
    */

  //  if (time && isInteger(time.hour) && isInteger(time.minute) && isInteger(time.second)) {
    const year = this.year;
    const month = this.month;
    const day = this.day;

    const hour = time.hour;
    const minute = time.minute;
    const seconds = time.second;
    // const second = time.second;


    var d:Date = new Date(year, month - 1, day, hour, minute, seconds);

    return d?Math.round((d).getTime()):null;// moment(`${date.year}-${date.month}-${date.day}`, 'YYYY-MM-DD');

    // return `${year}-${month}-${day}T${hour}:${minute}:${second}+00:00`;
  // }

  // return null;
  }
}