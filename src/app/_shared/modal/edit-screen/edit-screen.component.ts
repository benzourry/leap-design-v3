import { Component, OnInit, input, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';

@Component({
    selector: 'app-edit-screen',
    templateUrl: './edit-screen.component.html',
    styleUrls: ['./edit-screen.component.scss'],
    imports: [FormsModule, FaIconComponent, NgCmComponent, NgSelectModule]
})
export class EditScreenComponent implements OnInit {

  // @Input("screen")
  editScreenData = model<any>({}, { alias: 'screen' });

  // @Input()
  datasetList = input<any[]>([])

  // @Input()
  formList = input<any[]>([])

  // @Input()
  cognaList = input<any[]>([])

  // @Input()
  bucketList = input<any[]>([])

  // @Input()
  accessList = input<any[]>([])

  // @Input()
  // screenList = input<any[]>([])
  extraAutoCompleteJs = input<any[]>([]);

  // @Input()
  close = input<any>();

  // @Input()
  dismiss = input<any>();

  screenTypeList = [{
    code: 'qr',
    name: 'QR Scanner',
    description: 'QR Code scanner screen',
    icon: ['fas', 'qrcode']
  },
  {
    code: 'prompt',
    name: 'Prompt',
    description: 'User prompt input screen',
    icon: ['fas', 'copy']
  },
  {
    code: 'page',
    name: 'Entry Page',
    description: 'Custom screen from entry',
    icon: ['fab', 'wpforms']
  },
  {
    code: 'list',
    name: 'Entry List',
    description: 'Custom screen from dataset',
    icon: ['fas', 'stream']
  },
  {
    code: 'static',
    name: 'Static Page',
    description: 'Custom screen from scratch',
    icon: ['far', 'file']
  },
  {
    code: 'calendar',
    name: 'Calendar',
    description: 'Calendar screen from dataset',
    icon: ['far', 'calendar-alt']
  },
  {
    code: 'chatbot',
    name: 'Chatbot',
    description: 'Chatbot screen from cogna',
    icon: ['far', 'comment-dots']
  },
  {
    code: 'bucket',
    name: 'Bucket',
    description: 'Bucket file list screen',
    icon: ['fas', 'box']
  },
  {
    code: 'map',
    name: 'Map',
    description: 'Location map from dataset',
    icon: ['fas', 'location-dot']
  },
  {
    code: 'mailbox',
    name: 'Mailbox',
    description: 'Mailbox screen for user',
    icon: ['fas', 'inbox']
  },
  {
    code: 'combine',
    name: 'Combined',
    description: 'Combine components',
    icon: ['fas', 'table']
  }]

  ngOnInit() {
    // this.initialAppPath = this.data.appPath;
    // this.loadPages();
    // this.loadScreen();
    if (!this.editScreenData().data) {
      this.editScreenData.update(screen => {
        screen.data = {};
        return screen;
      });
    }
  }




  resetLinkedData(item) {
    item.update(i => {
      delete i.form;
      delete i.dataset;
      delete i.bucket;
      delete i.cogna;
      return i;
    });
  }

  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }

}
