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

// /* LEAP */
export const baseApi = 'http://10.28.114.194:8882/api';   // prefer
export const base = 'http://10.28.114.194:8882'; // prefer
export const domainRegex = /(?:http[s]*\:\/\/)*(.*?)\.(?=[^\/]*\.)?leap\.my/;
export const domainBase = "ireka.my"; 
export const OAUTH = {
    AUTH_URI : "http://10.28.114.194:8882/oauth2/authorize",
    LOGOUT_URI : "http://10.28.114.194:8882/logout",
    USER_URI : "http://10.28.114.194:8882/user/me",
    USER_URI_DEBUG : "http://10.28.114.194:8882/user/debug-me",
    CALLBACK : full + "/#/" ,
    FINAL_URI: full + "/#/",
    USER_UNBOX: null,
    TOKEN_GET: "http://10.28.114.194:8882/token/get", 
    PRIVACY_POLICY: "https://1drv.ms/b/s!AotEjBTyvtX0gq4fk6h2gVRugYo8tQ?e=e2HSrz",
    SIGNIN_OPT:['unimas','unimasid','google','azuread','facebook','github','linkedin','twitter','local'],
    COGNA_VECTOR_DB:["chromadb","milvus","inmemory"]
}

export const myRxStompConfig: RxStompConfig = {
    brokerURL: 'wss://io.ireka.my/ping/ws',
    heartbeatIncoming: 0, // Typical value 0 - disabled
    heartbeatOutgoing: 20000, // Typical value 20000 - every 20 seconds
    reconnectDelay: 200,
};