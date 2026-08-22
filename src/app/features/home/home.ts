import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild
} from '@angular/core';
import {AppButtonComponent} from '../../shared/app-button/app-button.component';
import {NzColDirective, NzRowDirective} from 'ng-zorro-antd/grid';
import {NzCardComponent} from 'ng-zorro-antd/card';
import {NzIconDirective} from 'ng-zorro-antd/icon';
import {NzTableModule} from 'ng-zorro-antd/table';

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
  imports: [AppButtonComponent, NzRowDirective, NzColDirective, NzCardComponent, NzIconDirective, NzTableModule],
  standalone: true,
})
export class HomeComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly barChartEl = viewChild.required<ElementRef<HTMLDivElement>>('barChartEl');
  readonly pieChartEl = viewChild.required<ElementRef<HTMLDivElement>>('pieChartEl');

  readonly recentVouchers = [
    {
      code: 'PCB245',
      description: 'Chi thanh toán tiền lương tháng 6',
      amount: '1.842.500.000',
      statusClass: 'success',
      statusLabel: 'Đã duyệt'
    },
    {
      code: 'PTB118',
      description: 'Thu phí, lệ phí nộp ngân sách',
      amount: '326.000.000',
      statusClass: 'success',
      statusLabel: 'Đã duyệt'
    },
    {
      code: 'PCB246',
      description: 'Chi mua sắm thiết bị văn phòng',
      amount: '94.200.000',
      statusClass: 'warning',
      statusLabel: 'Chờ duyệt'
    },
    {
      code: 'UNB977',
      description: 'Ủy nhiệm chi nộp bảo hiểm xã hội',
      amount: '248.700.000',
      statusClass: 'warning',
      statusLabel: 'Chờ duyệt'
    },
    {
      code: 'PCB247',
      description: 'Chi công tác phí quý II',
      amount: '37.500.000',
      statusClass: 'muted',
      statusLabel: 'Bản nháp'
    },
  ];

  readonly pendingTasks = [
    {icon: 'file-text', accent: 'brand', title: '12 chứng từ chờ duyệt', sub: 'Chờ kế toán trưởng phê duyệt'},
    {icon: 'bank', accent: 'info', title: '3 lệnh chi gửi kho bạc', sub: 'Đang chờ phản hồi từ kho bạc'},
    {icon: 'sync', accent: 'warning', title: 'Đối chiếu số dư tài khoản', sub: 'Hạn xử lý: 30/06/2026'},
    {icon: 'audit', accent: 'purple', title: 'Nộp báo cáo tài chính quý II', sub: 'Hạn nộp: 15/07/2026'},
  ];

  private barChart?: echarts.ECharts;
  private pieChart?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.initBarChart();
    this.initPieChart();

    this.resizeObserver = new ResizeObserver(() => {
      this.barChart?.resize();
      this.pieChart?.resize();
    });
    this.resizeObserver.observe(this.barChartEl().nativeElement);
    this.resizeObserver.observe(this.pieChartEl().nativeElement);

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.barChart?.dispose();
      this.pieChart?.dispose();
    });
  }

  private initBarChart(): void {
    const style = getComputedStyle(document.documentElement);
    const teal = style.getPropertyValue('--teal-500').trim() || '#0E9384';
    const brand = style.getPropertyValue('--brand-500').trim() || '#E8632A';
    const textSecondary = style.getPropertyValue('--text-secondary').trim() || '#5A6478';
    const borderSubtle = style.getPropertyValue('--border-subtle').trim() || '#E5E8F0';

    this.barChart = echarts.init(this.barChartEl().nativeElement);
    this.barChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: {type: 'shadow'},
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
        data: ['T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
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
          name: 'Thu',
          type: 'bar',
          barWidth: '20%',
          barGap: '20%',
          data: [5.2, 4.8, 6.1, 7.3, 8.5, 9.2],
          itemStyle: {color: teal, borderRadius: [4, 4, 0, 0]},
        },
        {
          name: 'Chi',
          type: 'bar',
          barWidth: '20%',
          data: [3.8, 3.2, 4.5, 5.1, 4.2, 3.9],
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

    this.pieChart = echarts.init(this.pieChartEl().nativeElement);
    this.pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {d}%',
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
            formatter: ['{title|Tổng chi}', '{value|36,7 tỷ}'].join('\n'),
            rich: {
              title: {color: textSecondary, fontSize: 12, lineHeight: 20},
              value: {color: textPrimary, fontSize: 20, fontWeight: 700, lineHeight: 28},
            },
          },
          labelLine: {show: false},
          data: [
            {value: 44, name: 'Chi thanh toán cá nhân', itemStyle: {color: brand}},
            {value: 27, name: 'Chi nghiệp vụ chuyên môn', itemStyle: {color: teal}},
            {value: 17, name: 'Chi mua sắm, sửa chữa', itemStyle: {color: purple}},
            {value: 12, name: 'Chi khác', itemStyle: {color: amber}},
          ],
        },
      ],
    });
  }
}

export default HomeComponent;
