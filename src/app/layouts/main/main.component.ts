import {ChangeDetectionStrategy, Component, OnInit, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {AccountService} from '../../core/auth/account.service';
import {SidebarComponent} from '../sidebar/sidebar.component';
import {HeaderComponent} from '../header/header.component';
import {LayoutService} from '../service/layout.service';
import FooterComponent from '../footer/footer.component';

@Component({
  selector: 'app-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent],
  standalone: true,
})
export class MainComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly layoutService = inject(LayoutService);

  protected readonly collapsed = this.layoutService.sidebarCollapsed;

  ngOnInit(): void {
    this.accountService.identity().subscribe();
  }
}

export default MainComponent;
