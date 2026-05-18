import { Injectable } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MenuItem } from '../models/menu-item.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class NavService {
  constructor(private store: Store<{ nav: { menuItems: MenuItem[] } }>) {}

  getMenuItems(): Observable<MenuItem[]> {
    return this.store.pipe(
      select(state => state.nav?.menuItems || []),
      map(menuItems => {
        console.log(' Menu Items from Store:', menuItems);  
        return menuItems;
      })
    );
  }
  
  
}
