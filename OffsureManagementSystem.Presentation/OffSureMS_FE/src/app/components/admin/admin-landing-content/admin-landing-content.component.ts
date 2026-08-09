import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LandingPageSectionDto } from 'app/core/models/landing/landing-page.models';
import { LandingPageService } from 'app/core/services/landing-page.service';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';

interface EditableSection {
  sectionKey: string;
  displayName: string;
  description: string;
  isDynamic: boolean;
  isVisible: boolean;
  sortOrder: number;
  content: Record<string, unknown>;
  expanded: boolean;
  dirty: boolean;
}

@Component({
  selector: 'app-admin-landing-content',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './admin-landing-content.component.html',
  styleUrl: './admin-landing-content.component.scss',
})
export class AdminLandingContentComponent implements OnInit, OnDestroy {
  sections: EditableSection[] = [];
  loading = true;
  saving = false;
  loadError: string | null = null;
  /** Currently selected section in the side nav (page order). */
  selectedKey: string | null = 'home';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private landingPageService: LandingPageService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasDirty(): boolean {
    return this.sections.some(s => s.dirty);
  }

  get dirtyCount(): number {
    return this.sections.filter(s => s.dirty).length;
  }

  get activeSection(): EditableSection | null {
    return this.sections.find(s => s.sectionKey === this.selectedKey) ?? this.sections[0] ?? null;
  }

  private static readonly CmsKeys = new Set([
    'home',
    'stats',
    'about',
    'faq',
    'clients',
    'contact',
    'footer',
  ]);

  /** Landing-nav labels — prefer these over stale DB display names. */
  labelFor(sectionKey: string, fallback: string): string {
    switch (this.normalizeKey(sectionKey)) {
      case 'home':
        return 'Home';
      case 'stats':
        return 'Stats';
      case 'about':
        return 'About';
      case 'faq':
        return "Faq's";
      case 'clients':
        return 'Success Stories';
      case 'contact':
        return 'Contact';
      case 'footer':
        return 'Footer';
      default:
        return fallback;
    }
  }

  /** Short line under each nav item. */
  navHint(sectionKey: string): string {
    switch (this.normalizeKey(sectionKey)) {
      case 'home':
        return 'Top banner';
      case 'stats':
        return 'Numbers bar';
      case 'about':
        return 'Company story';
      case 'faq':
        return 'Q & A';
      case 'clients':
        return 'Story cards';
      case 'contact':
        return 'Form & details';
      case 'footer':
        return 'Bottom of page';
      default:
        return '';
    }
  }

  /** Clearer “where am I editing?” copy for the editor header. */
  whereOnPage(sectionKey: string): string {
    switch (this.normalizeKey(sectionKey)) {
      case 'home':
        return 'Appears first — platform name, headline, subtitle, and the two buttons.';
      case 'stats':
        return 'Bar under Home — labels for category / service / project counts.';
      case 'about':
        return 'About block — headers and story paragraphs (Who We Are, Mission, etc.).';
      case 'faq':
        return 'FAQ accordion — section titles plus each question and answer.';
      case 'clients':
        return 'Success Stories carousel — titles and story cards.';
      case 'contact':
        return 'Contact section — headings and email / phone / website.';
      case 'footer':
        return 'Page footer — about blurb, copyright, Capabilities, and social icons.';
      default:
        return '';
    }
  }

  descriptionFor(sectionKey: string, fallback: string): string {
    return this.whereOnPage(sectionKey) || fallback;
  }

  normalizeKey(sectionKey: string): string {
    const key = (sectionKey || '').trim().toLowerCase();
    if (key === 'hero') return 'home';
    return key;
  }

  iconFor(sectionKey: string): string {
    switch (this.normalizeKey(sectionKey)) {
      case 'home':
        return 'ti-home';
      case 'stats':
        return 'ti-chart-bar';
      case 'about':
        return 'ti-info-circle';
      case 'faq':
        return 'ti-help';
      case 'clients':
        return 'ti-briefcase';
      case 'contact':
        return 'ti-mail';
      case 'footer':
        return 'ti-layout-bottombar';
      default:
        return 'ti-file';
    }
  }

  selectSection(section: EditableSection): void {
    this.selectedKey = section.sectionKey;
  }

  isSelected(section: EditableSection): boolean {
    return this.activeSection?.sectionKey === section.sectionKey;
  }

  markDirty(section: EditableSection): void {
    section.dirty = true;
  }

  contentString(section: EditableSection, key: string): string {
    const value = section.content[key];
    return value == null ? '' : String(value);
  }

  contentNumber(section: EditableSection, key: string): number | null {
    const value = section.content[key];
    if (value == null || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  setContentString(section: EditableSection, key: string, value: string): void {
    section.content = { ...section.content, [key]: value };
    this.markDirty(section);
  }

  setContentNumber(section: EditableSection, key: string, value: string | number | null): void {
    if (value == null || value === '') {
      section.content = { ...section.content, [key]: null };
      this.markDirty(section);
      return;
    }
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    section.content = {
      ...section.content,
      [key]: Number.isFinite(n) ? n : null,
    };
    this.markDirty(section);
  }

  setVisible(section: EditableSection, visible: boolean): void {
    section.isVisible = visible;
    this.markDirty(section);
  }

  contentArray(section: EditableSection, key: string): Record<string, unknown>[] {
    const value = section.content[key];
    if (!Array.isArray(value)) {
      return [];
    }
    return value as Record<string, unknown>[];
  }

  arrayItemString(section: EditableSection, key: string, index: number, field: string): string {
    const item = this.contentArray(section, key)[index];
    if (!item) {
      return '';
    }
    const value = item[field];
    return value == null ? '' : String(value);
  }

  setArrayItemString(
    section: EditableSection,
    key: string,
    index: number,
    field: string,
    value: string
  ): void {
    const items = this.contentArray(section, key).map(item => ({ ...item }));
    if (!items[index]) {
      return;
    }
    items[index] = { ...items[index], [field]: value };
    section.content = { ...section.content, [key]: items };
    this.markDirty(section);
  }

  arrayItemBool(section: EditableSection, key: string, index: number, field: string): boolean {
    const item = this.contentArray(section, key)[index];
    if (!item) {
      return false;
    }
    return item[field] === true;
  }

  setArrayItemBool(
    section: EditableSection,
    key: string,
    index: number,
    field: string,
    value: boolean
  ): void {
    const items = this.contentArray(section, key).map(item => ({ ...item }));
    if (!items[index]) {
      return;
    }
    items[index] = { ...items[index], [field]: value };
    section.content = { ...section.content, [key]: items };
    this.markDirty(section);
  }

  addArrayItem(section: EditableSection, key: string, template: Record<string, unknown>): void {
    const items = [...this.contentArray(section, key), { ...template }];
    section.content = { ...section.content, [key]: items };
    this.markDirty(section);
  }

  removeArrayItem(section: EditableSection, key: string, index: number): void {
    const items = this.contentArray(section, key).filter((_, i) => i !== index);
    section.content = { ...section.content, [key]: items };
    this.markDirty(section);
  }

  preview(): void {
    window.open('/', '_blank', 'noopener');
  }

  saveAll(): void {
    if (!this.hasDirty || this.saving) {
      return;
    }

    this.saving = true;
    this.landingPageService
      .saveAll({
        sections: this.sections.map(s => ({
          sectionKey: s.sectionKey,
          isVisible: s.isVisible,
          content: s.content,
        })),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.applyResponse(res.data ?? []);
          this.saving = false;
          this.toastr.success('Landing content saved.');
        },
        error: err => {
          this.saving = false;
          this.toastr.error(err?.error?.message || 'Unable to save landing content.');
        },
      });
  }

  private load(): void {
    this.loading = true;
    this.loadError = null;
    this.landingPageService
      .getAdmin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.applyResponse(res.data ?? []);
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.loadError = err?.error?.message || 'Unable to load landing content.';
        },
      });
  }

  private applyResponse(rows: LandingPageSectionDto[]): void {
    const previousKey = this.selectedKey;
    this.sections = rows
      .slice()
      .map(row => {
        const sectionKey = this.normalizeKey(row.sectionKey);
        return {
          sectionKey,
          displayName: this.labelFor(sectionKey, row.displayName),
          description: this.descriptionFor(sectionKey, row.description),
          isDynamic: false,
          isVisible: row.isVisible,
          sortOrder: row.sortOrder,
          content: this.normalizeSectionContent(sectionKey, { ...(row.content ?? {}) }),
          expanded: false,
          dirty: false,
        };
      })
      .filter(section => AdminLandingContentComponent.CmsKeys.has(section.sectionKey))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const keep =
      previousKey && this.sections.some(s => s.sectionKey === previousKey)
        ? previousKey
        : this.sections[0]?.sectionKey ?? null;
    this.selectedKey = keep;
  }

  /** Prefer plain-text FAQ answers; strip leftover HTML from older saves. */
  private normalizeSectionContent(
    sectionKey: string,
    content: Record<string, unknown>
  ): Record<string, unknown> {
    if (sectionKey !== 'faq' || !Array.isArray(content['items'])) {
      return content;
    }

    return {
      ...content,
      items: (content['items'] as Record<string, unknown>[]).map(item => {
        const row = { ...(item ?? {}) };
        const plain = String(row['answer'] ?? '').trim();
        const html = String(row['answerHtml'] ?? '').trim();
        if (!plain && html) {
          row['answer'] = this.stripHtmlToPlain(html);
        }
        delete row['answerHtml'];
        return row;
      }),
    };
  }

  private stripHtmlToPlain(value: string): string {
    return value
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
