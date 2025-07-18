import { ChangeDetectionStrategy, Component, OnInit, input, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';

@Component({
    selector: 'app-edit-screen',
    templateUrl: './edit-screen.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./edit-screen.component.scss'],
    imports: [FormsModule, FaIconComponent, NgCmComponent, NgSelectModule]
})
export class EditScreenComponent implements OnInit {

  editScreenData = model<any>({}, { alias: 'screen' });
  _editScreenData:any = {};

  datasetList = input<any[]>([])

  formList = input<any[]>([])

  cognaList = input<any[]>([])

  bucketList = input<any[]>([])

  accessList = input<any[]>([])

  extraAutoCompleteJs = input<any[]>([]);

  close = input<any>();

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
    this._editScreenData = {...this.editScreenData()};

    if (!this._editScreenData.data) {
      this._editScreenData.data = {};
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
    return a && b && a.id === b.id;
  }

  done(data) {
    this.editScreenData.set(data);
    this.close()?.(data);
  }

}
