using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OffsureManagementSystem.Application.DTOs.PortfolioManagementDTOs;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Application.Responses;
using TaskMangment.Application.Common.Responses;

namespace OffsureManagementSystem.API.Controllers
{
    [Route("api/portfolios")]
    [ApiController]
    public class PortfoliosController : BaseController
    {
        private readonly IPortfolioManagementService _portfolioManagementService;

        public PortfoliosController(IPortfolioManagementService portfolioManagementService)
        {
            _portfolioManagementService = portfolioManagementService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<PagedResponse<PortfolioDto>>>> GetAllPortfolios(
            [FromQuery] PortfolioFilterRequest request)
        {
            var portfolios = await _portfolioManagementService.GetAllPortfoliosAsync(request);
            return Ok(ApiResponse<PagedResponse<PortfolioDto>>.Ok(portfolios));
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<PortfolioDto>>> GetPortfolioById(
            int id,
            [FromQuery] bool includeUnpublished = false)
        {
            var portfolio = await _portfolioManagementService.GetPortfolioByIdAsync(id, includeUnpublished);
            return Ok(ApiResponse<PortfolioDto>.Ok(portfolio));
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PortfolioDto>>> AddPortfolio(AddPortfolioDto dto)
        {
            var portfolio = await _portfolioManagementService.AddPortfolioAsync(dto);
            return CreatedAtAction(
                nameof(GetPortfolioById),
                new { id = portfolio.Id },
                ApiResponse<PortfolioDto>.Ok(portfolio, "Portfolio project created successfully."));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PortfolioDto>>> UpdatePortfolio(int id, UpdatePortfolioDto dto)
        {
            var portfolio = await _portfolioManagementService.UpdatePortfolioAsync(id, dto);
            return Ok(ApiResponse<PortfolioDto>.Ok(portfolio, "Portfolio project updated successfully."));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<object>>> DeletePortfolio(int id)
        {
            await _portfolioManagementService.DeletePortfolioAsync(id);
            return Ok(ApiResponse<object>.Ok(null!, "Portfolio project deleted successfully."));
        }

        [HttpPost("{id:int}/images")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PortfolioDto>>> UploadImage(
            int id,
            IFormFile file,
            [FromForm] string? imageAltText,
            [FromForm] int displayOrder = 0)
        {
            if (file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail("VALIDATION_ERROR"));

            await using var stream = file.OpenReadStream();
            var portfolio = await _portfolioManagementService.UploadImageAsync(
                id,
                stream,
                file.FileName,
                imageAltText,
                displayOrder);

            return Ok(ApiResponse<PortfolioDto>.Ok(portfolio, "Portfolio image uploaded successfully."));
        }

        [HttpPatch("{id:int}/service")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PortfolioDto>>> LinkToService(
            int id,
            LinkPortfolioToServiceDto dto)
        {
            var portfolio = await _portfolioManagementService.LinkToServiceAsync(id, dto.ServiceId);
            return Ok(ApiResponse<PortfolioDto>.Ok(portfolio, "Portfolio project linked to service successfully."));
        }

        [HttpPatch("{id:int}/images/{imageId:int}/active")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ApiResponse<PortfolioDto>>> SetImageActive(
            int id,
            int imageId,
            UpdatePortfolioImageDto dto)
        {
            var portfolio = await _portfolioManagementService.SetImageActiveAsync(id, imageId, dto.IsActive);
            return Ok(ApiResponse<PortfolioDto>.Ok(
                portfolio,
                dto.IsActive
                    ? "Portfolio image activated for the landing page."
                    : "Portfolio image hidden from the landing page."));
        }
    }
}
