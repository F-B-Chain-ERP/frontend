import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AppButtonComponent} from '../../shared/app-button/app-button.component';
import {NzColDirective, NzRowDirective} from 'ng-zorro-antd/grid';
import {NzCardComponent} from 'ng-zorro-antd/card';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {NzTableModule} from 'ng-zorro-antd/table';

import {AppBreadcrumbsComponent} from '../../shared/app-breadcrumbs/app-breadcrumbs.component';

import * as echarts from 'echarts/core';
import {BarChart, PieChart} from 'echarts/charts';
import {GridComponent, LegendComponent, TooltipComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';

echarts.use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
  imports: [RouterLink, AppButtonComponent, NzRowDirective, NzColDirective, NzCardComponent, NzIconDirective, NzTableModule, AppBreadcrumbsComponent],
  standalone: true,
})
export class HomeComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly barChartEl = viewChild.required<ElementRef<HTMLDivElement>>('barChartEl');
  readonly pieChartEl = viewChild.required<ElementRef<HTMLDivElement>>('pieChartEl');

  readonly recentVouchers = [
    {
      code: 'PO-2026-0089',
      description: 'Nhập 500kg Trà Oolong & Trà Đen Ceylon từ NCC Hoàng Trà',
      amount: '42.500.000 ₫',
      statusClass: 'success',
      statusLabel: 'Đã nhập kho'
    },
    {
      code: 'PO-2026-0091',
      description: 'Nhập 200 thùng Sữa tươi thanh trùng từ Đà Lạt Milk',
      amount: '38.200.000 ₫',
      statusClass: 'warning',
      statusLabel: 'Chờ duyệt'
    },
    {
      code: 'SC-KD-0224',
      description: 'Kiểm kê ca sáng Chi nhánh Hà Đông - Đạt chuẩn định mức',
      amount: 'Khớp 99.8%',
      statusClass: 'success',
      statusLabel: 'Đã chốt ca'
    },
    {
      code: 'PO-2026-0092',
      description: 'Nhập 10.000 Vỏ ly giấy & Ống hút sinh học ECO Green',
      amount: '18.400.000 ₫',
      statusClass: 'warning',
      statusLabel: 'Chờ duyệt'
    },
    {
      code: 'SC-CG-0224',
      description: 'Kiểm kê ca sáng Cầu Giấy - Lệch hao hụt 1.8kg trân châu',
      amount: '-180.000 ₫',
      statusClass: 'danger',
      statusLabel: 'Cần giải trình'
    },
  ];

  readonly pendingTasks = [
    {icon: 'alert', accent: 'danger', title: 'Cảnh báo 4 NVL dưới mức an toàn', sub: 'Trà Oolong, Bột sữa béo, Trân châu đen'},
    {icon: 'file-protect', accent: 'warning', title: '3 Đơn mua hàng (PO) chờ duyệt', sub: 'Tổng giá trị 128.500.000 ₫ từ NCC'},
    {icon: 'reconciliation', accent: 'brand', title: 'Chốt ca & Đối soát tiền mặt trưa', sub: '6/6 Chi nhánh đã nộp báo cáo ca'},
    {icon: 'experiment', accent: 'purple', title: 'Cập nhật định lượng món mới (BOM)', sub: 'Trà Sữa Dừa Nướng & Macchiato'},
  ];

  private barChart?: echarts.ECharts;
  private pieChart?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;
  private themeObserver?: MutationObserver;

  ngAfterViewInit(): void {
    this.initBarChart();
    this.initPieChart();

    this.resizeObserver = new ResizeObserver(() => {
      this.barChart?.resize();
      this.pieChart?.resize();
    });
    this.resizeObserver.observe(this.barChartEl().nativeElement);
    this.resizeObserver.observe(this.pieChartEl().nativeElement);

    this.themeObserver = new MutationObserver(() => this.refreshChartsTheme());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.themeObserver?.disconnect();
      this.barChart?.dispose();
      this.pieChart?.dispose();
    });
  }

  private refreshChartsTheme(): void {
    const style = getComputedStyle(document.documentElement);
    const textSecondary = style.getPropertyValue('--text-secondary').trim() || '#5A6478';
    const textPrimary = style.getPropertyValue('--text-primary').trim() || '#141925';
    const borderSubtle = style.getPropertyValue('--border-subtle').trim() || '#E5E8F0';
    const surfaceCard = style.getPropertyValue('--surface-card').trim() || '#ffffff';
    this.barChart?.setOption({
      tooltip: { backgroundColor: surfaceCard, borderColor: borderSubtle, textStyle: { color: textPrimary } },
      xAxis: { axisLabel: { color: textSecondary } },
      yAxis: { splitLine: { lineStyle: { color: borderSubtle } } },
    });
    this.pieChart?.setOption({
      tooltip: { backgroundColor: surfaceCard, borderColor: borderSubtle, textStyle: { color: textPrimary } },
      series: [{ label: { rich: { title: { color: textSecondary }, value: { color: textPrimary } } } }],
    });
  }

  private initBarChart(): void {
    const style = getComputedStyle(document.documentElement);
    const teal = style.getPropertyValue('--teal-500').trim() || '#0E9384';
    const brand = style.getPropertyValue('--brand-500').trim() || '#E8632A';
    const textSecondary = style.getPropertyValue('--text-secondary').trim() || '#5A6478';
    const textPrimary = style.getPropertyValue('--text-primary').trim() || '#141925';
    const borderSubtle = style.getPropertyValue('--border-subtle').trim() || '#E5E8F0';
    const surfaceCard = style.getPropertyValue('--surface-card').trim() || '#ffffff';

    this.barChart = echarts.init(this.barChartEl().nativeElement);
    this.barChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: {type: 'shadow'},
        backgroundColor: surfaceCard,
        borderColor: borderSubtle,
        textStyle: { color: textPrimary },
      },
      legend: {show: false},
      grid: {
        left: 0,
        right: 0,
        bottom: 0,
        top: 8,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['Hà Đông', 'Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Hoàn Kiếm', 'Hoàng Mai'],
        axisLine: {show: false},
        axisTick: {show: false},
        axisLabel: {color: textSecondary, fontSize: 12},
      },
      yAxis: {
        type: 'value',
        show: false,
        splitLine: {lineStyle: {color: borderSubtle}},
      },
      series: [
        {
          name: 'Doanh thu (Trđ)',
          type: 'bar',
          barWidth: '22%',
          barGap: '25%',
          data: [12.8, 14.5, 11.2, 9.6, 16.2, 8.9],
          itemStyle: {color: teal, borderRadius: [4, 4, 0, 0]},
        },
        {
          name: 'Chi phí NVL (Trđ)',
          type: 'bar',
          barWidth: '22%',
          data: [3.7, 4.2, 3.3, 2.8, 4.6, 2.6],
          itemStyle: {color: brand, borderRadius: [4, 4, 0, 0]},
        },
      ],
    });
  }

  private initPieChart(): void {
    const style = getComputedStyle(document.documentElement);
    const brand = style.getPropertyValue('--brand-500').trim() || '#E8632A';
    const teal = style.getPropertyValue('--teal-500').trim() || '#0E9384';
    const purple = style.getPropertyValue('--purple-500').trim() || '#7C3AED';
    const amber = style.getPropertyValue('--amber-500').trim() || '#F5B70A';
    const textPrimary = style.getPropertyValue('--text-primary').trim() || '#141925';
    const textSecondary = style.getPropertyValue('--text-secondary').trim() || '#5A6478';
    const borderSubtle = style.getPropertyValue('--border-subtle').trim() || '#E5E8F0';
    const surfaceCard = style.getPropertyValue('--surface-card').trim() || '#ffffff';

    this.pieChart = echarts.init(this.pieChartEl().nativeElement);
    this.pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {d}%',
        backgroundColor: surfaceCard,
        borderColor: borderSubtle,
        textStyle: { color: textPrimary },
      },
      legend: {show: false},
      series: [
        {
          type: 'pie',
          radius: ['45%', '65%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: ['{title|Food Cost}', '{value|29.4%}'].join('\n'),
            rich: {
              title: {color: textSecondary, fontSize: 12, lineHeight: 20},
              value: {color: textPrimary, fontSize: 20, fontWeight: 700, lineHeight: 28},
            },
          },
          labelLine: {show: false},
          data: [
            {value: 38, name: 'Cốt trà & Cà phê', itemStyle: {color: teal}},
            {value: 28, name: 'Sữa tươi & Bột béo', itemStyle: {color: brand}},
            {value: 20, name: 'Topping & Siro', itemStyle: {color: purple}},
            {value: 14, name: 'Ly, Nắp & Bao bì', itemStyle: {color: amber}},
          ],
        },
      ],
    });
  }
}

export default HomeComponent;
