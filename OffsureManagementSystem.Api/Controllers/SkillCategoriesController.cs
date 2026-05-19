using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.SkillManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/skill-categories")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class SkillCategoriesController : BaseController
    {
        private readonly ISkillManagementService _skillManagementService;

        public SkillCategoriesController(ISkillManagementService skillManagementService)
        {
            _skillManagementService = skillManagementService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResponse<SkillCategoryDto>>>> GetAll(
            [FromQuery] SkillCategoryRequest request)
        {
            var categories = await _skillManagementService.GetSkillCategoriesAsync(request);
            return Ok(ApiResponse<PagedResponse<SkillCategoryDto>>.Ok(categories));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<SkillCategoryDto>>> GetById(int id)
        {
            var category = await _skillManagementService.GetSkillCategoryByIdAsync(id);
            return Ok(ApiResponse<SkillCategoryDto>.Ok(category));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<SkillCategoryDto>>> Create(CreateSkillCategoryDto dto)
        {
            var category = await _skillManagementService.CreateSkillCategoryAsync(dto);
            return CreatedAtAction(
                nameof(GetById),
                new { id = category.Id },
                ApiResponse<SkillCategoryDto>.Ok(category, "Skill category created successfully."));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<SkillCategoryDto>>> Update(
            int id,
            UpdateSkillCategoryDto dto)
        {
            var category = await _skillManagementService.UpdateSkillCategoryAsync(id, dto);
            return Ok(ApiResponse<SkillCategoryDto>.Ok(category, "Skill category updated successfully."));
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            await _skillManagementService.DeleteSkillCategoryAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Skill category deleted successfully."));
        }
    }
}
