import { DatePipe } from '@angular/common';
import { Component, input, model, output } from '@angular/core';
// import { VoiceRecognitionService } from '../../../_shared/service/speech-recognition.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { VoiceRecognitionService } from '../../_service/speech-recognition.service';
import { NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-speech-to-text',
    imports: [FaIconComponent, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem],
    templateUrl: './speech-to-text.component.html',
    styleUrl: './speech-to-text.component.scss'
})
export class SpeechToTextComponent {
    public isUserSpeaking: boolean = false;

    field = input<any>();

    constructor(
      private voiceRecognition: VoiceRecognitionService
    ) {
    }

    // speechText:string = "";

    model=model<string>('');
    lang:string='en-US';
    defaultLang = input<string>();

    value=input<string>('');
    valueChange=output<string>();
    valueText:string = '';

    extractLoading = input<boolean>();


    ngOnInit(): void {
      if (this.defaultLang()){
        this.lang = this.defaultLang();
      } 
      this.valueText = this.value();     
      // init after setting value n lang
      this.initVoiceInput();
    }

    /**
   * @description Function to stop recording.
   */
    stopRecording() {
      this.voiceRecognition.stop();
      this.isUserSpeaking = false;
    }
  
    /**
     * @description Function for initializing voice input so user can chat with machine.
     */
    initVoiceInput() {
      // Subscription for initializing and this will call when user stopped speaking.
      this.voiceRecognition.init(this.valueText, this.lang).subscribe(() => {
        // User has stopped recording
        // Do whatever when mic finished listening
      });
  
      // Subscription to detect user input from voice to text.
      this.voiceRecognition.speechInput().subscribe((input) => {
        // Set voice text output to
        if (this.field().x?.stopWord && input?.toLowerCase().includes(this.field().x?.stopWord?.toLowerCase())){
          this.stopRecording();  
        }
        // this.speechText = input;
        this.valueText = input;
        this.valueChange.emit(input);
        // this.model.set(input);
        // this.searchForm.controls.searchText.setValue(input);
      });
    }

    setLang(lang){
      this.lang=lang;
      this.voiceRecognition.updateLang(lang);
    }
  
    /**
     * @description Function to enable voice input.
     */
    startRecording() {
      this.isUserSpeaking = true;
      this.voiceRecognition.start();
      // this.speechText = "";
      // this.searchForm.controls.searchText.reset();
    }

}
