import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

function toArabicNumbers(input: string): string {
  const arabicNumbers = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return input.replace(/\d/g, d => arabicNumbers[+d]);
}

@Pipe({
  name: 'myDate',
  standalone: true,
  pure: false
})
export class MyDatePipe implements PipeTransform {

  constructor(private translate: TranslateService) {}

  transform(
    value: Date | string | number | null | undefined,
    format: string = 'd MMMM y',
    includeTime: boolean = false,
    delimiter: string = ' — '
  ): string {
    if (!value) return '';

    const lang = this.translate.currentLang || 'ar';

    let finalFormat = format;

    if (includeTime) {
      finalFormat = `${format} _ hh:mm:ss a`;
    }
    const date = new Date(value);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    const formatted = formatDate(localDate, finalFormat, lang);

    if (lang.startsWith('ar')) {
      return toArabicNumbers(formatted);
    }

    return formatted;
  }
}
