import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { VoiceRecognitionService } from '../../_service/speech-recognition.service';
import { NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-speech-to-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem],
  templateUrl: './speech-to-text.component.html',
  styleUrl: './speech-to-text.component.scss'
})
export class SpeechToTextComponent implements OnInit {
  
  public isUserSpeaking = signal<boolean>(false);

  field = input<any>();
  lblLang = input<string>('en');
  defaultLang = input<string>();
  value = input<string>('');
  extractLoading = input<boolean>(false);
  
  // Added to fix template `formField?.invalid` reference errors
  formField = input<any>(); 

  valueChange = output<string>();
  
  model = model<string>(''); 
  speechLang = signal<string>('en-US');
  valueText = signal<string>('');

  private voiceRecognition = inject(VoiceRecognitionService);
  private destroyRef = inject(DestroyRef); // Handles memory cleanup

  constructor() {
    effect(() => {
      const defLang = this.defaultLang();
      if (defLang) {
        this.speechLang.set(defLang);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      this.valueText.set(this.value());  
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.initVoiceInput();
  }

  /**
   * @description Function to stop recording.
   */
  stopRecording() {
    this.voiceRecognition.stop();
    this.isUserSpeaking.set(false);
  }

  /**
   * @description Function for initializing voice input so user can chat with machine.
   */
  initVoiceInput() {
    // Subscription for initializing; takeUntilDestroyed prevents memory leaks
    this.voiceRecognition.init(this.valueText(), this.speechLang())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // User has stopped recording
      });

    // Subscription to detect user input from voice to text.
    this.voiceRecognition.speechInput()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((inputVal: string) => {
        const stopWord = this.field()?.x?.stopWord;
        
        if (stopWord && inputVal?.toLowerCase().includes(stopWord.toLowerCase())) {
          this.stopRecording();  
        }
        
        this.valueText.set(inputVal);
        this.valueChange.emit(inputVal);
      });
  }

  setSpeechLang(lang: string) {
    this.speechLang.set(lang);
    this.voiceRecognition.updateLang(lang);
  }

  /**
   * @description Function to enable voice input.
   */
  startRecording() {
    this.isUserSpeaking.set(true);
    this.voiceRecognition.start();
  }
}