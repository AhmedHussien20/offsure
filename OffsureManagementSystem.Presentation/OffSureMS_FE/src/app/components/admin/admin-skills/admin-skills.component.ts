import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SkillCategoryDto, SkillDto } from 'app/core/models/skills/skill.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { SkillCategoriesService } from 'app/core/services/skill-categories.service';
import { SkillsService } from 'app/core/services/skills.service';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import {
  ACTIVE_FILTER_OPTIONS,
  LIST_FILTER_LABELS,
} from 'app/core/constants/list-filter.constants';
import { buildPagedListQuery } from 'app/core/utils/list-query.util';
import { ADMIN_SKILL_CATEGORY_COLUMNS, ADMIN_SKILL_COLUMNS } from '../admin.constants';
import { AdminSkillCategoryCreateComponent } from './admin-skill-category-create.component';
import { AdminSkillCategoryDetailPanelComponent } from './admin-skill-category-detail-panel.component';
import { AdminSkillCreateComponent } from './admin-skill-create.component';
import { AdminSkillDetailPanelComponent } from './admin-skill-detail-panel.component';

@Component({
  selector: 'app-admin-skills',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    NgbNavModule,
    GenericTableComponent,
    AdminSkillCategoryDetailPanelComponent,
    AdminSkillDetailPanelComponent,
  ],
  templateUrl: './admin-skills.component.html',
})
export class AdminSkillsComponent implements OnInit {
  activeTab: 'categories' | 'skills' = 'categories';

  categoryColumns = ADMIN_SKILL_CATEGORY_COLUMNS;
  skillColumns = ADMIN_SKILL_COLUMNS;
  categories: Array<SkillCategoryDto & { activeLabel?: string }> = [];
  skills: Array<SkillDto & { activeLabel?: string; assignedCountLabel?: string }> = [];
  categoryOptions: { id: number; name: string }[] = [];

  catPage = 1;
  catEntries = 10;
  catTotal = 0;
  catTotalPages = 1;
  catSearch = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    filterTypes: { isActive: 'dropdown' },
  });

  skillPage = 1;
  skillEntries = 10;
  skillTotal = 0;
  skillTotalPages = 1;
  skillSearch = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    filterTypes: {
      skillCategoryId: 'dropdown',
      isActive: 'dropdown',
    },
  });

  catLabels = { ...LIST_FILTER_LABELS };
  skillLabels: Record<string, string> = { ...LIST_FILTER_LABELS };
  catDropdownOptions = { isActive: ACTIVE_FILTER_OPTIONS };
  skillDropdownOptions: Record<string, { id: number | boolean; name: string }[]> = {
    skillCategoryId: [],
    isActive: ACTIVE_FILTER_OPTIONS,
  };

  constructor(
    private skillCategoriesService: SkillCategoriesService,
    private skillsService: SkillsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadCategoryOptions();
    this.loadCategories();
    this.loadSkills();
  }

  onCatSearch = (): void => {
    this.catPage = 1;
    this.catSearch.pageIndex = 1;
    this.loadCategories();
  };

  onSkillSearch = (): void => {
    this.skillPage = 1;
    this.skillSearch.pageIndex = 1;
    this.loadSkills();
  };

  onCatPageChange(page: number): void {
    this.catPage = page;
    this.catSearch.pageIndex = page;
    this.loadCategories();
  }

  onCatEntriesChange(size: number): void {
    this.catEntries = size;
    this.catSearch.pageSize = size;
    this.catPage = 1;
    this.catSearch.pageIndex = 1;
    this.loadCategories();
  }

  onSkillPageChange(page: number): void {
    this.skillPage = page;
    this.skillSearch.pageIndex = page;
    this.loadSkills();
  }

  onSkillEntriesChange(size: number): void {
    this.skillEntries = size;
    this.skillSearch.pageSize = size;
    this.skillPage = 1;
    this.skillSearch.pageIndex = 1;
    this.loadSkills();
  }

  openCategoryForm(): void {
    const modalRef = this.modalService.open(AdminSkillCategoryCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadCategoryOptions();
        this.loadCategories();
      }
    });
  }

  openSkillForm(): void {
    this.loadCategoryOptions();
    const modalRef = this.modalService.open(AdminSkillCreateComponent, {
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.categoryOptions = this.categoryOptions;
    modalRef.closed.subscribe((created: boolean) => {
      if (created) {
        this.loadSkills();
        this.loadCategories();
      }
    });
  }

  onCategoryChanged(): void {
    this.loadCategoryOptions();
    this.loadCategories();
  }

  onSkillChanged(): void {
    this.loadSkills();
    this.loadCategories();
  }

  private loadCategoryOptions(): void {
    this.skillCategoriesService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe(res => {
      const list = res.data?.data ?? [];
      this.categoryOptions = list.map(c => ({ id: c.id, name: c.name }));
      this.skillDropdownOptions = {
        skillCategoryId: this.categoryOptions,
        isActive: ACTIVE_FILTER_OPTIONS,
      };
    });
  }

  private loadCategories(): void {
    this.skillCategoriesService
      .getAll({
        pageIndex: this.catSearch.pageIndex,
        pageSize: this.catSearch.pageSize,
        searchKey: this.catSearch.searchKey,
      } as any)
      .subscribe(res => {
        const paged = res.data;
        this.categories = (paged?.data ?? []).map(c => ({
          ...c,
          activeLabel: c.isActive ? 'Yes' : 'No',
        }));
        this.catTotal = paged?.totalCount ?? 0;
        this.catTotalPages = Math.max(1, Math.ceil(this.catTotal / this.catEntries));
      });
  }

  private loadSkills(): void {
    this.skillsService
      .getAll(buildPagedListQuery(this.skillSearch) as any)
      .subscribe(res => {
        const paged = res.data;
        this.skills = (paged?.data ?? []).map(s => ({
          ...s,
          activeLabel: s.isActive ? 'Yes' : 'No',
          assignedCountLabel: String(s.assignedTeamMembersCount ?? 0),
        }));
        this.skillTotal = paged?.totalCount ?? 0;
        this.skillTotalPages = Math.max(1, Math.ceil(this.skillTotal / this.skillEntries));
      });
  }
}
