using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAssignmentSkillId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId_IsActive",
                table: "ProjectAssignments");

            migrationBuilder.AddColumn<int>(
                name: "SkillId",
                table: "ProjectAssignments",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE pa
                SET
                    SkillId = TRY_CAST(SUBSTRING(pa.[Role], 8, CHARINDEX(']', pa.[Role]) - 8) AS int),
                    [Role] = LTRIM(SUBSTRING(pa.[Role], CHARINDEX(']', pa.[Role]) + 1, 4000))
                FROM ProjectAssignments pa
                WHERE pa.[Role] LIKE '[skill:[%]%'
                  AND CHARINDEX(']', pa.[Role]) > 7;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignments_SkillId",
                table: "ProjectAssignments",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId_SkillId_IsActive",
                table: "ProjectAssignments",
                columns: new[] { "ProjectId", "TeamMemberId", "SkillId", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectAssignments_Skills_SkillId",
                table: "ProjectAssignments",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectAssignments_Skills_SkillId",
                table: "ProjectAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ProjectAssignments_SkillId",
                table: "ProjectAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId_SkillId_IsActive",
                table: "ProjectAssignments");

            migrationBuilder.Sql(
                """
                UPDATE pa
                SET [Role] = CONCAT('[skill:', pa.SkillId, '] ', pa.[Role])
                FROM ProjectAssignments pa
                WHERE pa.SkillId IS NOT NULL
                  AND pa.[Role] NOT LIKE '[skill:[%]%';
                """);

            migrationBuilder.DropColumn(
                name: "SkillId",
                table: "ProjectAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectAssignments_ProjectId_TeamMemberId_IsActive",
                table: "ProjectAssignments",
                columns: new[] { "ProjectId", "TeamMemberId", "IsActive" });
        }
    }
}
