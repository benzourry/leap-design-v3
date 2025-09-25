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

import { RxStompConfig } from "@stomp/rx-stomp";

var full = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');

// /* KBORNEO */
export const baseApi = 'https://io.reka.jdn.gov.my/api';   // prefer
export const base = 'https://io.reka.jdn.gov.my'; // prefer
export const cognaBase = 'https://io.reka.jdn.gov.my'; // prefer
export const domainRegex = /(?:http[s]*\:\/\/)*(.*?)\.(?=[^\/]*\.)?reka\.jdn\.gov\.my/;
export const domainBase = "reka.jdn.gov.my"; 
export const OAUTH = {
        AUTH_URI : "https://io.reka.jdn.gov.my/oauth2/authorize",
        LOGOUT_URI : "https://io.reka.jdn.gov.my/logout",
        USER_URI : "https://io.reka.jdn.gov.my/user/me",
        USER_URI_DEBUG : "https://io.reka.jdn.gov.my/user/debug-me",
        CALLBACK : full + "/#/" ,
        FINAL_URI: full + "/#/",
        TOKEN_GET: "https://io.reka.jdn.gov.my/token/get",
        PRIVACY_POLICY: "https://1drv.ms/b/s!AotEjBTyvtX0gq4fj9Ry8MLD1iskng?e=9SZVb2",
        SIGNIN_OPT:['google','mydigitalid'],
        COGNA_VECTOR_DB:["chromadb","inmemory"]
}

export const myRxStompConfig: RxStompConfig = {
    // brokerURL: 'wss://io.alpha.moh.gov.my/ping/ws',
    brokerURL: 'wss://io.ireka.my/ping/ws',
    heartbeatIncoming: 0, // Typical value 0 - disabled
    heartbeatOutgoing: 20000, // Typical value 20000 - every 20 seconds
    reconnectDelay: 200,
};