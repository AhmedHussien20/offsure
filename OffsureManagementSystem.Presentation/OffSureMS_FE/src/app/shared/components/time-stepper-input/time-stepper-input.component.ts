import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type AmPm = 'AM' | 'PM';

interface Time12Parts {
  hour12: number;
  minute: number;
  period: AmPm;
}

@Component({
  selector: 'app-time-stepper-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './time-stepper-input.component.html',
  styleUrl: './time-stepper-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeStepperInputComponent),
      multi: true,
    },
  ],
})
export class TimeStepperInputComponent implements ControlValueAccessor, AfterViewInit {
  @Input() stepMinutes = 10;
  @ViewChild('timeInput') timeInput?: ElementRef<HTMLInputElement>;

  /** Stored value in 24-hour HH:mm for the API. */
  value = '09:00';
  period: AmPm = 'AM';
  disabled = false;

  isEditing = false;
  editText = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  get inputDisplay(): string {
    if (this.isEditing) {
      return this.editText;
    }
    const { hour12, minute } = this.from24h(this.value);
    return `${hour12}:${String(minute).padStart(2, '0')}`;
  }

  ngAfterViewInit(): void {
    this.syncInputDisplay();
  }

  writeValue(value: string | null): void {
    this.value = this.normalize24(value ?? '09:00');
    this.period = this.from24h(this.value).period;
    this.editText = '';
    this.isEditing = false;
    this.syncInputDisplay();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onFocus(): void {
    if (this.disabled) return;
    this.isEditing = true;
    const { hour12, minute } = this.from24h(this.value);
    this.editText = `${hour12}:${String(minute).padStart(2, '0')}`;
    const input = this.timeInput?.nativeElement;
    if (input) {
      input.value = this.editText;
    }
  }

  onInput(raw: string): void {
    if (this.disabled) return;

    const cleaned = raw.replace(/[^\d:]/g, '');
    const digits = cleaned.replace(/\D/g, '');

    if (digits.length === 0) {
      this.editText = '';
      this.onTouched();
      return;
    }

    if (!cleaned.includes(':')) {
      if (digits.length <= 2) {
        this.editText = digits;
      } else {
        const hour = digits.slice(0, digits.length - 2);
        const minute = digits.slice(-2);
        this.editText = `${hour}:${minute}`;
      }
      this.onTouched();
      return;
    }

    const [hourPart, minutePart = ''] = cleaned.split(':');
    const hour = hourPart.slice(0, 2);
    const minute = minutePart.slice(0, 2);
    this.editText = minutePart.length > 0 || cleaned.endsWith(':') ? `${hour}:${minute}` : hour;
    this.onTouched();
  }

  onBlur(): void {
    if (this.disabled) return;

    this.isEditing = false;
    const parsed = this.parse12hInput(this.editText, this.period);
    this.editText = '';

    if (parsed) {
      this.emit(parsed);
    }

    this.syncInputDisplay();
    this.onTouched();
  }

  setPeriod(next: AmPm): void {
    if (this.disabled || this.period === next) return;

    this.period = next;
    const source = this.isEditing ? this.editText : this.inputDisplay;
    const parsed = this.parse12hInput(source, next);
    if (parsed) {
      this.isEditing = false;
      this.editText = '';
      this.emit(parsed);
    }
  }

  stepUp(): void {
    if (this.disabled) return;
    this.emit(this.addMinutes24(this.value, this.stepMinutes));
  }

  stepDown(): void {
    if (this.disabled) return;
    this.emit(this.addMinutes24(this.value, -this.stepMinutes));
  }

  private emit(next24: string): void {
    this.value = next24;
    this.period = this.from24h(next24).period;
    this.onChange(next24);
    this.syncInputDisplay();
  }

  private syncInputDisplay(): void {
    if (this.isEditing) return;
    const input = this.timeInput?.nativeElement;
    if (input) {
      input.value = this.inputDisplay;
    }
  }

  private parse12hInput(text: string, period: AmPm): string | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return this.normalize24(this.value);
    }

    let hour12: number;
    let minute: number;

    if (trimmed.includes(':')) {
      const [hourPart, minutePart = '0'] = trimmed.split(':');
      hour12 = Number(hourPart);
      minute = Number(minutePart.padEnd(2, '0').slice(0, 2));
    } else {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length <= 2) {
        hour12 = Number(digits);
        minute = 0;
      } else {
        hour12 = Number(digits.slice(0, digits.length - 2));
        minute = Number(digits.slice(-2));
      }
    }

    if (!Number.isFinite(hour12) || !Number.isFinite(minute)) {
      return null;
    }

    if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) {
      return null;
    }

    return this.to24h(hour12, this.snapMinute(minute), period);
  }

  private normalize24(time: string): string {
    const minutes = this.toMinutes24(time);
    const step = Math.max(1, this.stepMinutes);
    const snapped = Math.round(minutes / step) * step;
    const clamped = Math.min(24 * 60 - step, Math.max(0, snapped));
    return this.fromMinutes24(clamped);
  }

  private snapMinute(minute: number): number {
    const step = Math.max(1, this.stepMinutes);
    return Math.min(59, Math.round(minute / step) * step);
  }

  private addMinutes24(time: string, delta: number): string {
    const step = Math.max(1, this.stepMinutes);
    const next = this.toMinutes24(time) + delta;
    const clamped = Math.min(24 * 60 - step, Math.max(0, next));
    return this.fromMinutes24(clamped);
  }

  private toMinutes24(time: string): number {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return 0;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  }

  private fromMinutes24(total: number): string {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private from24h(time24: string): Time12Parts {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
    const hours24 = match ? Number(match[1]) : 9;
    const minute = match ? Number(match[2]) : 0;
    const period: AmPm = hours24 >= 12 ? 'PM' : 'AM';
    let hour12 = hours24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute, period };
  }

  private to24h(hour12: number, minute: number, period: AmPm): string {
    let hours24: number;
    if (period === 'AM') {
      hours24 = hour12 === 12 ? 0 : hour12;
    } else {
      hours24 = hour12 === 12 ? 12 : hour12 + 12;
    }
    return `${String(hours24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}
