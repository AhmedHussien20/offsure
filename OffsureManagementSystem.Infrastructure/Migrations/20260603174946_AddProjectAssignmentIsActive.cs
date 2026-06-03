using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAssignmentIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId",
                table: "ProjectAssignments");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "ProjectAssignments",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId_IsActive",
                table: "ProjectAssignments",
                columns: new[] { "ProjectId", "TeamMemberId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId_IsActive",
                table: "ProjectAssignments");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "ProjectAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId",
                table: "ProjectAssignments",
                columns: new[] { "ProjectId", "TeamMemberId" },
                unique: true);
        }
    }
}
