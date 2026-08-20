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
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
// --- SOLID ICONS ---
import {
    faAddressBook, faAlignCenter, faAlignJustify, faAlignLeft, faAlignRight,
    faAngleDoubleLeft, faAngleDoubleRight, faAngleDown, faAngleLeft, faAngleRight, faAngleUp,
    faArrowDown, faArrowLeft, faArrowRight, faArrowUp, faAsterisk, faAward, faBan, faBars, faBed, faBell, faBolt,
    faBook, faBookmark, faBox, faBrain, faBriefcase, faBuilding, faBullhorn, faCalendar, faChartArea, faChartBar, faChartLine, faChartPie, faCheck,
    faCheckCircle, faCheckSquare, faChalkboardTeacher, faChevronLeft, faChevronRight, faCircleNodes, faCircleNotch,
    faCloud, faCloudDownloadAlt, faCloudUploadAlt, faCode, faCodeBranch, faCog, faCoins, faCompress,
    faCopy, faCouch, faCreditCard, faDatabase, faDiagramProject, faDownload, faEdit, faEllipsisH,
    faEllipsisV, faExclamationCircle, faExclamationTriangle, faExpand, faExternalLinkAlt,
    faFax, faFile, faFileCsv, faFileExcel, faFileExport, faFileImport, faFileInvoiceDollar, faFilePdf,
    faFileWaveform, faFilter, faFlag, faFolder, faGlobe, faGripVertical, faHandHoldingUsd, faHashtag, faHeadset, faHeart,
    faHexagonNodes, faHistory, faHome, faIdCard, faImage, faInbox, faInfoCircle, faKey,
    faLaptopMedical, faLayerGroup, faLightbulb, faLink, faList, faListAlt, faListOl, faLocationCrosshairs,
    faLocationDot, faLock, faMagnifyingGlassLocation, faMailBulk, faMapMarkedAlt, faMicrophone,
    faMinus, faMinusSquare, faMobileAlt, faMoneyBillWave, faPaperclip, faPaperPlane, faPen,
    faPencilAlt, faPhone, faPhotoFilm, faPlane, faPlay, faPlus, faPlusCircle, faPlusSquare,
    faPrint, faQrcode, faQuestion, faQuidditch, faRandom, faReceipt, faRedo, faReply, faRobot,
    faRocket, faSave, faScroll, faSearch, faServer, faShare, faShareAlt, faShieldAlt, faShoppingBag,
    faShoppingCart, faSignal, faSignInAlt, faSignOutAlt, faSignature, faSitemap, faSliders, faSort,
    faSpinner, faSquare, faStar, faStop, faStream, faSync, faTable, faTachometerAlt, faTag,
    faTags, faTasks, faTerminal, faTh, faThLarge, faTimes, faTimesCircle, faToggleOff,
    faToggleOn, faTrash, faUndo, faUniversity, faUnlock, faUpload, faUtensils, faUserEdit, faUserPlus,
    faUserShield, faUsers, faUsersCog, faWifi, faWindowRestore, faCircle as fasCircle,
    faLaptopFile
} from '@fortawesome/free-solid-svg-icons';

// --- REGULAR (OUTLINE) ICONS ---
import {
    faBell as farBell,
    faBookmark as farBookmark,
    faCalendarAlt,
    faCaretSquareDown,
    faCheckSquare as farCheckSquare,
    faCircle as farCircle,
    faCircleUser,
    faClock,
    faCommentDots,
    faCreditCard as farCreditCard,
    faEnvelope,
    faEye,
    faEyeSlash,
    faFile as farFile,
    faFileArchive,
    faFileCode,
    faFileLines,
    faFlag as farFlag,
    faFolder as farFolder,
    faHeart as farHeart,
    faIdCard as farIdCard,
    faMessage,
    faMinusSquare as farMinusSquare, // <-- REGULAR OUTLINE MINUS SQUARE HERE
    faPlusSquare as farPlusSquare,
    faQuestionCircle,
    faSquare as farSquare,
    faStar as farStar,
    faThumbsUp,
    faUser,
    faCamera, faPaste
} from '@fortawesome/free-regular-svg-icons';

// --- BRAND ICONS ---
import {
    faFacebookF, faGithub, faGoogle, faInstagram, faLinkedin, faMicrosoft, faTwitter, faUncharted, faWhatsapp, faWpforms, faYoutube
} from '@fortawesome/free-brands-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { RxStompService } from './service/rx-stomp.service';
import { rxStompServiceFactory } from './service/rx-stomp-service-factory';

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
    constructor(faLibrary: FaIconLibrary) {

        // 1. Put all your imported icons into a single array
        const myIcons = [
            // --- SOLID ICONS ---
            faAddressBook, faAlignCenter, faAlignJustify, faAlignLeft, faAlignRight,
            faAngleDoubleLeft, faAngleDoubleRight, faAngleDown, faAngleLeft, faAngleRight, faAngleUp,
            faArrowDown, faArrowLeft, faArrowRight, faArrowUp, faAsterisk, faAward, faBan, faBars, faBed, faBell, faBolt,
            faBook, faBookmark, faBox, faBrain, faBriefcase, faBuilding, faBullhorn, faCalendar, faChartArea, faChartBar, faChartLine, faChartPie, faCheck,
            faCheckCircle, faCheckSquare, faChalkboardTeacher, faChevronLeft, faChevronRight, faCircleNodes, faCircleNotch,
            faCloud, faCloudDownloadAlt, faCloudUploadAlt, faCode, faCodeBranch, faCog, faCoins, faCompress,
            faCopy, faCouch, faCreditCard, faDatabase, faDiagramProject, faDownload, faEdit, faEllipsisH,
            faEllipsisV, faExclamationCircle, faExclamationTriangle, faExpand, faExternalLinkAlt,
            faFax, faFile, faFileCsv, faFileExcel, faFileExport, faFileImport, faFileInvoiceDollar, faFilePdf,
            faFileWaveform, faFilter, faFlag, faFolder, faGlobe, faGripVertical, faHandHoldingUsd, faHashtag, faHeadset, faHeart,
            faHexagonNodes, faHistory, faHome, faIdCard, faImage, faInbox, faInfoCircle, faKey,
            faLaptopMedical, faLayerGroup, faLightbulb, faLink, faList, faListAlt, faListOl, faLocationCrosshairs,
            faLocationDot, faLock, faMagnifyingGlassLocation, faMailBulk, faMapMarkedAlt, faMicrophone,
            faMinus, faMinusSquare, faMobileAlt, faMoneyBillWave, faPaperclip, faPaperPlane, faPen,
            faPencilAlt, faPhone, faPhotoFilm, faPlane, faPlay, faPlus, faPlusCircle, faPlusSquare,
            faPrint, faQrcode, faQuestion, faQuidditch, faRandom, faReceipt, faRedo, faReply, faRobot,
            faRocket, faSave, faScroll, faSearch, faServer, faShare, faShareAlt, faShieldAlt, faShoppingBag,
            faShoppingCart, faSignal, faSignInAlt, faSignOutAlt, faSignature, faSitemap, faSliders, faSort,
            faSpinner, faSquare, faStar, faStop, faStream, faSync, faTable, faTachometerAlt, faTag,
            faTags, faTasks, faTerminal, faTh, faThLarge, faTimes, faTimesCircle, faToggleOff,
            faToggleOn, faTrash, faUndo, faUniversity, faUnlock, faUpload, faUtensils, faUserEdit, faUserPlus,
            faUserShield, faUsers, faUsersCog, faWifi, faWindowRestore, fasCircle, faLaptopFile,

            // --- REGULAR ICONS ---
            farBell, farBookmark, faCalendarAlt, faCaretSquareDown, farCheckSquare, farCircle,
            faCircleUser, faClock, faCommentDots, farCreditCard, faEnvelope, faEye, faEyeSlash,
            farFile, faFileArchive, faFileCode, faFileLines, farFlag, farFolder, farHeart,
            farIdCard, faMessage, farMinusSquare, farPlusSquare, faQuestionCircle, farSquare,
            farStar, faThumbsUp, faUser, faCamera, faPaste,

            // --- BRAND ICONS ---
            faFacebookF, faGithub, faGoogle, faInstagram, faLinkedin, faMicrosoft, faTwitter, faUncharted, faWpforms, faWhatsapp, faYoutube
        ];

        // library.addIconPacks(fas);
        faLibrary.addIcons(...myIcons);

        library.add(...myIcons);
    }
}