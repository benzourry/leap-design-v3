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

// // /* IA UNIMAS */
export const baseApi = 'https://io.aa.unimas.my/api';   // prefer
export const base = 'https://io.aa.unimas.my'; // prefer
export const cognaBase = 'https://io.aa.unimas.my'; // prefer
export const domainRegex = /(?:http[s]*\:\/\/)*(.*?)\.(?=[^\/]*\.)?aa\.unimas\.my/; //to read the path from url
export const domainBase = "aa.unimas.my"; // compare url with this to know should it load by path or domain
export const OAUTH = {
    AUTH_URI: "https://io.aa.unimas.my/oauth2/authorize",
    LOGOUT_URI: "https://io.aa.unimas.my/logout",
    USER_URI: "https://io.aa.unimas.my/user/me",
    USER_URI_DEBUG: "https://io.aa.unimas.my/user/debug-me", 
    CALLBACK: full + "/#/", // + "/assets/o-callback.html",
    FINAL_URI: full + "/#/",
    TOKEN_GET: "https://io.aa.unimas.my/token/get",
    PRIVACY_POLICY: "https://1drv.ms/b/s!AotEjBTyvtX0guMI71FGGK2CC0siIw?e=E0o5H5",
    SIGNIN_OPT: ['unimas','unimasid'],
    COGNA_VECTOR_DB:["chromadb","milvus","inmemory"]
}

export const myRxStompConfig: RxStompConfig = {
    brokerURL: 'wss://rekapi.unimas.my/ping/ws',
    heartbeatIncoming: 0, // Typical value 0 - disabled
    heartbeatOutgoing: 20000, // Typical value 20000 - every 20 seconds
    reconnectDelay: 200,
};