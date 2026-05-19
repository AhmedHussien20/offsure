using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.SkillManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/skills")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class SkillsController : BaseController
    {
        private readonly ISkillManagementService _skillManagementService;

        public SkillsController(ISkillManagementService skillManagementService)
        {
            _skillManagementService = skillManagementService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResponse<SkillDto>>>> GetAll(
            [FromQuery] SkillRequest request)
        {
            var skills = await _skillManagementService.GetSkillsAsync(request);
            return Ok(ApiResponse<PagedResponse<SkillDto>>.Ok(skills));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<SkillDto>>> GetById(int id)
        {
            var skill = await _skillManagementService.GetSkillByIdAsync(id);
            return Ok(ApiResponse<SkillDto>.Ok(skill));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<SkillDto>>> Create(CreateSkillDto dto)
        {
            var skill = await _skillManagementService.CreateSkillAsync(dto);
            return CreatedAtAction(
                nameof(GetById),
                new { id = skill.Id },
                ApiResponse<SkillDto>.Ok(skill, "Skill created successfully."));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<SkillDto>>> Update(int id, UpdateSkillDto dto)
        {
            var skill = await _skillManagementService.UpdateSkillAsync(id, dto);
            return Ok(ApiResponse<SkillDto>.Ok(skill, "Skill updated successfully."));
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            await _skillManagementService.DeleteSkillAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Skill deleted successfully."));
        }
    }
}
