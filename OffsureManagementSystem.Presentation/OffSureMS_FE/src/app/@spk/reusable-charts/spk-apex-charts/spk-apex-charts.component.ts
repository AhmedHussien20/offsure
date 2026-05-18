import { Component, Input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'spk-apex-charts',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './spk-apex-charts.component.html',
  styleUrl: './spk-apex-charts.component.scss'
})
export class SpkApexChartsComponent {
  @Input() chartOptions: any;  // Accept chart options as input

  constructor() { }

  ngOnInit(): void {
  }
}
