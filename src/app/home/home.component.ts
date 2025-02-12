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

import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { Router } from '@angular/router';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [RouterOutlet]
})
export class HomeComponent implements OnInit {
// private router: Router
  constructor() { }

  helpLink = "https://unimas-my.sharepoint.com/:w:/g/personal/blmrazif_unimas_my/EcX9YxrT4o5NtXnyF-j2dQgBR0rw7rgL8ab7sw3i9SgdyA?e=msJJtB";

  ngOnInit() {
    localStorage.removeItem("redirect");
  }

}
