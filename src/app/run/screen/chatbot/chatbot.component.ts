import { DatePipe } from '@angular/common';
import { Component, OnInit, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { map } from 'rxjs';
import { LogService } from '../../../_shared/service/log.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { UtilityService } from '../../../_shared/service/utility.service';
import { compileTpl, imagify, linkify, resizeImage, targetBlank } from '../../../_shared/utils';
import { RunService } from '../../_service/run.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { baseApi } from '../../../_shared/constant.service';
import { VoiceRecognitionService } from '../../_service/speech-recognition.service';
import { marked} from 'marked';
import mermaid from "mermaid";
// import { InitDirective } from '../../../_shared/directive/init.directive';
// import { AfterInitDirective } from '../../../_shared/directive/after-init.directive';
// import { RunService } from '../../../service/run.service';

// const marked = new Marked({});

// Override function
// const renderer = {
//   code({code}){
//     if (code.match(/^sequenceDiagram/) || code.match(/^graph/)) {
//       return '<pre class="mermaid">' + code + '</pre>';
//     } else {
//       return '<pre><code>' + code + '</code></pre>';
//     }
//   }
// };

// const renderer = new marked.Renderer();
// renderer.code = function (code, language, escape) {
//   if (code.match(/^sequenceDiagram/) || code.match(/^graph/)) {
//     return '<pre class="mermaid">' + code + '</pre>';
//   } else {
//     return '<pre><code>' + code + '</code></pre>';
//   }
// };

mermaid.initialize({startOnLoad:false})

// async function drawDiagram(text){
//   var id = 'mermaid'+Date.now();
//   var elem = document.createElement("div")
//   elem.id = id;
//   document.body.appendChild(elem);
//   const {svg} = await mermaid.render(id, text);
//   return svg; 
// }


marked.use({
  extensions: [{
     name: 'code',
     renderer({lang, raw, text}) {
      console.log({lang, raw, text})
      if (lang=='mermaid') {
        // let svg = drawDiagram(text);
        return `
          <pre class="mermaid">${text}</pre>
        `;
      } else {
        return '<pre><code>' + text + '</code></pre>';
      }
    }
   }],
  //  hooks:{
  //   postprocess: (html):any=>{
  //     void mermaid.init();
  //     return html;
  //   }
  //  }
 })

@Component({
    selector: 'app-chatbot',
    imports: [FormsModule, FaIconComponent, DatePipe],
    templateUrl: './chatbot.component.html',
    styleUrl: './chatbot.component.scss'
})
export class ChatbotComponent implements OnInit{

  constructor(public runService: RunService, private toastService: ToastService, 
    private logService: LogService, private utilityService: UtilityService,
    private voiceRecognition: VoiceRecognitionService
  ){
      this.utilityService.testOnline$().subscribe(online => this.offline = !online);
      // afterNextRender({
      //   read: () => {
      //     void mermaid.init()
      //   }
      // })
    }

  offline: boolean = false;
  // @Input() screen: any;
  screen = input<any>();
  // @Input() app: any;
  app = input<any>();

  // @Input() user:any;
  user = input<any>();


  cogna:any;

  // @Input() compileTplData:any;
  compileTplData = input<any>();

  baseApi = baseApi;



  ngOnInit(){
    this.cogna = this.screen().cogna;
    let fromStorage = sessionStorage.getItem("cogna-"+this.cogna.id+"-"+this.user().email)
    
    if (fromStorage){
      this.chatResponseList = JSON.parse(fromStorage)
    }else{
      this.chatResponseList = [];
    }

    setTimeout(()=>{
      mermaid.run({querySelector:'.mermaid'})
    })  

    this.initVoiceInput();

    this.scrollBottom();
  }

  isListening:boolean=false;
  voiceText:string="";
  startListen(){
    this.isListening = true;
    this.voiceRecognition.start();
  }

  initVoiceInput() {
    // Subscription for initializing and this will call when user stopped speaking.
    this.voiceRecognition.init(this.chatPromptText, 'en-US').subscribe(() => {
      // User has stopped recording
      // Do whatever when mic finished listening
    });

    // Subscription to detect user input from voice to text.
    this.voiceRecognition.speechInput().subscribe((input) => {
      // Set voice text output to
      // this.speechText = input;
      this.chatPromptText = input;
    });
  }

  stopListen() {
    this.voiceRecognition.stop();
    this.isListening = false;
  }

  onrespinit(){
    console.log("resp init");
  }

  chatResponseList: any[] = [];
  chatPromptText: string="";
  chatPromptLoading:boolean = false;
  streamTyping:boolean=false;
  streamResult: string = "";
  chatPrompt(cogna, prompt){
    if (prompt?.trim() || this.fileList.length>0){
      this.scrollBottom();
      this.chatResponseList.push({type:'prompt', text:prompt, files: this.fileList, timestamp:Date.now()})
      this.chatPromptLoading = true;
      sessionStorage.setItem("cogna-"+cogna.id+"-"+this.user().email,JSON.stringify(this.chatResponseList))

      if (cogna.streamSupport){
        this.runService.streamCognaPrompt(cogna.id, prompt, this.fileList.map(f=>f.path),this.user().email)
        .pipe(
          map(res => {
            if (res['type'] == 4) {
              this.chatPromptLoading = false;
              this.streamResult = marked.parse(res['body'])+"";
              this.streamTyping = false;
              this.chatResponseList.push({type:'response', text:marked.parse(this.streamResult), timestamp:Date.now()})
              sessionStorage.setItem("cogna-"+cogna.id+"-"+this.user().email,JSON.stringify(this.chatResponseList));
              this.scrollBottom();   
  
              // perlu pake tok utk pastikan element dh wujud dlm html sebelum run mermaid
              setTimeout(()=>{
                mermaid.run({querySelector:'.mermaid'})
              })  
              
            } else {
              this.streamResult = marked.parse(res['partialText']??"")+"";
              if (this.streamResult?.length>0){
                this.chatPromptLoading = false;
                this.streamTyping = true;                
              }
              this.scrollBottom();  
            }
          })
        )
        .subscribe(res => {
        }, err => {
          this.chatPromptLoading=false;
          this.streamTyping = false;
          this.chatResponseList.push({type:'system', text:'Error loading response: '+err.message,timestamp:Date.now()})
          this.toastService.show("Cogna response failed", { classname: 'bg-danger text-light' });
        });

      }else{

        this.runService.cognaPrompt(cogna.id, prompt, this.fileList.map(f=>f.path), this.user().email)
        .subscribe({
          next:res=>{
            this.chatPromptLoading=false;
            this.chatResponseList.push({type:'response', text:marked.parse(res.result), timestamp:Date.now()})
            sessionStorage.setItem("cogna-"+cogna.id+"-"+this.user().email,JSON.stringify(this.chatResponseList));
            this.scrollBottom();        
            // this.toastService.show("Prompt success", { classname: 'bg-success text-light' });
          },
          error:err=>{
            this.chatPromptLoading=false;
            this.chatResponseList.push({type:'system', text:'Error loading response: '+err.error.message,timestamp:Date.now()})
            this.toastService.show("Prompt failure: "+err.error.message, { classname: 'bg-danger text-light' });
          }
        });
      }


      this.chatPromptText="";      
      this.fileList = [];   
    }

  }

  scrollBottom(){
    setTimeout(()=>{
      var elemChatViewPort = document.getElementById("_viewport");
      elemChatViewPort.scrollTo({
        top: elemChatViewPort.scrollHeight+200,
        left: 0,
        behavior: "smooth",
      })
        // elemChatViewPort.scrollTo(0, elemChatViewPort.scrollHeight+200);
    },0)
  }

  
  clearCognaMemory(cogna){
    this.runService.clearCognaMemoryByIdAndEmail(cogna.id, this.user().email)
    .subscribe({
      next:res=>{
        this.toastService.show("Memory successfully cleared ", { classname: 'bg-success text-light' });
      },
      error:err=>{
        this.toastService.show("Memory cannot be cleared ", { classname: 'bg-danger text-light' });
      }
    });
    sessionStorage.removeItem("cogna-"+cogna.id+"-"+this.user().email);
    this.chatResponseList=[];
    // this.chatResponseList.push({type:'response', text:compileTpl(this.screen.data?.greeting, { $user$: this.user, $base$: this.base, $baseUrl$: this.baseUrl, $baseApi$: this.baseApi, $this$: this.$this$, $param$: this.$param$}),timestamp:Date.now()});
    // sessionStorage.setItem("cogna-"+cogna.id+"-"+this.user.email,JSON.stringify(this.chatResponseList));

  }

  
  removeFile(index){
    this.fileList.splice(index,1);
  }

  linkify=linkify;
  imagify=imagify;
  targetBlank= targetBlank;

  
  getIcon=(str)=>str?str.split(":"):['far','question-circle'];

  copyChatText(text){
      navigator.clipboard.writeText(text).then((res)=>{
        this.toastService.show("Chat text copied", { classname: 'bg-secondary bg-opacity-50 text-light' });
      }).catch(e => console.log(e));
      
  }

  reportChat(text){
      if (confirm("Are you sure you want to report this chat response?")){
        this.toastService.show("Chat has been reported", { classname: 'bg-secondary bg-opacity-50 text-light' });
      }      
  }

  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data);
    } catch (e) {
      this.logService.log(`{screen-${this.screen().title}-compiletpl}-${e}`)
    }
    return f;
  }


  uploadPromptImg;
  uploadPromptImgMimeType;
  uploadPromptLoading = false;
  uploadPromptImage($event){
    if($event.target.files && $event.target.files.length){
      // console.log($event);
      var file = $event.target.files[0];
      resizeImage({
        file: file,
        maxSize: 640
      }).then((resizedImage:Blob) => {
        this.uploadPromptImg = URL.createObjectURL(resizedImage);
        this.uploadPromptImgMimeType = file.type;
      }).catch(function (err) {
        console.error(err);
      });      
    }

  }


  uploadProgress: any = {};
  filesMap:any={};
  fileList=[];
  onUpload($event) {
    if ($event.target.files && $event.target.files.length) {
      var totalSize = 0;
      for (var i=0; i <$event.target.files.length; i++) {
        var file = $event.target.files[i];
        totalSize = totalSize + file.size;
      }
      // var totalSize = $event.target.files.reduce((total, i) => total + i.size, 0);
      var progressSize = 0;

      // optimize image file here (ie: resize, compress)
      // files = compressImage(files, 300, 300)
      // const resizedImage = await resizeImage(config)
      // if (f.subType == 'imagemulti') {

      var list = [];
      for (var i = 0; i < $event.target.files.length; i++) {
        let file = $event.target.files[i];
        if (file.type.includes("image")){
          resizeImage({
            file: file,
            maxSize: 640
          }).then(resizedImage => {
            this.runService.uploadCognaFile(resizedImage, this.cogna.id, file.name)
              .subscribe({
                next: res => {
                  if (res.type === HttpEventType.UploadProgress) {
                    progressSize = res.loaded;
                    this.uploadProgress[file.name] = Math.round(100 * progressSize / totalSize);
                  } else if (res instanceof HttpResponse) {
                    list.push(res.body.fileUrl);
                    this.filesMap[res.body.fileUrl] = res.body;
                    // this.fileList.push(res.body.filePath);
                    this.fileList.push({path:res.body.filePath, mime: file.type, isImage: true});
                  }
                  // $event.target.value='';
                }, error: err => {
                  console.error(err);
                  // $event.target.value='';
                }
              })
          }).catch(function (err) {
            console.error(err);
            // $event.target.value='';
          });
        }else{
          this.runService.uploadCognaFile(file, this.cogna.id, file.name)
              .subscribe({
                next: res => {
                  if (res.type === HttpEventType.UploadProgress) {
                    progressSize = res.loaded;
                    this.uploadProgress[file.name] = Math.round(100 * progressSize / totalSize);
                  } else if (res instanceof HttpResponse) {
                    list.push(res.body.fileUrl);
                    this.filesMap[res.body.fileUrl] = res.body;
                    // this.fileList.push(res.body.filePath);
                    this.fileList.push({path:res.body.filePath, mime: file.type, isImage: false});
                  }
                  // $event.target.value='';
                }, error: err => {
                  console.error(err);
                  // $event.target.value='';
                }
              })
        }
      }
      $event.target.value='';
    }
  }


}
