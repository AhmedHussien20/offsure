import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavService } from '../../shared/services/nav.service';
import { MenuItem } from '../../shared/models/menu-item.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrls: ['./sidemenu.component.css']
})
export class SidemenuComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  menuitemsSubscribe$!: Subscription;

  constructor(private navService: NavService) {}

  ngOnInit() {
    this.menuitemsSubscribe$ = this.navService.getMenuItems().subscribe((items) => {
      this.menuItems = items;
    });
  }

  ngOnDestroy() {
    if (this.menuitemsSubscribe$) {
      this.menuitemsSubscribe$.unsubscribe();
    }
  }
}
