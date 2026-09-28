import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { LayoutService } from '../core/services/layout.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  readonly esDesktop$: Observable<boolean>;

  constructor(layoutService: LayoutService) {
    this.esDesktop$ = layoutService.esDesktop$;
  }

}
