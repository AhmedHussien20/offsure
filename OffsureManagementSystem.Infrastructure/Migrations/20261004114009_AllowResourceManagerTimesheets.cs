using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AllowResourceManagerTimesheets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_TeamMembers_TeamMemberId",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_ProjectId_TeamMemberId_WorkDate",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_TeamMemberId",
                table: "Timesheets");

            migrationBuilder.AlterColumn<int>(
                name: "TeamMemberId",
                table: "Timesheets",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_TeamMemberId",
                table: "Timesheets",
                column: "TeamMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_TeamMembers_TeamMemberId",
                table: "Timesheets",
                column: "TeamMemberId",
                principalTable: "TeamMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(
                name: "ResourceManagerUserId",
                table: "Timesheets",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_ProjectId_ResourceManagerUserId_WorkDate",
                table: "Timesheets",
                columns: new[] { "ProjectId", "ResourceManagerUserId", "WorkDate" },
                unique: true,
                filter: "[IsDeleted] = 0 AND [ResourceManagerUserId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_ProjectId_TeamMemberId_WorkDate",
                table: "Timesheets",
                columns: new[] { "ProjectId", "TeamMemberId", "WorkDate" },
                unique: true,
                filter: "[IsDeleted] = 0 AND [TeamMemberId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_ResourceManagerUserId",
                table: "Timesheets",
                column: "ResourceManagerUserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Timesheets_SingleOwner",
                table: "Timesheets",
                sql: "([TeamMemberId] IS NOT NULL AND [ResourceManagerUserId] IS NULL) OR ([TeamMemberId] IS NULL AND [ResourceManagerUserId] IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_Users_ResourceManagerUserId",
                table: "Timesheets",
                column: "ResourceManagerUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_Users_ResourceManagerUserId",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_ProjectId_ResourceManagerUserId_WorkDate",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_ProjectId_TeamMemberId_WorkDate",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_ResourceManagerUserId",
                table: "Timesheets");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Timesheets_SingleOwner",
                table: "Timesheets");

            migrationBuilder.DropColumn(
                name: "ResourceManagerUserId",
                table: "Timesheets");

            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_TeamMembers_TeamMemberId",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_TeamMemberId",
                table: "Timesheets");

            migrationBuilder.AlterColumn<int>(
                name: "TeamMemberId",
                table: "Timesheets",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_TeamMemberId",
                table: "Timesheets",
                column: "TeamMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_TeamMembers_TeamMemberId",
                table: "Timesheets",
                column: "TeamMemberId",
                principalTable: "TeamMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_ProjectId_TeamMemberId_WorkDate",
                table: "Timesheets",
                columns: new[] { "ProjectId", "TeamMemberId", "WorkDate" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }
    }
}
