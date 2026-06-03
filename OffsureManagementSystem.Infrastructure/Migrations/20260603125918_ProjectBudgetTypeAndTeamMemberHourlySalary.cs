using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProjectBudgetTypeAndTeamMemberHourlySalary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "HourlySalary",
                table: "TeamMembers",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BudgetType",
                table: "Projects",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Total");

            migrationBuilder.AddColumn<int>(
                name: "ExpectedHours",
                table: "Projects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HourlyRate",
                table: "Projects",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HourlySalary",
                table: "TeamMembers");

            migrationBuilder.DropColumn(
                name: "BudgetType",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ExpectedHours",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "HourlyRate",
                table: "Projects");
        }
    }
}
