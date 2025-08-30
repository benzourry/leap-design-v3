import { Component, OnInit, ElementRef, ChangeDetectorRef, OnDestroy, viewChild, output, input, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-scan',
    // changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './scan.component.html',
    styleUrls: ['./scan.component.css'],
    imports: [NgClass, FormsModule, FaIconComponent]
})
export class ScanComponent implements OnInit, OnDestroy {
  errorMsg = signal<string>('');

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    this.captures = [];
  }

  public video = viewChild<ElementRef>('video')

  public canvas = viewChild<ElementRef>('canvas');

  public captures: Array<any>;

  value: string;
  token: string;
  user: any;
  error: boolean;
  altClass: string;
  loading = signal<boolean>(false);
  codeReader = new BrowserMultiFormatReader();
  file: any;

  valueChange = output<any>();

  track: MediaStreamTrack;
  stream: any;
  scError = signal<string>(null);
  pause = signal<boolean>(false);

  torchSupport = signal<boolean>(false);


  camSupport = signal<boolean>(false);


  resume(){
    this.video()?.nativeElement.play();
  }

  ngOnInit() {
    this.scError.set(null);
    this.loading.set(true);
    //Test browser support
    const SUPPORTS_MEDIA_DEVICES = 'mediaDevices' in navigator;

    if (SUPPORTS_MEDIA_DEVICES) {
      this.camSupport.set(true);
      //Get the environment camera (usually the second one)
      navigator.mediaDevices.enumerateDevices().then(devices => {

        const cameras = devices.filter((device) => device.kind === 'videoinput');

        
        if (cameras.length === 0) {
          // console.log("xda camera");
          this.camSupport.set(false);
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
              this.torchSupport.set(cap.torch);
              // console.log(cap);
              // this.track = track;
            });
          }catch(e){            
            this.torchSupport.set(false);
          }

          // // const input = document.querySelector('#focusRange');
          // this.fmin = cap.focusDistance.min;
          // this.fmax = cap.focusDistance.max;
          // this.fstep = cap.focusDistance.step;
          // this.fvalue = track.getSettings().focusDistance;

          // this.video.nativeElement.src = window.URL.createObjectURL(stream);
          this.video().nativeElement.srcObject = stream;
          this.loading.set(false);
          // this.video.nativeElement.play();

          this.codeReader
            // .decodeOnceFromStream(stream)
            .decodeFromStream(stream,this.video().nativeElement, (result, error, controls) => {
              if (result){
                this.pause.set(true);
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

        }, error => {
          this.scError.set(error.message);
          this.camSupport.set(false);
          this.loading.set(false);
        });
      }, error =>{
        this.scError.set(error.message);
        this.camSupport.set(false);
        this.loading.set(false);
      });

    }
  }

  ngOnDestroy() {
    if (this.camSupport() && this.torchSupport()) {
      this.switchTorch(false);
    }
    this.track.stop();
  }

  isTorch = signal<boolean>(false);
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
