// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// 
// LEAP is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
// 
// LEAP is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LEAP.  If not, see <http://www.gnu.org/licenses/>.

import { NgModule } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FilterPipe } from './pipe/filter.pipe';
// import { NgSelectModule } from '@ng-select/ng-select';
// import { NgxSliderModule } from '@m0t0r/ngx-slider';
// import { FormsModule } from '@angular/forms';
// import { HttpClientModule } from '@angular/common/http';
// import { OrderByPipe } from './pipe/order-by.pipe';
// import { PageTitleComponent } from '../_shared/component/page-title.component';

// import { NgbPaginationModule, NgbModalModule, NgbNavModule, NgbDatepickerModule, NgbTooltipModule, NgbToastModule, NgbTimepickerModule, NgbAccordionModule, NgbTypeaheadModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
// import { library } from '@fortawesome/fontawesome-svg-core';
import {
    faCheckSquare, faSquare, faQuidditch, faTh, faPlusCircle, faChartBar, faChartPie, faChartLine, faPencilAlt, faCog, faTrash, faPlus,
    faThLarge, faSignOutAlt, faSave, faAngleRight, faAngleLeft, faFile, faTimes, faPlay, faTachometerAlt, faPlusSquare,
    faListOl, faCalendar, faPaperPlane, faQuestion, faArrowUp, faArrowDown, faInfoCircle, faArrowLeft, faArrowRight, faExclamationTriangle, faReply, faShare, faCheck,
    faUpload, faDownload, faCircle as fasCircle,
    faAngleDoubleRight,
    faWindowRestore,
    faSitemap,
    faGlobe,
    // faColumns,
    
    faSort,
    faShareAlt,
    faCircleNotch,
    faLock,
    // faReceipt,
    faListAlt,
    faFileExcel,
    // faFileDownload,
    faMailBulk,
    // faSlidersH,
    faUsersCog,
    faChartArea,
    faTable,
    faFilter,
    // faMicrophone,
    faQrcode,
    faList,
    faShoppingBag,
    // faShareAltSquare,
    // faAsterisk, 
    faUniversity,
    faSearch,
    faEllipsisH,
    faCopy,
    faChevronLeft,
    faChevronRight,
    faPrint,
    faAlignLeft,
    faAlignCenter,
    faAlignRight,
    faFileCsv,
    faFilePdf,
    faGripVertical,
    faStream,
    faAngleDown,
    faAngleUp,
    faTerminal,
    // faUndo,
    faTasks,
    faEdit,
    faFlag,
    faExpand, faCompress, faUserEdit, faFileExport, faImage, faBolt,
    // faAdjust,
     faToggleOn, faToggleOff, faLink, faMapMarkedAlt, faUsers, faHistory, faBox, 
     faRocket, faSync, faShoppingCart, faInbox, faCircleNodes, faFileWaveform, faStop, faRobot, faAlignJustify, 
     faLocationCrosshairs, faLocationDot, faPlane, faMagnifyingGlassLocation, faLaptopMedical, faAddressBook, 
     faFileInvoiceDollar, faPhotoFilm, faLayerGroup, faDiagramProject, faRandom,
     faMicrophone,
     faAngleDoubleLeft,
     faFileImport,
     faHexagonNodes,
     faHashtag,
     faSignature,
     faKey
} from '@fortawesome/free-solid-svg-icons';
import {
    faThumbsUp,
    faCalendarAlt, faFileArchive, faFlag as farFlag,
    faQuestionCircle,faCircle as farCircle, faFile as farFile, faCheckSquare as farCheckSquare, 
    faEye, faSquare as farSquare, faUser, faCaretSquareDown, faEnvelope, faCircleUser, faCommentDots, faFileCode, faMinusSquare, faPlusSquare as farPlusSquare, faMessage,
    faClock,
    faFileLines,
    faEyeSlash
} from '@fortawesome/free-regular-svg-icons';
import {
    faGoogle, faFacebookF, faGithub, faLinkedin, faWpforms,faMicrosoft, faTwitter, faUncharted
} from '@fortawesome/free-brands-svg-icons';
import { RxStompService } from './service/rx-stomp.service';
import { rxStompServiceFactory } from './service/rx-stomp-service-factory';
// import { UserEntryFilterComponent } from './component/user-entry-filter/user-entry-filter.component';

// ### DI PAKE n REFERENCE DLM main.ts

@NgModule({
    imports: [],
    exports: [],
    providers: [{
        provide: RxStompService,
        useFactory: rxStompServiceFactory,
      }]
    // declarations: []
})
export class SharedModule {
    constructor(library: FaIconLibrary) {
        // library.addIconPacks(fas);
        library.addIcons(faExpand, faCompress, faEdit, faTasks,faChevronLeft, faUsersCog, faPrint, faWpforms, faChevronRight, faGoogle, faFacebookF, faUniversity, faGithub, faLinkedin, faCheckSquare, faCheck, faSquare, faQuidditch, faTh, faPlusCircle, faThumbsUp, faChartBar, faChartArea, faChartLine, faChartPie, faPencilAlt, faCog, faTrash, faPlus,faTimes,faCopy,
            faFileExcel, faFileCsv, faSync, faFilePdf, faSave, faFileCode, faStream, farFile, faLink, faEllipsisH, faBox,faMicrosoft, faTwitter,
            farCheckSquare, farSquare, faSignOutAlt, faAngleDown, faAngleUp, faRandom, faTerminal, faToggleOn, faToggleOff, faMapMarkedAlt, faInbox,
            faThLarge, faEnvelope, faGripVertical, faCircleUser, faCommentDots, faSearch, faFilter, faCaretSquareDown, faShoppingBag, faShoppingCart, faQuestionCircle, faUser, faSignOutAlt, faSave, faAngleRight, faFile, faTimes, faPlay, faTachometerAlt, faPlusSquare, farPlusSquare, faMinusSquare,
            faListOl, faCalendar, faCalendarAlt, faRocket, faPaperPlane, faQuestion, faArrowUp, faArrowDown, faInfoCircle, faAngleRight, faAngleLeft, faArrowLeft, faArrowRight, faExclamationTriangle, faHistory,
            faReply, faAlignLeft, faAlignCenter, faAlignRight, faAlignJustify, faQrcode, faShare, faTable, faList, farCircle, fasCircle, faMailBulk, faUsersCog, faFileExcel, faListAlt, faCircleNotch, faUpload, faDownload, faAngleDoubleRight, faAngleDoubleLeft, faWindowRestore, faSitemap, faGlobe, faSort, faShareAlt, faLock, faUsers,
            faFileArchive, faUserEdit, faFileExport, faUncharted, faCircleNodes, faFileWaveform, faStop, faRobot, faFlag, farFlag, faImage, faBolt, faEye, faEyeSlash, faFileImport,
            faLocationCrosshairs, faLocationDot, faPlane, faMagnifyingGlassLocation, faLaptopMedical, faAddressBook, faFileInvoiceDollar, faPhotoFilm, faLayerGroup, faMessage, faDiagramProject, faFileLines,
        faMicrophone, faClock, faHexagonNodes, faHashtag, faSignature, faKey);
    }
}
