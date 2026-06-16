using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPortfolioProjectImageIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "PortfolioProjectImages",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "PortfolioProjectImages");
        }
    }
}
