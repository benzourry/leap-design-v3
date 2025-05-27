import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { domainBase } from '../../_shared/constant.service';

@Component({
  selector: 'app-console',
  imports: [RouterOutlet, NgClass, FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './console.component.html',
  styleUrl: './console.component.scss'
})
export class ConsoleComponent {

  bgClassName: string = domainBase.replace(/\./g,'-');

}
