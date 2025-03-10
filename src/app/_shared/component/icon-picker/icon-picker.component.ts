import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FilterPipe } from '../../pipe/filter.pipe';

@Component({
    selector: 'app-icon-picker',
    templateUrl: './icon-picker.component.html',
    styleUrls: ['./icon-picker.component.scss'],
    imports: [FaIconComponent, FormsModule, FilterPipe]
})
export class IconPickerComponent {


  getIcon = (str) => str ? str.split(":") : ['far', 'file'];

  icon: string = "";

  searchText:string="";

  iconList = [
    { key: "fas:check-square", value: ["fas", "check-square"] },
    { key: "fas:square", value: ["fas", "square"] },
    { key: "fas:th", value: ["fas", "th"] },
    { key: "fas:th-large", value: ["fas", "th-large"] },
    { key: "fas:table", value: ["fas", "table"] },
    { key: "fas:plus-circle", value: ["fas", "plus-circle"] },
    { key: "fas:plus-square", value: ["fas", "plus-square"] },
    { key: "far:plus-square", value: ["far", "plus-square"] },
    { key: "far:minus-square", value: ["far", "minus-square"] },
    { key: "fas:pencil-alt", value: ["fas", "pencil-alt"] },
    { key: "fas:edit", value: ["fas", "edit"] },
    { key: "fas:cog", value: ["fas", "cog"] },
    { key: "fas:trash", value: ["fas", "trash"] },
    { key: "fas:sign-out-alt", value: ["fas", "sign-out-alt"] },
    { key: "fas:save", value: ["fas", "save"] },
    { key: "fas:plus", value: ["fas", "plus"] },
    { key: "fas:times", value: ["fas", "times"] },
    { key: "fas:check", value: ["fas", "check"] },
    { key: "fas:question", value: ["fas", "question"] },
    { key: "far:question-circle", value: ["far", "question-circle"] },
    { key: "fas:tachometer-alt", value: ["fas", "tachometer-alt"] },
    { key: "fas:chart-area", value: ["fas", "chart-area"] },
    { key: "fas:chart-bar", value: ["fas", "chart-bar"] },
    { key: "fas:chart-line", value: ["fas", "chart-line"] },
    { key: "fas:chart-pie", value: ["fas", "chart-pie"] },
    { key: "fas:calendar", value: ["fas", "calendar"] },
    { key: "fas:paper-plane", value: ["fas", "paper-plane"] },
    { key: "fas:window-restore", value: ["fas", "window-restore"] },
    { key: "fas:inbox", value: ["fas", "inbox"] },
    { key: "fas:info-circle", value: ["fas", "info-circle"] },
    { key: "fas:exclamation-triangle", value: ["fas", "exclamation-triangle"] },
    { key: "fas:upload", value: ["fas", "upload"] },
    { key: "fas:circle", value: ["fas", "circle"] },
    { key: "fas:globe", value: ["fas", "globe"] },
    { key: "fas:lock", value: ["fas", "lock"] },
    { key: "fas:file", value: ["fas", "file"] },
    { key: "fas:file-excel", value: ["fas", "file-excel"] },
    { key: "fas:file-csv", value: ["fas", "file-csv"] },
    { key: "fas:file-pdf", value: ["fas", "file-pdf"] },
    { key: "fas:filter", value: ["fas", "filter"] },
    { key: "fas:qrcode", value: ["fas", "qrcode"] },
    { key: "fas:university", value: ["fas", "university"] },
    { key: "fas:shopping-bag", value: ["fas", "shopping-bag"] },
    { key: "fas:shopping-cart", value: ["fas", "shopping-cart"] },
    { key: "fas:sitemap", value: ["fas", "sitemap"] },
    { key: "fas:search", value: ["fas", "search"] },
    { key: "fas:copy", value: ["fas", "copy"] },
    { key: "fas:print", value: ["fas", "print"] },
    { key: "far:comment-dots", value: ["far", "comment-dots"] },
    { key: "far:thumbs-up", value: ["far", "thumbs-up"] },
    { key: "fas:file-export", value: ["fas", "file-export"] },
    { key: "fas:user-edit", value: ["fas", "user-edit"] },
    { key: "fas:list", value: ["fas", "list"] },
    { key: "fas:list-alt", value: ["fas", "list-alt"] },
    { key: "fas:list-ol", value: ["fas", "list-ol"] },
    { key: "fas:stream", value: ["fas", "stream"] },
    { key: "fas:tasks", value: ["fas", "tasks"] },
    { key: "fas:users-cog", value: ["fas", "users-cog"] },
    { key: "fas:expand", value: ["fas", "expand"] },
    { key: "fas:compress", value: ["fas", "compress"] },
    { key: "fas:toggle-on", value: ["fas", "toggle-on"] },
    { key: "fas:toggle-off", value: ["fas", "toggle-off"] },
    { key: "fas:map-marked-alt", value: ["fas", "map-marked-alt"] },
    { key: "fas:users", value: ["fas", "users"] },
    { key: "far:circle", value: ["far", "circle"] },
    { key: "far:file", value: ["far", "file"] },
    { key: "far:check-square", value: ["far", "check-square"] },
    { key: "far:square", value: ["far", "square"] },
    { key: "far:user", value: ["far", "user"] },
    { key: "far:circle-user", value: ["far", "circle-user"] },
    { key: "far:caret-square-down", value: ["far", "caret-square-down"] },
    { key: "far:envelope", value: ["far", "envelope"] },
    { key: "far:calendar-alt", value: ["far", "calendar-alt"] },
    { key: "fab:google", value: ["fab", "google"] },
    { key: "fab:facebook-f", value: ["fab", "facebook-f"] },
    { key: "fab:github", value: ["fab", "github"] },
    { key: "fab:linkedin", value: ["fab", "linkedin"] },
    { key: "fab:wpforms", value: ["fab", "wpforms"] },
    { key: "fas:reply", value: ["fas", "reply"] },
    { key: "fas:share", value: ["fas", "share"] },
    { key: "fas:arrow-up", value: ["fas", "arrow-up"] },
    { key: "fas:arrow-down", value: ["fas", "arrow-down"] },
    { key: "fas:arrow-left", value: ["fas", "arrow-left"] },
    { key: "fas:arrow-right", value: ["fas", "arrow-right"] },
    { key: "fas:chevron-left", value: ["fas", "chevron-left"] },
    { key: "fas:chevron-right", value: ["fas", "chevron-right"] },
    { key: "fas:angle-up", value: ["fas", "angle-up"] },
    { key: "fas:angle-down", value: ["fas", "angle-down"] },
    { key: "fas:angle-right", value: ["fas", "angle-right"] },
    { key: "fas:angle-double-left", value: ["fas", "angle-double-left"] },
    { key: "fas:angle-double-right", value: ["fas", "angle-double-right"] },
    { key: "fas:history", value: ["fas", "history"] },
    { key: "fas:rocket", value: ["fas", "rocket"] },
    { key: "fas:box", value: ["fas", "box"] },
    { key: "fas:mail-bulk", value: ["fas", "mail-bulk"] },
    { key: "fas:share-alt", value: ["fas", "share-alt"] },
    { key: "fas:play", value: ["fas", "play"] },
    { key: "fas:sync", value: ["fas", "sync"] },
    { key: "far:file-archive", value: ["far", "file-archive"] },
    { key: "fas:robot", value: ["fas", "robot"] },
    { key: "fas:flag", value: ["fas", "flag"] },
    { key: "far:flag", value: ["far", "flag"] },
    { key: "fas:bolt", value: ["fas", "bolt"] },
    { key: "far:eye", value: ["far", "eye"] },
    { key: "fas:location-crosshairs", value: ["fas", "location-crosshairs"]},
    { key: "fas:location-dot", value: ["fas", "location-dot"]},
    { key: "fas:file-invoice-dollar", value: ["fas", "file-invoice-dollar"]},
    { key: "fas:magnifying-glass-location", value: ["fas", "magnifying-glass-location"]},
    { key: "fas:plane", value: ["fas", "plane"]},
    { key: "fas:laptop-medical", value: ["fas", "laptop-medical"]},
    { key: "fas:address-book", value: ["fas", "address-book"]},
    { key: "fas:photo-film", value: ["fas", "photo-film"]},
    { key: "fas:layer-group", value: ["fas", "layer-group"]},
    { key: "far:message", value: ["far", "message"]},
    { key: "fas:diagram-project", value: ["fas", "diagram-project"]},
  ];


  // @Input()
  // model: string;
  model= model<string>();

  // @Input()
  // showNone: boolean;
  showNone=input<boolean>();

  // Output prop name must be Input prop name + 'Change'
  // Use in your component to write an updated value back out to the parent
  // @Output()
  // modelChange = new EventEmitter<string>();

  public change(model){
    this.model.set(model);
    // this.modelChange.emit(model);
  }

}
