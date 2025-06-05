import { formatNumber } from '@angular/common';
import { baseApi } from './constant.service';
import dayjs from 'dayjs';
import { marked } from 'marked';
import mermaid from 'mermaid';

const svgCache: Record<string, string> = {};
const tplCache: Record<number, string> = {};

const hashCode = (s: string): number =>
  s?.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

marked.use({
  extensions: [{
    name: 'code',
    renderer: ({ lang, text }) => {
      if (lang === 'mermaid') {
        const id = `mermaid_${Math.abs(hashCode(text))}`;
        if (!svgCache[id]) {
          svgCache[id] = `<div class="spinner-grow text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                          </div>`;
          createMermaidSvg(id, text.replaceAll("\\n", "\n")).then(svg => {
            const elem = document.getElementById(id);
            if (elem) elem.innerHTML = svg;
            svgCache[id] = svg;
          });
        }
        return `<pre id="${id}" class="mermaid" data-processed="true">${svgCache[id] ?? text}</pre>`;
      }
      return `<pre><code>${text}</code></pre>`;
    }
  }]
});

const multiReplace = (text: string, map: Record<string, string>): string => {
  const reg = new RegExp(Object.keys(map).join("|"), "g");
  return text.replace(reg, m => map[m]);
};

const tag2sym = { table: 'table_', tr: 'tr_', td: 'td_', th: 'th_', tbody: 'tbody_', thead: 'thead_', src:'src_' };
const sym2tag = { table_: 'table', tr_: 'tr', td_: 'td', th_: 'th', tbody_: 'tbody', thead_: 'thead', src_:'src' };

export function compileTpl(templateText: string, data: any): string {
  if (!templateText) return "";
  const tplHash = hashCode(templateText);
  let code = tplCache[tplHash];

  if (!code) {
    let fullTpl = multiReplace(templateText, tag2sym);
    const doc = document.createElement("x-template");
    doc.innerHTML = fullTpl;
    ['x-foreach', 'x-for', 'x-if'].forEach(attr => {
      doc.querySelectorAll(`[${attr}]`).forEach(e => {
        const val = e.getAttribute(attr);
        fullTpl = fullTpl.replace(e.outerHTML,
          `<!--##--${attr} $="${val}"!--##-->${e.outerHTML}<!--##--/${attr}!--##-->`);
      });
    });
    templateText = multiReplace(fullTpl.replace(/!--##--/gi, ""), sym2tag);
    code = (
      "Object.assign(this, data);var output=" +
      JSON.stringify(templateText)
        .replace(/<!--(.+?)-->/g, '')
        .replace(/\{\{(.+?)\}\}/g, r$val)
        .replace(/\[#(.+?)#\]/g, r$script)
        .replace(/<x-if\s*\$=\\\"(.+?)\\\"\s*>/ig, '";if($1){\noutput+="')
        .replace(/<x-else\s*\/?\s*>/ig, '";}else{\noutput+="')
        .replace(/<x-else-if\s*\$=\\\"(.+?)\\\"\s*\/?\s*>/ig, '";}else if($1){\noutput+="')
        .replace(/<\/x-if>/ig, '";}\noutput+="')
        .replace(/<x-for\s*\$\=\\\"(.+?)\\\"\s*>/ig, '";for($1){\noutput+="')
        .replace(/<\/x-for>/ig, '";}\noutput+="')
        .replace(/<x-foreach\s*\$\=\\\"(.+?)\\\"\s*>/ig, r$foreach)
        .replace(/<\/x-foreach>/ig, '";})\noutput+="')
        .replace(/<\?(.+?)\?>/g, '";$1\noutput+="')
      + ";return output;"
    ).replace(/(?:^|<\/x-markdown>)[\s\S]*?(?:<x-markdown>|$)/g, m => m); //.replace(/(?:\\[rnt])+/gm, "")
    tplCache[tplHash] = code;
  }

  if (templateText && data) {
    data.dayjs = dayjs;
    let result = "";
    try {
      result = new Function("data", "get", "formatNumber", code)(data, get, formatNumber);
      result = result.replaceAll("\n", "\\n")
                     .replace(/<x-markdown>(.+?)<\/x-markdown>/ig, r$markdown)
                     .replaceAll("\\n", "\n");
    } catch (err) {
      throw err;
    }
    return result;
  }
  return templateText;
}

function r$markdown(match: string, p1: string): string {
  return marked.parse(p1.replaceAll("\\n", "\n")).toString().trim()
         .replace('<table>', '<table class="table table-bordered m-0">')
         .replace('<blockquote>', '<blockquote class="blockquote">');
}

async function createMermaidSvg(id: string, text: string): Promise<string> {
  if (await mermaid.parse(text, { suppressErrors: true })) {
    const elem = document.createElement("div");
    document.body.appendChild(elem);
    elem.id = `${id}_svg`;
    const { svg } = await mermaid.render(elem.id, text);
    return svg;
  }
  console.error("Mermaid syntax error");
  return `<div class="text-danger">Invalid <strong>Mermaid</strong> syntax</div>`;
}

function r$foreach(match: string, p1: string): string {
  const [iterator, list] = p1.split(" of ").map(s => s.trim());
  return `";${list} && Array.isArray(${list}) && ${list}.forEach(function(${iterator}, $index){\noutput+="`;
}

function r$script(match: string, p1: string): string {
  return `";${p1.replace(/&nbsp;/ig, '')}\noutput+="`;
}

function r$val(match: string, p1: string): string {
  p1 = p1.replace(/\\"/g, '"');
  const parts = p1.match(/(['"].*?["']|[^"|:\s]+)/g) || [];
  let aVal = "";
  if (parts.length > 1) {
    switch (parts[1]) {
      case 'date':
        aVal = key(`(new Date(${parts[0]})).toDateString()`);
        if (parts[2]) aVal = key(`dayjs(new Date(${parts[0]})).format(${parts[2]})`);
        break;
      case 'imgSrc':
      case 'src': {
        const type = parts[2] ? `${parts[2]}/` : "";
        aVal = baseApi + '/entry/file/' + type + key(parts[0], 'encodeURI');
        break;
      }
      case 'qr':
        aVal = baseApi + '/form/qr?code=' + key(parts[0], 'encodeURIComponent');
        break;
      case 'json':
        aVal = key(`JSON.stringify(${parts[0]})`);
        break;
      case 'number':
        aVal = key(`formatNumber(${parts[0]},'en-US',${parts[2]})`);
        break;
      default:
        aVal = key(p1);
    }
  } else {
    aVal = key(p1);
  }
  return aVal;
}

function key(expr: string, wrapFn?: string): string {
  return `"+get(()=>${expr},"",${wrapFn || ''})+"`;
}

function get(fn: () => any, defaultVal: any, wrapFn?: (val: any) => any): any {
  try {
    const val = wrapFn ? wrapFn(fn()) : fn();
    return val == null ? defaultVal : val;
  } catch {
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

export const deepMerge = (t, s) => {

  var source = Object.assign({}, s);
  var target = Object.assign({}, t);
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