using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.LandingPageDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/landing-page")]
    [ApiController]
    public class LandingPageController : BaseController
    {
        private readonly ILandingPageContentService _landingPageContentService;

        public LandingPageController(ILandingPageContentService landingPageContentService)
        {
            _landingPageContentService = landingPageContentService;
        }

        /// <summary>Public landing page — visible sections only.</summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<LandingPageSectionDto>>>> GetPublic()
        {
            var sections = await _landingPageContentService.GetPublicSectionsAsync();
            return Ok(ApiResponse<IReadOnlyList<LandingPageSectionDto>>.Ok(sections));
        }

        /// <summary>Admin editor — all sections including hidden.</summary>
        [HttpGet("admin")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<LandingPageSectionDto>>>> GetAdmin()
        {
            var sections = await _landingPageContentService.GetAdminSectionsAsync();
            return Ok(ApiResponse<IReadOnlyList<LandingPageSectionDto>>.Ok(sections));
        }

        [HttpGet("{sectionKey}")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<LandingPageSectionDto>>> GetByKey(string sectionKey)
        {
            var section = await _landingPageContentService.GetByKeyAsync(sectionKey, publicOnly: true);
            return Ok(ApiResponse<LandingPageSectionDto>.Ok(section));
        }

        [HttpPut("{sectionKey}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<LandingPageSectionDto>>> UpdateSection(
            string sectionKey,
            [FromBody] UpdateLandingPageSectionDto dto)
        {
            var section = await _landingPageContentService.UpdateSectionAsync(
                sectionKey,
                dto,
                GetCurrentUserIdOrNull());
            return Ok(ApiResponse<LandingPageSectionDto>.Ok(section, "Landing section updated."));
        }

        [HttpPut("bulk")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<LandingPageSectionDto>>>> BulkUpdate(
            [FromBody] BulkUpdateLandingPageSectionsDto dto)
        {
            var sections = await _landingPageContentService.BulkUpdateAsync(dto, GetCurrentUserIdOrNull());
            return Ok(ApiResponse<IReadOnlyList<LandingPageSectionDto>>.Ok(sections, "Landing content saved."));
        }

        private int? GetCurrentUserIdOrNull()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }
    }
}
