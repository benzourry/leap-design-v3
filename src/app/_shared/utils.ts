import { formatNumber } from '@angular/common';
import { baseApi, domainBase, domainRegex } from './constant.service';
import dayjs from 'dayjs';
import { marked } from 'marked';
import mermaid from 'mermaid';

// const tplCache: Record<number, string> = {};
const hashCode = (s: string): number =>
  s?.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

const svgCache: Record<string, string> = {};
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
          createMermaidSvg(id, text).then(svg => {
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
const htmlEntities = {'&lt;': '<','&gt;': '>','&amp;': '&','&quot;': '"','&#39;': "'",'&apos;': "'"};


// Updated cache type to store the compiled Function
const tplCache = new Map<string, Function>();

export function compileTpl(templateText: string, data: any, scopeId: string): string {
  if (!templateText) return "";

  let cachedFn = tplCache.get(templateText);
  // let code = tplCache[tplHash];


  if (!cachedFn) {
    let fullTpl = multiReplace(templateText, tag2sym);
    const doc = document.createElement("x-template");
    doc.innerHTML = fullTpl;
    ['x-foreach', 'x-for', 'x-if'].forEach(attr => {
      doc.querySelectorAll(`[${attr}]`).forEach(e => {
        const val = e.getAttribute(attr);
        // clone the node so we can edit it without touching doc
        const clone = e.cloneNode(true) as HTMLElement;
        // remove the triggering attribute from the *inner* element
        clone.removeAttribute(attr);

        fullTpl = fullTpl.replace(multiReplace(e.outerHTML, htmlEntities),
          `<!--##--${attr} $="${val}"!--##-->${multiReplace(clone.outerHTML, htmlEntities)}<!--##--/${attr}!--##-->`);
        // Problem dgn replace mn inside nya ada => or > < sbb e.outerHTML akan kenak encode jd &gt;, tp dlm fullTpl nya. So, x match utk direplace.
        // tapi dh disetel pake multiReplace(htmlEntities)
      });
    });

    templateText = multiReplace(fullTpl.replace(/!--##--/gi, ""), sym2tag);

    // using with() to prevent data leaked to the global scope. However, popobj must resides in
    // global to enable onclick handler (only work globally) to work.
    const code = (
      "return (()=>{" +      
      "with(data){" +
      // "Object.assign(this, data);" + 
      "var output=" +
      JSON.stringify(templateText)
        //.replace(/\\n/g, "\n")
        .replace(/\$conf\$/g, `_conf`)
        .replace(/\$this\$/g, `_this_${scopeId}`)
        .replace(/\$popup/g, `_popup_${scopeId}`)

        // experimental replace event handler with regex
        .replace(/on\w+=\\\"(.+?)\\\"/g, (match, handlerCode) => {
          const globalHandler = handlerCode
            .replace(/\$_\./g, `_entry_${scopeId}.`)
            .replace(/\$prev\$\./g, `_prev_${scopeId}.`)
            .replace(/(?<!\$\w*)\$\./g, `_data_${scopeId}.`)
            // .replace(/\$\./g, `_data_${scopeId}?.`);
          // Reconstruct the attribute name (e.g., onclick, onchange)
          const attrName = match.match(/(on\w+)=/)?.[1] ?? 'onunknown';
          return `${attrName}=\\\"${globalHandler}\\\"`;
        })

        .replace(/<!--(.+?)-->/g, '')
        .replace(/\{\{(.+?)\}\}/g, r$val)
        .replace(/\[#(.+?)#\]/gm, r$script)
        // .replace(/<x-if\s*\$=\\\"(.+?)\\\"\s*>/ig, '";if($1){\noutput+="')
        .replace(/<x-if\s*\$=\\\"(.+?)\\\"\s*>/ig, (m, p1) => '";if('+safeAccess(p1.replace(/\\[rnt]+/gm, ''))+'){\noutput+="')
        .replace(/<x-else\s*\/?\s*>/ig, '";}else{\noutput+="')
        // .replace(/<x-else-if\s*\$=\\\"(.+?)\\\"\s*\/?\s*>/ig, '";}else if($1){\noutput+="')
        .replace(/<x-else-if\s*\$=\\\"(.+?)\\\"\s*\/?\s*>/ig, (m, p1) => '";}else if('+safeAccess(p1.replace(/\\[rnt]+/gm, ''))+'){\noutput+="')
        .replace(/<\/x-if>/ig, '";}\noutput+="')
        // .replace(/<x-for\s*\$\=\\\"(.+?)\\\"\s*>/ig, '";for($1){\noutput+="')
        .replace(/<x-for\s*\$\=\\\"(.+?)\\\"\s*>/ig, (m, p1) => '";for('+p1.replace(/\\[rnt]+/gm, '')+'){\noutput+="')
        .replace(/<\/x-for>/ig, '";}\noutput+="')
        .replace(/<x-foreach\s*\$\=\\\"(.+?)\\\"\s*>/ig, r$foreach)
        .replace(/<\/x-foreach>/ig, '";})\noutput+="')
        // .replace(/<\?(.+?)\?>/g, '";$1\noutput+="')
        // .replace(/<\?(.+?)\?>/g, r$script)
      + ";return output;}"
      + "})()"
    )//.replace(/(?:^|<\/x-markdown>)[\s\S]*?(?:<x-markdown>|$)/g, m => m.replace(/(?:\\[rnt])+/gm, "")) 
    
    // Instantiate the function once and cache it
    cachedFn = new Function("data", "get", "formatNumber", code);

    
    tplCache.set(templateText, cachedFn);
  }

  if (data) {
    data.dayjs = dayjs;

    // const fn = new Function("data", "get", "formatNumber", code);

      // Put variables in global if there is onclick handler
    // ** New experimental
    const hasEvent = /on\w+="/.test(templateText);
    // const hasClick = templateText.includes('onclick="');
    if (hasEvent) {
      (window as any)[`_data_${scopeId}`] = data.$;
      (window as any)[`_entry_${scopeId}`] = data.$_;
      (window as any)[`_prev_${scopeId}`] = data.$prev$;
    }


    // let result = "";
    try {
      let result = cachedFn.call(this, data, get, formatNumber);
      return result.replace(/<x-markdown>([\s\S]*?)<\/x-markdown>/ig, r$markdown)
    } catch (err) {
      throw err;
    }
    // return result;
  }

  return templateText;
}

function r$markdown(match: string, p1: string): string {
  return marked.parse(p1).toString().trim()
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
  console.log("Mermaid syntax error");
  return `<div class="text-danger">Invalid <strong>Mermaid</strong> syntax</div>`;
}

function r$foreach(m: string, p1: string): string {
  const [iterator, list] = p1.split(" of ").map(s => s.trim());
  return `";${list} && Array.isArray(${list}) && ${list}.forEach(function(${iterator}, $index){\noutput+="`;
}

function r$script(m: string, p1: string): string {
  return `";${p1.replace(/&nbsp;/ig, '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")}\noutput+="`;
}

function r$val(m: string, p1: string): string {
  p1 = p1.replace(/\\"/g, '"').replace(/\\[rnt]+/gm, '');
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
        let pre = '";if('+parts[0]+'){output+="';
        const type = parts[2] ? `${parts[2]}/` : "";
        let mid = baseApi + '/entry/file/' + type + key(parts[0], 'encodeURI');
        let post = '";}output+="';
        aVal = pre + mid + post;
        break;
      }
      case 'qr':
        let pre = '";if('+parts[0]+'){output+="';
        let mid = baseApi + '/form/qr?code=' + key(parts[0], 'encodeURIComponent');
        let post = '";}output+="';
        aVal = pre + mid + post;
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

// function key(expr: string, wrapFn?: string): string {
//   const safeExpr = safeAccess(expr);
//   return `"+get(()=>${safeExpr},"",${wrapFn || ''})+"`;
// }

function get(fn: () => any, defaultVal: any, wrapFn?: (val: any) => any): any {
  try {
    const val = wrapFn ? wrapFn(fn()) : fn();
    return val == null ? defaultVal : val;
  } catch {
    return defaultVal;
  }
}

function safeAccess(expr: string): string {
  // Ignore function calls, expressions with operators, or already chained expressions
  if (/[\(\)\+\-\*\/=><\?\:]/.test(expr) || expr.includes("?.") || expr.includes("[")) return expr;
  // Transform `a.b.c` -> `a?.b?.c`
  return expr.split('.').filter(Boolean).join('?.');
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


export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
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

// export function getQuery(e) {
//   var n = new RegExp("[\\?&]" + e + "=([^&#]*)").exec(location.href);
//   return null === n ? "" : decodeURIComponent(n[1].replace(/\+/g, " "))
// }
export function getQuery(e: string): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(e) || "";
}

export function cleanText(str) { return str ? str.replace(/<\/?[^>]+(>|$)/g, " ") : str; }

export function isValue(value) { return !(typeof value === 'object' || Array.isArray(value) || value === null); }

export const nl2br = (text) => text ? String(text).replace(/\n/g, "<br/>") : text;
export const br2nl = (text) => text ? String(text).replace(/<br\s*[\/]?>/gi, "\n") : text;

export const toSpaceCase = (string) => String(string).replace(/[^\w\s$_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim()
export const toSnakeCase = (string) => string ? toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';
export const toHyphen = (string) => string ? toSpaceCase(string).replace(/\s/g, '-').toLowerCase() : '';

export function btoaUTF(str: string, key?: string): string {
  let bytes = new TextEncoder().encode(str); // Uint8Array

  if (key) {
    const k = key.charCodeAt(0);
    bytes = bytes.map(b => b ^ k); // XOR with key
  }

  // Convert Uint8Array to binary string
  const binary = String.fromCharCode(...bytes);

  return btoa(binary);
}

export function getPath() {
  if (window.location.host.indexOf(domainBase) > -1) {
    return 'path:' + window.location.host.match(domainRegex)[1];
  } else {
    return 'domain:' + window.location.hostname;
  }
}

export function atobUTF(str, key) {
  if (!str) return null;

  // Step 1: Base64 decode
  const decoded = atob(str);

  // Step 2 (optional): XOR decode if key is provided
  // const xorDecoded = key
  //   ? Array.prototype.map.call(decoded, c => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(0))).join('')
  //   : decoded;
    const xorBytes = key
    ? Uint8Array.from(decoded, c => c.charCodeAt(0) ^ key.charCodeAt(0))
    : Uint8Array.from(decoded, c => c.charCodeAt(0));

  // Step 3: Percent-decode UTF-8 bytes
  return new TextDecoder().decode(xorBytes);
}

// Simpler version
export const deepMerge = (target, ...sources) => {
  for (const source of sources) {
    if (!isObject(source)) continue;

    for (const key in source) {
      const src = source[key];
      const tgt = target[key];

      if (Array.isArray(src)) {
        if (Array.isArray(tgt)) {
          // Merge arrays
          if (isPrimitiveArray(src) && isPrimitiveArray(tgt)) {
            target[key] = [...new Set([...tgt, ...src])];
          } else {
            target[key] = src.map((val, i) =>
              isObject(val) && isObject(tgt[i])
                ? deepMerge({ ...tgt[i] }, val)
                : val ?? tgt[i]
            );
          }
        } else {
          target[key] = src.slice();
        }
      } else if (isObject(src)) {
        target[key] = isObject(tgt) ? deepMerge(tgt, src) : deepMerge({}, src);
      } else {
        target[key] = src;
      }
    }
  }
  return target;
};

const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
const isPrimitiveArray = arr => arr.every(v => typeof v !== 'object');

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
  const a = s.split('.');
  for (let i = 0; i < a.length; i++) {
      const k = a[i];

      // If o is null or not an object → stop immediately
      if (o === null || typeof o !== 'object') {
        return undefined;
      }

      if (k in o) {
          o = o[k];
      } else {
          return undefined;
      }   
  }
  return o;
}

export function getFileExt(filename: string): string {
  if (!filename) return '';
  const re = /(?:\.([^.]+))?$/;
  const match = re.exec(filename);
  return match?.[1] ? `.${match[1]}` : '';  
}

export function convertQueryParams(queryParams: Record<string, string>): Record<string, unknown> {
  const convertedParams: Record<string, unknown> = {};

  for (const key in queryParams) {
    const value = queryParams[key];
    const trimmed = value.trim();

    if (trimmed !== '' && !isNaN(Number(trimmed))) {
      convertedParams[key] = Number(trimmed);
    } else if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
      convertedParams[key] = trimmed.toLowerCase() === 'true';
    } else {
      convertedParams[key] = value;
    }
  }
  return convertedParams;
}

export function createProxy (prop, fn?) {
  return new Proxy(prop, {
    set(target, prop, value) {
      setTimeout(() =>  fn?.(prop, value), 0);
      target[prop as keyof typeof target] = value;
      return true;
    },
    get(target, prop, receiver) {
      const orig = target[prop as keyof typeof target];
      if (typeof orig === 'function') {
        return function (...args: unknown[]) {
          return orig.apply(this, args);
        };
      }
      return orig;
    }
  });
}

// Deep getter for any object (works with signals)
export function getModel(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value == null) return '';
    value = value[key];
  }
  return value ?? '';
}

// Deep setter for any object (immutable, works with signals)
export function setModel(obj: any, path: string, newValue: any): any {
  const keys = path.split('.');
  // Clone the root object
  let result = { ...obj };
  let temp = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    temp[key] = { ...(temp[key] ?? {}) };
    temp = temp[key];
  }
  temp[keys[keys.length - 1]] = newValue;
  return result;
}

export function extractVariables(prefixes, input) {
  if (!prefixes || prefixes.size === 0 || !input) return {};

  const sorted = [...prefixes].sort((a, b) => b.length - a.length);
  const prefixGroup = sorted.map(escapeRegex).join("|");
  const regex = new RegExp(`(${prefixGroup})\\.([$a-zA-Z_][a-zA-Z0-9_]*)`, "g");

  const result = {};
  for (const p of prefixes) result[p] = [];

  let match;
  while ((match = regex.exec(input)) !== null) {
    const [ , prefix, variable ] = match;
    if (!result[prefix].includes(variable)) {
      result[prefix].push(variable);
    }
  }
  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}