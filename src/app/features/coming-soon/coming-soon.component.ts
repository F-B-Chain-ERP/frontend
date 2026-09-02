import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:55vh;background:var(--surface-card);border-radius:12px;margin:16px;padding:32px;text-align:center;border:1px solid var(--border-subtle);">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--success-soft);display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:22px;">🚧</div>
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:var(--text-primary);">Trang đang phát triển</h2>
      <p style="margin:0;color:var(--text-secondary);font-size:14px;">Chức năng đang phát triển — trang trắng placeholder.</p>
    </div>
  `,
})
export class ComingSoonComponent {}

export default ComingSoonComponent;
