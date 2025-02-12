import { Component, OnInit, ElementRef, ChangeDetectorRef, OnDestroy, viewChild, output, input, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-scan',
    templateUrl: './scan.component.html',
    styleUrls: ['./scan.component.css'],
    imports: [NgClass, FormsModule, FaIconComponent]
})
export class ScanComponent implements OnInit, OnDestroy {
  errorMsg: any;

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    this.captures = [];

    // effect(()=>{
    //   this.pause = this.isPause();
    //   if (!this.pause){
    //     console.log("play...")
    //     this.video()?.nativeElement.play();
    //   }
    // })
  }

  // @ViewChild('video', { static: true })
  // public video: ElementRef;
  public video = viewChild<ElementRef>('video')

  // @ViewChild('canvas', { static: true })
  // public canvas: ElementRef;
  public canvas = viewChild<ElementRef>('canvas');

  public captures: Array<any>;

  value: string;
  token: string;
  user: any;
  error: boolean;
  // start:boolean;
  altClass: string;
  loading: boolean;
  codeReader = new BrowserMultiFormatReader();
  file: any;


  // @Output() valueChange = new EventEmitter();
  valueChange = output<any>();

  track: MediaStreamTrack;
  stream: any;
  scError:string;
  pause:boolean=false;

  torchSupport: boolean;


  camSupport: boolean = false;

  // isPause = input<boolean>();

  resume(){
    this.video()?.nativeElement.play();
  }

  ngOnInit() {
    this.scError = null;
    this.loading = true;
    //Test browser support
    const SUPPORTS_MEDIA_DEVICES = 'mediaDevices' in navigator;

    if (SUPPORTS_MEDIA_DEVICES) {
      this.camSupport = true;
      //Get the environment camera (usually the second one)
      navigator.mediaDevices.enumerateDevices().then(devices => {

        const cameras = devices.filter((device) => device.kind === 'videoinput');

        
        if (cameras.length === 0) {
          console.log("xda camera");
          this.camSupport = false;
          throw 'No camera found on this device.';
        }
        const camera = cameras[cameras.length - 1];

        // Create stream and get video track
        navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: camera.deviceId,
            facingMode: ['environment']
          }
        }).then(stream => {
          this.track = stream.getVideoTracks()[0];
          

          // Create image capture object and get camera capabilities
          try{
            const imageCapture = new ImageCapture(this.track)
            const photoCapabilities = imageCapture.getPhotoCapabilities().then(() => {
              // todo: check if camera has a torch
              const cap = this.track.getCapabilities();
              this.torchSupport = cap.torch;
              // console.log(cap);
              // this.track = track;
            });
          }catch(e){            
            this.torchSupport = false;
          }

          // // const input = document.querySelector('#focusRange');
          // this.fmin = cap.focusDistance.min;
          // this.fmax = cap.focusDistance.max;
          // this.fstep = cap.focusDistance.step;
          // this.fvalue = track.getSettings().focusDistance;

          // this.video.nativeElement.src = window.URL.createObjectURL(stream);
          this.video().nativeElement.srcObject = stream;
          this.loading = false;
          // this.video.nativeElement.play();

          this.codeReader
            // .decodeOnceFromStream(stream)
            .decodeFromStream(stream,this.video().nativeElement, (result, error, controls) => {
              if (result){
                this.pause = true;
                this.video()?.nativeElement.pause();
                this.valueChange.emit(result);
                // console.log(result);
              }
              // if (error){
              //   console.error(error)
              // }
              // use the result and error values to choose your actions
              // you can also use controls API in this scope like the controls
              // returned from the method.
            })

            // .decodeFromInputVideoDevice(undefined, 'video')
            // .then(result => {
            //   this.pause = true;
            //   this.video()?.nativeElement.pause();
            //   this.valueChange.emit(result);
            // })
            // .catch(err => console.error(err));


        }, error => {
          this.scError = error.message;
          this.camSupport = false;
          this.loading = false;
        });
      }, error =>{
        this.scError = error.message;
        this.camSupport = false;
        this.loading = false;
      });

    }
  }

  ngOnDestroy() {
    if (this.camSupport&& this.torchSupport) {
      this.switchTorch(false);
    }
    this.track.stop();
  }

  isTorch: boolean;
  switchTorch(value) {
    this.track.applyConstraints({
      advanced: [{ torch: value }]
    });
  }

  truncateColor(value) {
    if (value < 0) {
      value = 0;
    } else if (value > 255) {
      value = 255;
    }
    return value;
  }

  applyContrast(data, contrast) {
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));

    for (var i = 0; i < data.length; i += 4) {
      data[i] = this.truncateColor(factor * (data[i] - 128.0) + 128.0);
      data[i + 1] = this.truncateColor(factor * (data[i + 1] - 128.0) + 128.0);
      data[i + 2] = this.truncateColor(factor * (data[i + 2] - 128.0) + 128.0);
    }
  }

  qrValueChanged(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    if (file) {
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        const data = e.target.result;
        const img = new Image();
        img.onload = () => {
          this.codeReader
            .decodeFromImageElement(img)
            // .decodeFromImage(img)
            .then(result => {
              this.valueChange.emit(result);
            })
            .catch(err => console.error(err));
        };
        img.src = data;
      };
    }
  }



}
