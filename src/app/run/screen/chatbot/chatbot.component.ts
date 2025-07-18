import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
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
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { IconSplitPipe } from '../../../_shared/pipe/icon-split.pipe';

@Component({
  selector: 'app-chatbot',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FaIconComponent, DatePipe, SafePipe, IconSplitPipe],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss'
})
export class ChatbotComponent implements OnInit {


  public runService = inject(RunService);
  private toastService = inject(ToastService);
  private logService = inject(LogService);
  private utilityService = inject(UtilityService);
  private voiceRecognition = inject(VoiceRecognitionService);
  
  constructor() {
    this.utilityService.testOnline$().subscribe(online => this.offline.set(!online));
  }

  offline = signal<boolean>(false);
  screen = input<any>();
  app = computed<any>(() => this.runService.$app());
  user = computed<any>(() => this.runService.$user());
  cogna: any;
  compileTplData = input<any>();
  baseApi = baseApi;
  scopeId = computed<string>(() => "screen_"+this.screen().id);

  ngOnInit() {
    this.cogna = this.screen().cogna;
    let fromStorage = sessionStorage.getItem("cogna-" + this.cogna.id + "-" + this.user().email)

    if (fromStorage) {
      this.chatResponseList.set(JSON.parse(fromStorage))
    } else {
      this.chatResponseList.set([]);
    }

    this.initVoiceInput();

    this.scrollBottom();
  }

  isListening = signal<boolean>(false);
  // voiceText: string = "";
  startListen() {
    this.isListening.set(true);
    this.voiceRecognition.start();
  }

  initVoiceInput() {
    // Subscription for initializing and this will call when user stopped speaking.
    this.voiceRecognition.init(this.chatPromptText(), 'en-US').subscribe(() => {
      // User has stopped recording
      // Do whatever when mic finished listening
    });

    // Subscription to detect user input from voice to text.
    this.voiceRecognition.speechInput().subscribe((input) => {
      // Set voice text output to
      // this.speechText = input;
      this.chatPromptText.set(input);
    });
  }

  stopListen() {
    this.voiceRecognition.stop();
    this.isListening.set(false);
  }

  onrespinit() {
    console.log("resp init");
  }

  chatResponseList = signal<any[]>([]);
  chatPromptText = signal<string>("");
  chatPromptLoading = signal<boolean>(false);
  streamTyping = signal<boolean>(false);
  streamResult = signal<string>("");
  chatPrompt(cogna, prompt) {
    if (prompt?.trim() || this.fileList().length > 0) {
      this.scrollBottom();
      // this.chatResponseList.push({ type: 'prompt', text: prompt, files: this.fileList, timestamp: Date.now() })
      this.chatResponseList.update((currentList) => [
        ...currentList,
        { type: 'prompt', text: prompt, files: this.fileList(), timestamp: Date.now() },
      ]);
      this.chatPromptLoading.set(true);
      sessionStorage.setItem("cogna-" + cogna.id + "-" + this.user().email, JSON.stringify(this.chatResponseList()))

      if (cogna.streamSupport) {
        this.runService.streamCognaPrompt(cogna.id, prompt, this.fileList().map(f => f.path), this.user().email)
          .pipe(
            map(res => {
              if (res['type'] == 4) {
                this.chatPromptLoading.set(false);
                this.streamResult.set(compileTpl('<x-markdown>' + res['body'] + '</x-markdown>', {}, this.scopeId()));
                this.streamTyping.set(false);
                this.chatResponseList.update((currentList) => [
                  ...currentList,
                  { type: 'response', text: compileTpl('<x-markdown>' + this.streamResult() + '</x-markdown>', {}, this.scopeId()), timestamp: Date.now() },
                ]);
                sessionStorage.setItem("cogna-" + cogna.id + "-" + this.user().email, JSON.stringify(this.chatResponseList()));
                this.scrollBottom();

              } else {
                this.streamResult.set(res['partialText'] ? compileTpl('<x-markdown>' + (res['partialText'] ?? "") + '</x-markdown>', {},this.scopeId()) : '');
                if (this.streamResult()?.length > 0) {
                  this.chatPromptLoading.set(false);
                  this.streamTyping.set(true);
                }
                this.scrollBottom();
              }
            })
          )
          .subscribe(res => {
          }, err => {
            this.chatPromptLoading.set(false);
            this.streamTyping.set(false);
            this.chatResponseList.update((currentList) => [
              ...currentList,
              { type: 'system', text: 'Error loading response: ' + err.message, timestamp: Date.now() },
            ]);
            this.toastService.show("Cogna response failed", { classname: 'bg-danger text-light' });
          });

      } else {

        this.runService.cognaPrompt(cogna.id, prompt, this.fileList().map(f => f.path), this.user().email)
          .subscribe({
            next: res => {
              this.chatPromptLoading.set(false);
              this.chatResponseList.update((currentList) => [
                ...currentList,
                { type: 'response', text: compileTpl('<x-markdown>' + res.result + '</x-markdown>', {}, this.scopeId()), timestamp: Date.now() },
              ]);
              sessionStorage.setItem("cogna-" + cogna.id + "-" + this.user().email, JSON.stringify(this.chatResponseList()));
              this.scrollBottom();
            },
            error: err => {
              this.chatPromptLoading.set(false);
              this.chatResponseList.update((currentList) => [
                ...currentList,
                { type: 'system', text: 'Error loading response: ' + err.error.message, timestamp: Date.now() },
              ]);
              this.toastService.show("Prompt failure: " + err.error.message, { classname: 'bg-danger text-light' });
            }
          });
      }


      this.chatPromptText.set("");
      this.fileList.set([]);
    }

  }

  scrollBottom() {
    setTimeout(() => {
      var elemChatViewPort = document.getElementById("_viewport");
      elemChatViewPort.scrollTo({
        top: elemChatViewPort.scrollHeight + 200,
        left: 0,
        behavior: "smooth",
      })
    }, 0)
  }


  clearCognaMemory(cogna) {
    this.runService.clearCognaMemoryByIdAndEmail(cogna.id, this.user().email)
      .subscribe({
        next: res => {
          this.toastService.show("Memory successfully cleared ", { classname: 'bg-success text-light' });
        },
        error: err => {
          this.toastService.show("Memory cannot be cleared ", { classname: 'bg-danger text-light' });
        }
      });
    sessionStorage.removeItem("cogna-" + cogna.id + "-" + this.user().email);
    this.chatResponseList.set([]);
  }


  removeFile(index) {
    this.fileList.update((currentList) => currentList.filter((_, i) => i !== index));
  }

  linkify = linkify;
  imagify = imagify;
  targetBlank = targetBlank;


  getIcon = (str) => str ? str.split(":") : ['far', 'question-circle'];

  copyChatText(text) {
    navigator.clipboard.writeText(text).then((res) => {
      this.toastService.show("Chat text copied", { classname: 'bg-secondary bg-opacity-50 text-light' });
    }).catch(e => console.log(e));

  }

  reportChat(text) {
    if (confirm("Are you sure you want to report this chat response?")) {
      this.toastService.show("Chat has been reported", { classname: 'bg-secondary bg-opacity-50 text-light' });
    }
  }

  compileTpl(html, data) {
    var f = "";
    try {
      f = compileTpl(html, data, this.scopeId());
    } catch (e) {
      this.logService.log(`{screen-${this.screen().title}-compiletpl}-${e}`)
    }
    return f;
  }


  uploadPromptImg;
  uploadPromptImgMimeType;
  uploadPromptLoading = false;
  uploadPromptImage($event) {
    if ($event.target.files && $event.target.files.length) {
      var file = $event.target.files[0];
      resizeImage({
        file: file,
        maxSize: 640
      }).then((resizedImage: Blob) => {
        this.uploadPromptImg = URL.createObjectURL(resizedImage);
        this.uploadPromptImgMimeType = file.type;
      }).catch(function (err) {
        console.error(err);
      });
    }

  }


  uploadProgress = signal<any>({});
  filesMap: any = {};
  fileList = signal<any[]>([]);
  onUpload($event) {
    if ($event.target.files && $event.target.files.length) {
      var totalSize = 0;
      for (var i = 0; i < $event.target.files.length; i++) {
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
        if (file.type.includes("image")) {
          resizeImage({
            file: file,
            maxSize: 640
          }).then(resizedImage => {
            this.runService.uploadCognaFile(resizedImage, this.cogna.id, file.name)
              .subscribe({
                next: res => {
                  if (res.type === HttpEventType.UploadProgress) {
                    progressSize = res.loaded;
                    this.uploadProgress.update((currentProgress) => ({
                      ...currentProgress,
                      [file.name]: Math.round(100 * progressSize / totalSize)
                    }));
                    // this.uploadProgress[file.name] = Math.round(100 * progressSize / totalSize);
                  } else if (res instanceof HttpResponse) {
                    list.push(res.body.fileUrl);
                    this.filesMap[res.body.fileUrl] = res.body;
                    // this.fileList.push(res.body.filePath);
                    // this.fileList.push({ path: res.body.filePath, mime: file.type, isImage: true });
                    this.fileList.update((currentList) => [
                      ...currentList,
                      { path: res.body.filePath, mime: file.type, isImage: true }
                    ]);
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
        } else {
          this.runService.uploadCognaFile(file, this.cogna.id, file.name)
            .subscribe({
              next: res => {
                if (res.type === HttpEventType.UploadProgress) {
                  progressSize = res.loaded;
                  this.uploadProgress.update((currentProgress) => ({
                    ...currentProgress,
                    [file.name]: Math.round(100 * progressSize / totalSize)
                  }));
                  // this.uploadProgress[file.name] = Math.round(100 * progressSize / totalSize);
                } else if (res instanceof HttpResponse) {
                  list.push(res.body.fileUrl);
                  this.filesMap[res.body.fileUrl] = res.body;
                  // this.fileList.push(res.body.filePath);
                  // this.fileList.push({ path: res.body.filePath, mime: file.type, isImage: false });
                  this.fileList.update((currentList) => [
                    ...currentList,
                    { path: res.body.filePath, mime: file.type, isImage: false }
                  ]);
                }
                // $event.target.value='';
              }, error: err => {
                console.error(err);
                // $event.target.value='';
              }
            })
        }
      }
      $event.target.value = '';
    }
  }


}
