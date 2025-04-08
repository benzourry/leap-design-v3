import { formatNumber } from '@angular/common';
import { baseApi } from './constant.service';
import dayjs from 'dayjs';
import {marked} from 'marked';
import mermaid from 'mermaid';
// import mermaid from "mermaid";


var svgCache:any={}
marked.use({
extensions: [{
    name: 'code',
    renderer({lang, raw, text}) {
    if (lang=='mermaid') {
      let id = 'mermaid_'+Math.abs(hashCode(text));
      // LATER EXPERIMENT WITH DIRECT SVG GENERATION
      if (!svgCache[id]){
        svgCache[id]=`<div class="spinner-grow text-primary" role="status"><span class="visually-hidden">Loading...</span></div>`;
        createMermaidSvg(id,text.replaceAll("\\n","\n")).then(svg=>{
          if (svg){
            var elem = document.getElementById(id);
            elem.innerHTML=svg;
            svgCache[id]=svg;              
          }
        })
      }
      return `<pre id="${id}" class="mermaid" data-processed="true">${svgCache[id]??text}</pre>`;
    } else {
      return `<pre><code>${text}</code></pre>`;
    }
  }
  }]
})

var hashCode = function (s) {
  var h = 0, i = s.length;
  while (i > 0) {
    h = (h << 5) - h + s.charCodeAt(--i) | 0;
  }
  return h;
};

var tplCache: any = {}
export function multiReplace(text, correction) {
  // convert object keys to key1_|key2_|key3_
  const reg = new RegExp(Object.keys(correction).join("|"), "g");
  return (text+"")?.replace(reg, (matched) => correction[matched]);
}
const tag2sym = { table: 'table_', tr: 'tr_', td: 'td_', th: 'th_', tbody: 'tbody_', thead: 'thead_', src:'src_' }
const sym2tag = { table_: 'table', tr_: 'tr', td_: 'td', th_: 'th', tbody_: 'tbody', thead_: 'thead', src_:'src' }

export function compileTpl(templateText, data) {

  let code = "";
  let tplHashCode = hashCode(templateText);
  // let templateText = rawTpl;
  if (tplCache[tplHashCode]) {
    code = tplCache[tplHashCode];
  } else {
    /// NEW Support for x-foreach and x-if as attributes
    /// Problem with current <x-foreach> with table because of parseFromString
    try {
      // use createElement allow styles
      // var doc: Document = new DOMParser().parseFromString(templateText, 'text/html');
      // problem mun dlm x-if da table fulltpl (xda tbody) fail utk replace oritag (ada tbody sbb querySelector) so, maintain code lamak n xpa
      // var fulltpl = templateText;
      // replace sensitive tag such as table, etc to prevent doc refactoring
      let fulltpl = multiReplace(templateText, tag2sym);
      // let fulltpl = templateText.replace(/table|tr|td|th|tbody|thead/gi, m=>replacement[m])

      let doc: HTMLElement = document.createElement("x-template"); 
      // need root element to use querySelector, use noscript to prevent image being loaded
      // revert back to x-template because noscript issue with inline x-foreach, x-for and x-if
      doc.innerHTML = fulltpl;

      let fn = function (doc, xscpl) {
        let elems = doc.querySelectorAll(`[${xscpl}]`);
        elems.forEach(e => {
          let oritag = e.outerHTML; // original tag with attributes
          let scpl = e.getAttribute(xscpl);
          e.removeAttribute(xscpl);
          fulltpl = fulltpl.replace(oritag, `<!--##--${xscpl} $="${scpl}"!--##-->${e.outerHTML}<!--##--/${xscpl}!--##-->`);
        })
      }
      fn(doc, 'x-foreach');
      fn(doc, 'x-for');
      fn(doc, 'x-if');

      templateText = multiReplace(fulltpl.replace(/!--##--/gi, ""), sym2tag);

    } catch (err) {
      console.log(err);
    }
    //// END

    code = ("Object.assign(this,data);var output=" +
      (JSON.stringify(templateText) || templateText)
        .replace(/\<\!\-\-(.+?)\-\-\>/g, '') // remove <!-- -->
        .replace(/\{\{(.+?)\}\}/g, r$val) // replace {{}}
        .replace(/\[\#(.+?)\#\]/g, r$script) // replace [##]
        .replace(/<x-if\s*\$=\\\"(.+?)\\\"\s*>/ig, '";if($1){\noutput+="') // replace <x-if x="true">
        .replace(/<x-else\s*\/?\s*>/ig, '";}else{\noutput+="')
        .replace(/<x-else-if\s*\$=\\\"(.+?)\\\"\s*\/?\s*>/ig, '";}else if($1){\noutput+="')
        .replace(/<\/x-if>/ig, '";}\noutput+="')
        .replace(/<x-for\s*\$\=\\\"(.+?)\\\"\s*>/ig, '";for($1){\noutput+="') // replace <x-for x="i=0;i<5;i++">
        .replace(/<\/x-for>/ig, '";}\noutput+="')
        .replace(/<x-foreach\s*\$=\\\"(.+?)\\\"\s*>/ig, r$foreach) // replace <x-foreach x="i of list">
        .replace(/<\/x-foreach>/ig, '";})\noutput+="')
        // .replace(/<x-markdown>(.+?)<\/x-markdown>/ig, r$markdown) 
        .replace(/\<\?(.+?)\?\>/g, '";$1\noutput+="')+ //replace <??>
      ";return output;")
      .replace(/(?:^|<\/x-markdown>)[^]*?(?:<x-markdown>|$)/g, function(m) {
        return m.replace(/(?:\\[rnt])+/gm, ""); // replace newline except within x-markdown
      });
    tplCache[tplHashCode] = code;
  }

  if (templateText && data) {
    data.dayjs = dayjs;
    let result = "";
    try {
      result = new Function(
        "data", "get", "formatNumber", code)(data, get, formatNumber);

      result = (result+"")
              .replaceAll("\n","\\n") // no newline or next replace not working
              .replace(/<x-markdown>(.+?)<\/x-markdown>/ig, r$markdown) // process markdown only after all binding has been processed
              .replaceAll("\\n","\n") // reconvert \\n to \n

    } catch (err) {
      throw err;
    }
    return result;
  } else {
    return templateText;
  }
}

function r$markdown(match,p1){
  // first replace <newline> -> \n utk parse. Lepas ya \n -> <newline>
  return marked.parse(p1.replaceAll("\\n","\n")).toString().trim()
  .replace('<table>', '<table class="table table-bordered m-0">')
  .replace('<blockquote>', '<blockquote class="blockquote">')
  // let parsed = marked.parse(p1.replaceAll("\\n","\n")).toString().replaceAll("\n","\\n").toString().trim(); 
}

async function createMermaidSvg(id, text){
  let svg = null;
  if (await mermaid.parse(text, {suppressErrors:true})) {
    let elem = document.createElement("div");
    document.body.appendChild(elem);
    elem.id = id+"_svg";
    svg = (await mermaid.render(elem.id,text)).svg;
  }else{
    svg = new Promise(resolve=>resolve(`<div class="text-danger">Invalid <strong>Mermaid</strong> syntax</div>`));
    console.log("#####Mermaid syntax Error")
  } 
  return svg;
}

function r$foreach(match, p1) {
  // x-foreach="let a of list|filter:a.name=='sad'"
  // let inside = match.replace(/<x-foreach x=\\\"/ig, '').replace(/\\\">/ig,'');
  let part = p1.split(" of ");
  return `";${part[1].trim()} && ${part[1].trim()}?.forEach(function(${part[0].trim()},$index){\noutput+="`;
}
function r$script(match, p1) {
  // match.replace(/\[#|#\]/ig,''). 
  return `";${p1.replace(/&nbsp;/ig, '')}\noutput+="`
}
// Masalah mn run async operation dlm compileTpl, result akan update tpl n akan retrigger async, thus infinite retrigger
// function r$include(match, p1) {
//   let part = p1.split(" of ");
//   return `";fetch("${part[1].trim()}").then((${part[0].trim()})=>{\noutput+="`;
//   // return `";${part[1].trim()} && ${part[1].trim()}?.forEach(function(${part[0].trim()},$index){\noutput+="`;
// }
function r$val(match, p1, p2, p3, offset, string) {
  let aVal = "";
  p1 = p1.replace(/\\"/g, '"');
  let regex = /(['"].*?["']|[^"|:\s]+)(?=\s*|:\s*$)/ig;
  let splitted = p1.match(regex);
  // "+get(function(){return      },"")+"
  if (splitted.length > 1) {
    switch (splitted[1]) {
      case 'date':
        aVal = key('(new Date(' + splitted[0] + ')).toDateString()');//.toUTCString();
        if (splitted[2]) {
          aVal = key(`dayjs(new Date(${splitted[0]})).format(${splitted[2]})`);
        }
        break;
      case 'imgSrc':
      case 'src':
        var type = "";
        if (splitted[2]) {
          type = splitted[2] + "/";
        }
        aVal = baseApi + '/entry/file/' + type + key(splitted[0], 'encodeURI');
        break;
      case 'qr':
        aVal = baseApi + '/form/qr?code=' + key(splitted[0],'encodeURIComponent');
        break;
      case 'json':
        aVal = key(`JSON.stringify(${splitted[0]})`);
        break;
      case 'number':
        aVal = key(`formatNumber(${splitted[0]},'en-US',${splitted[2]})`);
        break;
      default:
        aVal = key(p1);
    }
  } else {
    aVal = key(p1);
  }
  return aVal;
}
function key(key, wrapFn?) {
  return '"+get(function(){return ' + key + ' },"",' + wrapFn + ')+"';
}

function get(fn, defaultVal, wrapFn) {
  try {
    var val = wrapFn ? wrapFn(fn()) : fn();
    return (typeof val == "undefined" || val === null) ? defaultVal : val;
  } catch (e) {
    return defaultVal;
  }
}


export function mobileAndTabletCheck() {
  return /Mobi|Android/i.test(navigator.userAgent);
}


interface IResizeImageOptions {
  maxSize: number;
  file: File;
}
export const resizeImage = (settings: IResizeImageOptions) => {
  return resizeImageBlob(settings);
}
export const resizeImageBlob = (settings: IResizeImageOptions) => {
  if (!settings.maxSize) {
    return Promise.resolve(settings.file);
  }
  const file = settings.file;
  const maxSize = settings.maxSize;
  const reader = new FileReader();
  const image = new Image();
  const canvas = document.createElement('canvas');
  const dataURItoBlob = (dataURI: string) => {
    const bytes = dataURI.split(',')[0].indexOf('base64') >= 0 ?
      atob(dataURI.split(',')[1]) :
      encodeURI(dataURI.split(',')[1]);
    const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const max = bytes.length;
    const ia = new Uint8Array(max);
    for (var i = 0; i < max; i++) ia[i] = bytes.charCodeAt(i);
    return new Blob([ia], { type: mime });
  };
  const resize = () => {
    let width = image.width;
    let height = image.height;

    if (width > height) {
      if (width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
      }
    }

    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "#FFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    let dataUrl = canvas.toDataURL('image/jpeg');
    return dataURItoBlob(dataUrl);
  };

  return new Promise((ok, no) => {
    if (!file.type.match(/image.*/)) {
      no(new Error("Not an image"));
      return;
    }

    reader.onload = (readerEvent: any) => {
      image.onload = () => ok(resize());
      image.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  })
};

export function loadScript(src, callback, error) {
  return new Promise<void>(function (resolve, reject) {
    if (src.includes('.mjs')) {
      import(/* @vite-ignore */ src)
        .then((module) => {
          callback && callback(module);
          resolve();
        })
        .catch((err) => {
          error && error(err);
          reject(err);
        })
    } else {
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = src;
      s.async = true;
      s.onerror = function (err) {
        error && error(err);
        reject(err);
      };
      s.onload = function () {
        callback && callback();
        resolve();
      };
      const t = document.getElementsByTagName('script')[0];
      t.parentElement.insertBefore(s, t);
    }
  });
}


// var httpClient = inject(HttpClient)
// export function getServerDate() {
//   return lastValueFrom(httpClient.head(window.location.href.toString(), {observe:'response', headers:{'Content-Type':'text/html', 'Cache-Control':'no-cache'}})
//     .pipe(
//       map(res=>{
//         return new Date(res['headers'].get("Date"))
//       })
//     ));
// }
// this caused failure when offline with service worker!!!!
export function getServerDate() {
  let rd: Date = new Date();
  try{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("HEAD", window.location.href.toString(), false);
    xmlHttp.setRequestHeader("Content-Type", "text/html");
    xmlHttp.setRequestHeader("Cache-Control", "no-cache");
    xmlHttp.send("");
    rd = new Date(xmlHttp.getResponseHeader("Date"));
  }catch(e){}
  return rd;
}

var serverTimeOffset;
export function getServerTimeOffset() {
  if (serverTimeOffset == null) {
    var date = getServerDate();
    serverTimeOffset = date.getTime() - Date.now();
  }
  return serverTimeOffset;
}

function getServerDateNow() {
  return Date.now() + getServerTimeOffset();
}

export var ServerDate = {
  now: getServerDateNow,
  offset: getServerTimeOffset()
}

export function tblToExcel(title, html) {
  var uri = 'data:application/vnd.ms-excel;base64,';
  var template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>';
  var base64 = function (s) {
    return window.btoa(unescape(encodeURIComponent(s)))
  };

  var format = function (s, c) {
    return s.replace(/{(\w+)}/g, function (m, p) {
      return c[p];
    })
  };

  var ctx = {
    worksheet: title,
    table: html
  }

  var link = document.createElement("a");
  link.download = title + ".xls";
  link.href = uri + base64(format(template, ctx));
  link.click();
}

export function getQuery(e) {
  var n = new RegExp("[\\?&]" + e + "=([^&#]*)").exec(location.href);
  return null === n ? "" : decodeURIComponent(n[1].replace(/\+/g, " "))
}

export function cleanText(str) { return str ? str.replace(/<\/?[^>]+(>|$)/g, " ") : str; }

export function isValue(value) { return !(typeof value === 'object' || Array.isArray(value) || value === null); }

export const nl2br = (text) => text ? String(text).replace(/\n/g, "<br/>") : text;
export const br2nl = (text) => text ? String(text).replace(/<br\s*[\/]?>/gi, "\n") : text;

export const toSpaceCase = (string) => String(string).replace(/[^\w\s$_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim()
export const toSnakeCase = (string) => string ? toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';
export const toHyphen = (string) => string ? toSpaceCase(string).replace(/\s/g, '-').toLowerCase() : '';

export function btoaUTF(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode(parseInt(p1, 16))
  }))
}

export function atobUTF(str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''))
}

export const deepMerge = (target, source) => {
  // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
  if (source != null) {
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        Object.assign(source[key], deepMerge(target[key], source[key]))
      }
    }
  }

  // Join `target` and modified `source`
  Object.assign(target || {}, source)
  return target;
}

// function parseCSVOld(content: string): any[string] {
//   return content.split(/,(?=(?:(?:[^"']*["']){2})*[^"']*$)/)
//     .map(refi => refi
//       .trim()
//       // .replace(/[\x00-\x08\x0E-\x1F\x7F-\uFFFF]/g, "")
//       .replace("\n", "")
//       .replace(/^"|"$|"(?=,")|(?<=",)"/g, ""));
// }


function parseCSV(input) {
  const parts = [];
  let currentPart = '';

  let withinQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"') {
      withinQuotes = !withinQuotes;
    } else if (char === ',' && !withinQuotes) {
      parts.push(currentPart.trim());
      currentPart = '';
    } else {
      currentPart += char;
    }
  }

  // Push the last part after the loop ends
  parts.push(currentPart.trim());

  return parts;
}

export function splitAsList(str) {
  return str && parseCSV(str);
}

export function hashObject(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

export function linkify(str){
  return str?.replace(
    /(<a href=")?((https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)))(">(.*)<\/a>)?/gi,
    function () {
      var url = arguments[2];
      if (arguments[2].endsWith(".")) url = url.slice(0,-1);
      return (
        '<a href="' +
        url +
        '" target="_blank">' +
        (arguments[7] || url) +
        "</a>" +
        (arguments[2].endsWith(".")?".":"")
      );
    }
  );
};

export function targetBlank(result){
  result = result.replace(/(<a [^>]*)(target="[^"]*")([^>]*>)/gi, '$1$3');
  result = result.replace(/(<a [^>]*)(>)/gi, '$1 target="_blank"$2');
  return result;
}

export function imagify(text) {
  // Regular expression to find URLs ending with common image extensions
  const imageRegex = /(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|bmp))/gi;

  // Find all image URLs
  const imageUrls = text.match(imageRegex);

  if (imageUrls) {
    text+=`<div class="mt-2 row g-1">`;
      [...new Set(imageUrls)].forEach(url => {
        text = text + `<div class="col"><img class="img-thumbnail" src="${url}" width="100%" alt="${url}"></div>`;
      });
      text+=`</div>`;
  }
  return text;
}

export function byString(o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, '');           // strip a leading dot
  var a = s.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
      var k = a[i];
      if (typeof o === 'object'){
        if (k in o) {
            o = o[k];
        } else {
            return;
        }        
      }else{
        return;
      }
  }
  return o;
}

export function getFileExt(filename){
  var re = /(?:\.([^.]+))?$/;
  var ext = re.exec(filename)[1];
  return ext?'.'+ext:'';  
}

