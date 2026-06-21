using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddResourceManagerRoleAndTeamMemberResourceManagerId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeamMembers_TeamMembers_LeaderId",
                table: "TeamMembers");

            migrationBuilder.RenameColumn(
                name: "LeaderId",
                table: "TeamMembers",
                newName: "ResourceManagerId");

            migrationBuilder.RenameIndex(
                name: "IX_TeamMembers_LeaderId",
                table: "TeamMembers",
                newName: "IX_TeamMembers_ResourceManagerId");

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "DeletedAt", "DeletedBy", "Description", "IsActive", "IsDeleted", "Name", "UpdatedAt", "UpdatedBy" },
                values: new object[] { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, "Manages assigned team members, skills, allocations, and project delivery without financial access.", true, false, "ResourceManager", null, null });

            migrationBuilder.AddForeignKey(
                name: "FK_TeamMembers_Users_ResourceManagerId",
                table: "TeamMembers",
                column: "ResourceManagerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeamMembers_Users_ResourceManagerId",
                table: "TeamMembers");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.RenameColumn(
                name: "ResourceManagerId",
                table: "TeamMembers",
                newName: "LeaderId");

            migrationBuilder.RenameIndex(
                name: "IX_TeamMembers_ResourceManagerId",
                table: "TeamMembers",
                newName: "IX_TeamMembers_LeaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_TeamMembers_TeamMembers_LeaderId",
                table: "TeamMembers",
                column: "LeaderId",
                principalTable: "TeamMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
