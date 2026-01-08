import { Component, ElementRef, AfterViewInit, forwardRef, Optional, Inject, input, output, viewChild, OnDestroy } from '@angular/core';

import { NG_VALUE_ACCESSOR, NG_VALIDATORS, NG_ASYNC_VALIDATORS, NgModel } from '@angular/forms';
import { copyLineDown, indentWithTab, undo } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from 'codemirror';
import { CompletionContext, snippetCompletion } from "@codemirror/autocomplete";
import { rekaTheme } from './reka-theme';

import { placeholder, EditorViewConfig, lineNumbers, highlightActiveLineGutter, 
  highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, 
  crosshairCursor, highlightActiveLine, keymap, KeyBinding } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
  import { foldAll, unfoldAll, foldGutter, indentOnInput, syntaxTree,
    syntaxHighlighting, defaultHighlightStyle, 
    bracketMatching, foldKeymap} from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap, openSearchPanel } from '@codemirror/search';
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { ElementBase } from '../../../run/_component/element-base';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';

export const CUSTOMINPUT_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => NgCmComponent),
  multi: true,
};


// Place these outside the class so they're only compiled once
const tagRegex = /<\/?x-(if|foreach|for|else-if|else|markdown)[^>]*>/ig;
const attrRegex = /x-(if|foreach|for)="[^"]*"/g;
const variableRegex = /(\{\{([^}]*)\}\})|(\[#([^#]*)#\])/g;
const rekaKeywordRegex = /\$(this\$|conf\$|_|prev\$|user\$|param\$|\$|popup|go|action\$|base\$|baseUrl\$|baseApi\$|token\$)/g;

const customXIfHighlight = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  // Add this helper method:
private getJsTokenClass(nodeName: string): string {
  const tokenMap = {
    'VariableName': 'cm-variable',
    'PropertyName': 'cm-property', 
    'String': 'cm-string',
    'Number': 'cm-number',
    'Keyword': 'cm-keyword',
    'Operator': 'cm-operator',
    'Punctuation': 'cm-punctuation',
    'FunctionName': 'cm-function'
  };
  return tokenMap[nodeName] || 'cm-default';
}

  buildDecorations(view: EditorView) {
    const decorations = [];
    // Only process visible ranges for performance
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);

      // Tag highlighting
      tagRegex.lastIndex = 0;
      let match;
      while ((match = tagRegex.exec(text)) !== null) {
        decorations.push(Decoration.mark({
          class: "cm-tag-x-" + match[1]
        }).range(from + match.index, from + match.index + match[0].length));
      }
      // Value highlighting
      // Replace the variableRegex section in buildDecorations:
      variableRegex.lastIndex = 0;
      while ((match = variableRegex.exec(text)) !== null) {
        let fullMatch, jsContent;
  
        if (match[1]) {
          // {{...}} format
          fullMatch = match[1];
          jsContent = match[2];
        } else if (match[3]) {
          // [#...#] format  
          fullMatch = match[3];
          jsContent = match[4];
        }
        
        // Parse JavaScript content for syntax highlighting
        try {
          const jsState = EditorState.create({
            doc: jsContent,
            extensions: [javascript()]
          });
          
          const tree = syntaxTree(jsState);
          tree.iterate({
            enter: (node) => {
              if (node.from < node.to) { // <-- Only decorate non-empty ranges
                const className = this.getJsTokenClass(node.name);
                decorations.push(Decoration.mark({
                  class: className + " " + node.name
                }).range(
                  from + match.index + 2 + node.from,
                  from + match.index + 2 + node.to
                ));
              }
            }
          });

          // Add the root cm-js-expression class for the entire {{...}} block
          decorations.push(Decoration.mark({
            class: "cm-js-expression"
          }).range(from + match.index, from + match.index + fullMatch.length));

        } catch (e) {
          // Fallback to simple highlighting
          decorations.push(Decoration.mark({
            class: "cm-js-expression"
          }).range(from + match.index, from + match.index + fullMatch.length));
        }
      }

          // $this$ highlighting - Add this section
    rekaKeywordRegex.lastIndex = 0;
    while ((match = rekaKeywordRegex.exec(text)) !== null) {
      decorations.push(Decoration.mark({
        class: "cm-reka-key"
      }).range(from + match.index, from + match.index + match[0].length));
    }

      // Attribute highlighting
      attrRegex.lastIndex = 0;
      while ((match = attrRegex.exec(text)) !== null) {
        decorations.push(Decoration.mark({
          class: "cm-attr-x-" + match[1]
        }).range(from + match.index, from + match.index + match[0].length));
      }
    }
    return Decoration.set(decorations, true);
  }
}, {
  decorations: v => v.decorations
});



@Component({
    selector: 'app-cm',
    templateUrl: './ng-cm.component.html',
    styleUrls: ['./ng-cm.component.scss'],
    providers: [CUSTOMINPUT_VALUE_ACCESSOR],
    standalone: true,
})
export class NgCmComponent extends ElementBase<any> implements AfterViewInit, OnDestroy {
  
  model = viewChild(NgModel)  

  valueChange = output<any>();
  options = input<any>(); //not used
  lang = input<string>();
  editorStyle = input<any>(); // not used
  linenumber = input<boolean>();
  readOnly = input<boolean>();
  lambda = input<boolean>();
  hideControl = input<boolean>();
  placeholder = input<string>();
  extraAutoComplete = input<any[]>([]);
  subType = input<string>();
  skipCheck = input<boolean>();
  // @Input() extraLint: Function = (node) => [
  //   { cond: node.name == "RegExp", severity: "warning", message: "Regular expressions are Forbidden" },
  //   { cond: node.name == "Script", severity: "warning", message: "Script are Forbidden" },
  // ]


  codemirrorhost = viewChild<ElementRef>('codemirrorhost'); 

  config: EditorViewConfig;
  editor: EditorView;
  plusSquare: string = '<svg role="img" aria-hidden="true" focusable="false" data-prefix="far" data-icon="plus-square" class="svg-inline--fa fa-plus-square fa-w-14 fa-fw fa-2x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M352 240v32c0 6.6-5.4 12-12 12h-88v88c0 6.6-5.4 12-12 12h-32c-6.6 0-12-5.4-12-12v-88h-88c-6.6 0-12-5.4-12-12v-32c0-6.6 5.4-12 12-12h88v-88c0-6.6 5.4-12 12-12h32c6.6 0 12 5.4 12 12v88h88c6.6 0 12 5.4 12 12zm96-160v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48zm-48 346V86c0-3.3-2.7-6-6-6H54c-3.3 0-6 2.7-6 6v340c0 3.3 2.7 6 6 6h340c3.3 0 6-2.7 6-6z"></path></svg>';
  minusSquare: string = '<svg role="img" aria-hidden="true" focusable="false" data-prefix="far" data-icon="minus-square" class="svg-inline--fa fa-minus-square fa-w-14 fa-fw fa-2x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M108 284c-6.6 0-12-5.4-12-12v-32c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v32c0 6.6-5.4 12-12 12H108zM448 80v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48zm-48 346V86c0-3.3-2.7-6-6-6H54c-3.3 0-6 2.7-6 6v340c0 3.3 2.7 6 6 6h340c3.3 0 6-2.7 6-6z"></path></svg>';

  extraKeyMap: KeyBinding[] = [{ key: 'Ctrl-d', run: copyLineDown }];

  // regexpLinter = linter(view => {
  //   let diagnostics: Diagnostic[] = [];
  //   if (this.extraLint) {
  //     syntaxTree(view.state).cursor().iterate(node => {
  //       this.extraLint(node).forEach(u => {
  //         if (u.cond) diagnostics.push({
  //           from: node.from,
  //           to: node.to,
  //           severity: "warning",
  //           message: u.message,
  //           // actions: [{
  //           //   name: "Remove",
  //           //   apply(view, from, to) { view.dispatch({ changes: { from, to } }) }
  //           // }]
  //         })
  //       })
  //     });
  //   }
  //   return diagnostics
  // })

  customBasicSetup: any[] = [
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),

    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      // ...lintKeymap,
      ...this.extraKeyMap
    ])
  ]


  constructor(
    @Optional() @Inject(NG_VALIDATORS) validators: Array<any>,
    @Optional() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: Array<any>,
  ) {
    super(validators, asyncValidators);
  }

  // override writeValue(value) {
  //   this.editor?.dispatch({ 
  //     changes: { from: 0, to: this.editor.state.doc.length, insert: value }, 
  //     annotations: Transaction.addToHistory.of(false) 
  //   })
  //   this.value = value;
  // }
  override writeValue(value: string): void {
    const safeValue = value ?? '';
    this.editor?.dispatch({
      changes: { from: 0, to: this.editor.state.doc.length, insert: safeValue },
      annotations: Transaction.addToHistory.of(false)
    });
    this.value = safeValue;
  }


  ngAfterViewInit(): void {

    const jsDocCompletions = javascript().language.data.of({
      autocomplete: this.myJsCompletions
    })
    const lambdaDocCompletions = javascript().language.data.of({
      autocomplete: this.myLambdaCompletions
    })
    const htmlDocCompletions = html().language.data.of({
      autocomplete: this.myHtmlCompletions
    })

    let langPack = {
      "html": [html(),customXIfHighlight],
      "javascript": [javascript()],
      "json": [javascript()],
      "lambda": [javascript()]
    }

    let completionPack = {
      "html": [htmlDocCompletions],
      "javascript": [jsDocCompletions],
      "json": [jsDocCompletions],
      "lambda": [htmlDocCompletions, lambdaDocCompletions]
    }

    var ext = [
      ... this.customBasicSetup,
      ... this.linenumber() ? [lineNumbers()] : [],
      ... this.placeholder() ? [placeholder(this.placeholder())] : [],
      rekaTheme,
      EditorView.editable.of(!this.readOnly()),
      EditorView.updateListener.of(update => {
        this.valueChanged(update.state.doc.toString());
      }),
      keymap.of([indentWithTab]),
      foldGutter({
        markerDOM: (open) => {
          let g = document.createElement("div");
          g.className = "foldmarker";
          g.innerHTML = open ? this.minusSquare : this.plusSquare;
          return g;
        }
      }),
      ...langPack[this.lang()],
      ...completionPack[this.lang()],
      // this.regexpLinter,
      // lintGutter(),

    ]


    this.config = {
      doc: this.value,
      extensions: ext,
      parent: this.codemirrorhost().nativeElement
    }

    this.editor = new EditorView(this.config);

  }

  valueChanged(event) {
    this.value = event;
    this.valueChange.emit(event);
    this.checkCode(event);
  }

  async formatCode() {
    const prettier = await import('prettier/standalone');
    const parser = this.lang() === 'html' ? 'html' : 'typescript';
    const plugin = this.lang() === 'html' ? await import('prettier/parser-html') : await import('prettier/parser-typescript');
  
    const formatted = await prettier.format(this.value, {
      parser,
      plugins: [plugin],
    });
  
    this.editor?.dispatch({
      changes: { from: 0, to: this.editor.state.doc.length, insert: formatted }
    });
  }

  dontComplete = [
    "TemplateString", "String", "RegExp",
    "LineComment", "BlockComment",
    "VariableDefinition", "TypeDefinition", "Label",
    "PropertyDefinition", "PropertyName",
    "PrivatePropertyDefinition", "PrivatePropertyName"
  ]


  myJsCompletions = (context: CompletionContext) => {
    // const { state, pos } = context;
    // let around = syntaxTree(state).resolveInner(pos),
    //   tree = around.resolve(pos, -1);
    const Identifier = /^[\w$\xa1-\uffff][\w$\d\xa1-\uffff]*$/

    let inner = syntaxTree(context.state).resolveInner(context.pos, -1)

    if (this.dontComplete.indexOf(inner.name) > -1) return null

    let isWord = inner.name == "VariableName" ||
      inner.to - inner.from < 20 && Identifier.test(context.state.sliceDoc(inner.from, inner.to))

    if (!isWord && !context.explicit) return null

    // console.log(inner);

    // const word = context.matchBefore(/.*/);
    // let word = context.matchBefore(/\$*/)
    // if (word.from == word.to && !context.explicit)
    //   return null
    // passive=1, active=2, passive-form=3, active-form=4;
    let all = [
      { c: 1, label: "$", type: "text", apply: "$.#{field-code}", detail: "Form data binding" },
      { c: 1, label: "$prev$", type: "text", apply: "$prev$.#{field-code}", detail: "Previous form data binding" },
      { c: 1, label: "$user$.name", type: "property", apply: "$user$.name", detail: "Name of logged in user" },
      { c: 1, label: "$user$.email", type: "property", apply: "$user$.email", detail: "Email of logged in user" },
      { c: 1, label: "$user$.imageUrl", type: "property", apply: "$user$.imageUrl", detail: "Photo URL of logged in user" },
      { c: 1, label: "$user$.provider", type: "property", apply: "$user$.provider", detail: "Identity provider (ie: google, facebook)" },
      { c: 1, label: "$user$.providerId", type: "property", apply: "$user$.providerId", detail: "User ID provided by the identity provider" },
      { c: 1, label: "$user$.groups", type: "property", apply: "$user$.groups['${groupId}']", detail: "Check if user belong to the specified group ID" },
      { c: 1, label: "$user$.attributes", type: "property", apply: "$user$.attributes.${field}", detail: "Additional attributes provided by identity provider" },
      { c: 1, label: "$this$", type: "text", apply: "$this$.#{variable}", detail: "Local variable holder (transient)" },
      { c: 1, label: "$conf$", type: "text", apply: "$conf$.#{variable}", detail: "App-wide/global variable holder" },
      { c: 1, label: "$param$", type: "text", apply: "$param$.#{key}", detail: "Get passed parameter value" },
      { c: 1, label: "$baseUrl$", type: "text", apply: "$baseUrl$", detail: "Get base frontend URL" },
      { c: 1, label: "$base$", type: "text", apply: "$base$", detail: "Get base backend" },
      { c: 1, label: "$baseApi$", type: "text", apply: "$baseApi$", detail: "Get base backend API" },
      { c: 1, label: 'iife', type: 'function', apply: '(function(){\n\n\t${//codes here}\n\n})()', detail: "IIFE (Immediately Invoked Function Expression)" },
      { c: 2, label: "$http$", type: "function", apply: "$http$('#{url}', res=>{\n\t#{//codes here}\n})", detail: "HTTP Get request" },
      { c: 2, label: "$post$", type: "function", apply: "$post$('#{url}',{\n\t#{/*request-body*/}\n},res=>{\n\t#{//codes here}\n}, err=>{\n\t#{//error-handling}\n})", detail: "HTTP POST request" },
      // { c: 2, label: "$post$", type: "function", apply: "$post$('#{url}', {}, res=>{\n\t#{//codes here}\n})", detail: "HTTP POST request" },
      { c: 2, label: "$web$.get", type: "function", apply: "$web$.get('#{url}', {#{config}}).subscribe(res=>{})", detail: "HTTP Get request (using HttpCLient)" },
      { c: 2, label: "$endpoint$", type: "function", apply: "$endpoint$('${endpoint-code}',{\n\t${//param}\n},\ndata=>{\n\t${//to-do with data}\n},\nerror=>{\n})", detail: "Request REKA endpoint" },
      { c: 2, label: "$update$", type: "function", apply: "$update$(${entryId}, {${/*updated object*/}})", detail: "Update/patch entry data" },
      { c: 2, label: "$upload$", type: "function", apply: "$upload$({\n\tfile:${/*blob*/},\n\titemId:${/*itemId*/},\n\tbucketId:${/*bucketId*/}\n}, attachment=>{\n\t/*attachment.fileUrl;*/\n})", detail: "Upload file blob" },
      { c: 2, label: "$updateLookup$", type: "function", apply: "$updateLookup$(${lookupEntryId}, {${/*updated object*/}})", detail: "Update/patch lookup entry data" },
      { c: 2, label: "$merge$", type: "function", apply: "$merge$(#{target}, #{source})", detail: "Merge 2 object and return merged orbject" },
      { c: 2, label: "$loadjs$", type: "function", apply: "$loadjs$(${script-url}, ${callback-fn})", detail: "Load external javascript file" },
      { c: 2, label: "$live$.watch", type: "function", apply: "$live$.watch(['${channel-list}'], res=>{\n\t${//do something}\n})", detail: "Listen to live update from specified channel" },
      { c: 2, label: "$live$.publish", type: "function", apply: "$live$.publish(['${channel-list}'], '${message}')", detail: "Publish live update to specified channel" },
      { c: 2, label: "$digest$", type: "function", apply: "$digest$()", detail: "Force page update (if update was done through DOM)" },
      { c: 2, label: "$toast$", type: "function", apply: "$toast$(\"#{content}\", #{{classname: 'bg-success text-light'}})", detail: "Show toast alert at the top-right" },
      { c: 1, label: "dayjs().format", type: "text", apply: "dayjs(${field_code}).format(\"${DD-MM-YYYY}\")", detail: "DayJs" },
      { c: 2, label: "echarts.init", type: "text", apply: "echarts.init(#{dom},{#{//echarts options}})", detail: "Create ECharts chart/graph" },
      { c: 2, label: "$q$", type: "text", apply: "$q$('#{html element selector}')", detail: "Get element using query selector" },
      { c: 2, label: "onInit()", type: "text", apply: "onInit()", detail: "Trigger Init Function" },
      { c: 2, label: "onSave()", type: "text", apply: "onSave()", detail: "Trigger On Save" },
      { c: 2, label: "onSubmit()", type: "text", apply: "onSubmit()", detail: "Trigger On Submit" },
      { c: 2, label: "onView()", type: "text", apply: "onView()", detail: "Trigger On View" },
      { c: 1, label: "ServerDate.now()", type: "text", apply: "ServerDate.now()", detail: "Get server timestamp" },
      { c: 1, label: "ServerDate.offset", type: "text", apply: "ServerDate.offset", detail: "Get server time offset (against browser time)" },
      { c: 2, label: "$merge$", type: "text", apply: "$merge$(#{target},${source})", detail: "Perform object deep merge" },
      ... this.extraAutoComplete()
    ];

    //'$_', '$', '$prev$', '$user$','$action$', '$lookup$', '$http$', '$post$', '$endpoint$', '$saveAndView$', '$save$', '$submit$', 
    //'$el$', '$form$', '$this$', '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$toast$', 
    // '$update$', '$updateLookup$', '$baseUrl$', '$ngForm$', '$lookupList$', 'dayjs', '$live$','$token$'
    // let formActive = [    ];

    let finalList: any[] = [];
    if (this.subType() == 'passive') {
      finalList = all.filter(i => i.c == 1);
    } else if (this.subType() == 'active') {
      finalList = all;
    }


    return {
      // from: word.from + word.text.search(/\S|$/),
      from: isWord ? inner.from : context.pos,
      //'$_', '$', '$prev$', '$user$','$action$', '$lookup$', '$http$', '$post$', 
      //'$endpoint$', '$saveAndView$', '$save$', '$submit$', '$el$', '$form$', '$this$', 
      // '$loadjs$', '$digest$', '$param$', '$log$', '$activate$', '$toast$', '$update$', 
      //'$updateLookup$', '$baseUrl$', '$ngForm$', '$lookupList$', 'dayjs', '$live$','$token$',



      options: this.processSnippet([...finalList])
    }
  }
  myLambdaCompletions = (context: CompletionContext) => {

    const Identifier = /^[\w$\xa1-\uffff][\w$\d\xa1-\uffff]*$/

    let inner = syntaxTree(context.state).resolveInner(context.pos, -1)

    if (this.dontComplete.indexOf(inner.name) > -1) return null

    let isWord = inner.name == "VariableName" ||
      inner.to - inner.from < 20 && Identifier.test(context.state.sliceDoc(inner.from, inner.to))

    if (!isWord && !context.explicit) return null

    const word = context.matchBefore(/.*/);
    // let word = context.matchBefore(/_*/)
    // if (word.from == word.to && !context.explicit)
    //   return null
    // console.log(this.extraAutoComplete);
    return {
      from: isWord ? inner.from : context.pos,
      // from: word.from,
      options: this.processSnippet([
        { label: '_request.getParameter', type: "method", apply: "_request.getParameter(\"${key}\")", detail: "Get request parameter" },
        { label: '_param', type: "method", apply: "_param.${key}", detail: "Get parameter from cogna tool or request parameter" },
        { label: '_param._body', type: "method", apply: "_param.${key}", detail: "Get request body from POST request" },
        { label: "_out.put", type: "method", apply: "_out.put(\"${key}\", ${value})", detail: "Add item in output" },
        { label: "_response", type: "method", apply: "_response.#{}", detail: "Access to HTTP response" },
        { label: "_response.sendRedirect", type: "method", apply: "_response.sendRedirect('#{url}')", detail: "Redirect to URL" },
        { label: "print", type: "method", apply: "print(${value})", detail: "Print output" },
        ... this.extraAutoComplete()])
    }
  }

  myHtmlCompletions = (context: CompletionContext) => {
    const word = context.matchBefore(/.\w*/);
    // let word = context.matchBefore(/\w*/)
    if (word.from == word.to && !context.explicit)
      return null

    // console.log(word);
    let defaultList = [];
    if (this.subType() != 'mailer') {
      defaultList = [
        { label: "<x-foreach>", type: "text", apply: "<x-foreach $=\"item of ${list}\">\n\t{{item}}\n</x-foreach>", detail: "Foreach loop", boost: 10 },
        { label: "<x-if>", type: "text", apply: "<x-if $=\"${condition}\">\n</x-if>", detail: "Conditional if clause", boost: 9 },
        { label: "<x-else-if>", type: "text", apply: "<x-else-if $=\"${condition}\">\n</x-if>", detail: "Conditional if-else clause", boost: 8 },
        { label: "<x-else>", type: "text", apply: "<x-else/>", detail: "Conditional else (used inside <x-if>)", boost: 8 },
        { label: "<x-for>", type: "text", apply: "<x-for $=\"i=0;i<size;i++\">\n</x-for>", detail: "Normal for loop", boost: 6 },
        { label: "<x-markdown>", type: "text", apply: "<x-markdown>\n</x-markdown>", detail: "Add markdown formatted content", boost: 6 },
        { label: "x-foreach", type: "text", apply: "x-foreach=\"item of ${list}\"", detail: "Foreach loop (inline attribute)", boost: 5 },
        { label: "x-if", type: "text", apply: "x-if=\"${condition}\"", detail: "Conditional if clause (inline attribute)", boost: 5 },
        { label: "x-for", type: "text", apply: "x-for=\"i=0;i<size;i++\"", detail: "Normal for loop (inline attribute)", boost: 5 },
        { label: "dayjs().format", type: "text", apply: "dayjs(${field_code}).format('DD-MM-YYYY')", detail: "DayJs" }]
    }

    return {
      from: word.from + word.text.search(/\S|$/),
      options: this.processSnippet([
        ...defaultList,
        // snippetCompletion("<x-foreach $=\"item of ${one}\">\n\t{{item}}\n</x-foreach>",{ label: "<x-foreach>", type: "text", apply: "<x-foreach $=\"item of list\">\n\t{{item}}\n</x-foreach>", detail: "Foreach loop", boost:10 }),
        // snippetCompletion("<x-if $=\"${one}\">\n</x-if>",{ label: "<x-if>", type: "text", apply: "<x-if $=\"condition\">\n</x-if>", detail: "Conditional if clause", boost:9 }),
        // snippetCompletion("<x-else-if $=\"${one}\">\n</x-if>",{ label: "<x-else-if>", type: "text", apply: "<x-else-if $=\"condition\">\n</x-if>", detail: "Conditional if-else clause", boost:8 }),
        // { label: "<x-else>", type: "text", apply: "<x-else/>", detail: "Conditional else (used inside <x-if>)", boost:8 },
        // { label: "<x-for>", type: "text", apply: "<x-for $=\"i=0;i<size;i++\">\n</x-for>", detail: "Normal for loop", boost:6 },
        // snippetCompletion("dayjs(${one}).format(\"DD-MM-YYYY\")",{ label: "dayjs().format", type: "text", apply: "dayjs(field_code).format(\"DD-MM-YYYY\")", detail: "DayJs" }),
        ... this.extraAutoComplete()]),
      // span: /^\/?[:\-\.\w\u00b7-\uffff]*$/
    };
  }

  foldAll() {
    foldAll(this.editor);
  }
  unfoldAll() {
    unfoldAll(this.editor);
  }
  openSearch() {
    openSearchPanel(this.editor);
  }
  undo() {
    undo(this.editor);
  }

  processSnippet(list) {
    return list.map(i => snippetCompletion(i.apply, i))
  }

  public insertText(text) {
    const range = this.editor.state.selection.ranges[0];
    this.editor.dispatch({
      changes: {
        from: range.from,
        to: range.to,
        insert: text
      },
      selection: { anchor: range.from + text.length }
      // selection: { anchor: range.from + 1 }
    })
  }

  codeStatus:string="";
  checkCode = (code) => {
    try{
        var map = {"javascript":this.isValidJs,"json":this.isValidJson,"lambda":this.isValidJs,"html":this.isValidHTML};
        map[this.lang()](code);
        delete this.codeStatus;
    }catch (e){
        this.codeStatus =  "ERR: "+ e;
    }
  };

  isExpression(): boolean {
    try {
      const state = EditorState.create({
        doc: this.value,
        extensions: [javascript()]
      });
  
      const tree = syntaxTree(state);
      const cursor = tree.cursor();
  
      if (!cursor.firstChild()) return false;
  
      const topNode = `${cursor.name}`; // ← Cast to general string

      // console.log(topNode);
  
      if (topNode === "ExpressionStatement") {
        if (cursor.firstChild()) {
          const innerNode = `${cursor.name}`; // ← Also cast here
          // console.log(innerNode);
          return innerNode !== "AssignmentExpression"; // ✅ No TS error
        }
      }
  
      return false;
    } catch {
      return false;
    }
  }

  isAssignmentExpression(): boolean {
    try {
      const state = EditorState.create({
        doc: this.value,
        extensions: [javascript()]
      });
  
      const tree = syntaxTree(state);
      const cursor = tree.cursor();
  
      // Go into top-level Program → Statement
      if (!cursor.firstChild()) return false;
  
      const first = String(cursor.name);
  
      // If it's an ExpressionStatement like `a = b`
      if (first === "ExpressionStatement") {
        if (cursor.firstChild()) {
          const inner = String(cursor.name);
          return inner === "AssignmentExpression";
        }
      }
  
      return false;
    } catch {
      return false;
    }
  }

  isValidJs(code){
    try{
      new Function(code);
    }catch(e){
      throw e;
    }
  }

  isValidJson(code){
    if (code){
      try{
        JSON.parse(code);
      }catch(e){
        throw e;
      }
    }
  }

  isValidHTML(html) {
    // const parser = new DOMParser();
    // const doc:Document = parser.parseFromString(html, 'text/html');
    // console.log(doc);
    // if (doc.documentElement.querySelector('parsererror')) {
    // if (!/<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/.test(html)) {
    //   //var error = doc.documentElement.querySelector('parsererror').innerText;
    //   throw "Error";    
    // }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }


}
