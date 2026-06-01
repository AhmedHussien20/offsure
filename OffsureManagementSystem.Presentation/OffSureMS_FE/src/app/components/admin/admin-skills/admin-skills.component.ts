import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormFieldConfig } from 'app/core/models/form-field-config';
import { SkillCategoryDto, SkillDto } from 'app/core/models/skills/skill.models';
import { SearchCriteria } from 'app/core/models/search-criteria.model';
import { SkillCategoriesService } from 'app/core/services/skill-categories.service';
import { SkillsService } from 'app/core/services/skills.service';
import { GenericFormComponent } from 'app/shared/components/generic-form/generic-form.component';
import { GenericTableComponent } from 'app/shared/components/generic-table/generic-table.component';
import { SharedModule } from 'app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { ADMIN_SKILL_CATEGORY_COLUMNS, ADMIN_SKILL_COLUMNS } from '../admin.constants';

@Component({
  selector: 'app-admin-skills',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    NgbNavModule,
    ReactiveFormsModule,
    GenericTableComponent,
    GenericFormComponent,
  ],
  templateUrl: './admin-skills.component.html',
})
export class AdminSkillsComponent implements OnInit {
  @ViewChild('categoryActions', { static: true }) categoryActions!: TemplateRef<unknown>;
  @ViewChild('skillActions', { static: true }) skillActions!: TemplateRef<unknown>;

  activeTab: 'categories' | 'skills' = 'categories';

  categoryColumns = ADMIN_SKILL_CATEGORY_COLUMNS;
  skillColumns = ADMIN_SKILL_COLUMNS;
  categories: Array<SkillCategoryDto & { activeLabel?: string }> = [];
  skills: Array<SkillDto & { activeLabel?: string; assignedCountLabel?: string }> = [];
  categoryOptions: { id: number; name: string }[] = [];

  showCategoryForm = false;
  showSkillForm = false;
  savingCategory = false;
  savingSkill = false;

  categoryForm!: FormGroup;
  skillForm!: FormGroup;
  categoryFormConfig: FormFieldConfig[] = [];
  skillFormConfig: FormFieldConfig[] = [];

  catPage = 1;
  catEntries = 10;
  catTotal = 0;
  catTotalPages = 1;
  catSearch = new SearchCriteria({ pageIndex: 1, pageSize: 10 });

  skillPage = 1;
  skillEntries = 10;
  skillTotal = 0;
  skillTotalPages = 1;
  skillSearch = new SearchCriteria({
    pageIndex: 1,
    pageSize: 10,
    filterTypes: { skillCategoryId: 'dropdown' },
  });

  skillLabels: Record<string, string> = {
    skillCategoryId: 'Category',
    searchKey: 'Search',
  };

  skillDropdownOptions: { skillCategoryId: { id: number; name: string }[] } = {
    skillCategoryId: [],
  };

  constructor(
    private skillCategoriesService: SkillCategoriesService,
    private skillsService: SkillsService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.buildForms();
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
    this.showCategoryForm = true;
    this.categoryForm.reset({ isActive: true });
  }

  openSkillForm(): void {
    this.loadCategoryOptions();
    this.updateSkillCategorySelect();
    this.showSkillForm = true;
    this.skillForm.reset({ skillCategoryId: null, isActive: true });
  }

  cancelCategoryForm(): void {
    this.showCategoryForm = false;
  }

  cancelSkillForm(): void {
    this.showSkillForm = false;
  }

  submitCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const raw = this.categoryForm.getRawValue();
    this.savingCategory = true;
    this.skillCategoriesService
      .create({
        name: String(raw.name).trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        isActive: !!raw.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Skill category created.');
          this.showCategoryForm = false;
          this.loadCategoryOptions();
          this.loadCategories();
          this.savingCategory = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create category.');
          this.savingCategory = false;
        },
      });
  }

  toggleCategoryActive(category: SkillCategoryDto): void {
    this.skillCategoriesService
      .update(category.id, {
        name: category.name,
        description: category.description,
        isActive: !category.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success(category.isActive ? 'Category deactivated.' : 'Category activated.');
          this.loadCategoryOptions();
          this.loadCategories();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update category.');
        },
      });
  }

  toggleSkillActive(skill: SkillDto): void {
    this.skillsService
      .update(skill.id, {
        name: skill.name,
        description: skill.description,
        skillCategoryId: skill.skillCategoryId,
        isActive: !skill.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success(skill.isActive ? 'Skill deactivated.' : 'Skill activated.');
          this.loadSkills();
          this.loadCategories();
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to update skill.');
        },
      });
  }

  submitSkill(): void {
    if (this.skillForm.invalid) {
      this.skillForm.markAllAsTouched();
      return;
    }

    const raw = this.skillForm.getRawValue();
    this.savingSkill = true;
    this.skillsService
      .create({
        name: String(raw.name).trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        skillCategoryId: Number(raw.skillCategoryId),
        isActive: !!raw.isActive,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Skill created.');
          this.showSkillForm = false;
          this.loadSkills();
          this.loadCategories();
          this.savingSkill = false;
        },
        error: err => {
          this.toastr.error(err?.error?.message || 'Failed to create skill.');
          this.savingSkill = false;
        },
      });
  }

  private buildForms(): void {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
    });

    this.skillForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      skillCategoryId: [null, Validators.required],
      isActive: [true],
    });

    this.categoryFormConfig = [
      { type: 'input', inputType: 'text', name: 'name', label: 'Category Name', validations: { required: true } },
      { type: 'textarea', name: 'description', label: 'Description' },
      { type: 'checkbox', name: 'isActive', label: 'Active' },
    ];

    this.skillFormConfig = [
      { type: 'input', inputType: 'text', name: 'name', label: 'Skill Name', validations: { required: true } },
      { type: 'textarea', name: 'description', label: 'Description' },
      {
        type: 'select',
        name: 'skillCategoryId',
        label: 'Category',
        selectType: 'simple',
        options: [],
        validations: { required: true },
      },
      { type: 'checkbox', name: 'isActive', label: 'Active' },
    ];
  }

  private updateSkillCategorySelect(): void {
    const options = this.categoryOptions.map(c => ({ label: c.name, value: c.id }));
    this.skillFormConfig = this.skillFormConfig.map(f =>
      f.name === 'skillCategoryId' ? { ...f, options } : f
    );
  }

  private loadCategoryOptions(): void {
    this.skillCategoriesService.getAll({ pageIndex: 1, pageSize: 500 } as any).subscribe(res => {
      const list = res.data?.data ?? [];
      this.categoryOptions = list.map(c => ({ id: c.id, name: c.name }));
      this.skillDropdownOptions = {
        skillCategoryId: this.categoryOptions,
      };
      this.updateSkillCategorySelect();
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
    const categoryId = this.skillSearch['skillCategoryId'];
    this.skillsService
      .getAll({
        pageIndex: this.skillSearch.pageIndex,
        pageSize: this.skillSearch.pageSize,
        searchKey: this.skillSearch.searchKey,
        skillCategoryId: categoryId ? Number(categoryId) : undefined,
      } as any)
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
