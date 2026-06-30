using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesRoleAndAttribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SalesId",
                table: "ServiceRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommissionType",
                table: "Projects",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionValue",
                table: "Projects",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SalesId",
                table: "Projects",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SalesId",
                table: "Clients",
                type: "int",
                nullable: true);

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "DeletedAt", "DeletedBy", "Description", "IsActive", "IsDeleted", "Name", "UpdatedAt", "UpdatedBy" },
                values: new object[] { 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, "Sales portal; browse team members, manage attributed clients, and view assigned projects.", true, false, "Sales", null, null });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_SalesId",
                table: "ServiceRequests",
                column: "SalesId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_SalesId",
                table: "Projects",
                column: "SalesId");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_SalesId",
                table: "Clients",
                column: "SalesId");

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Users_SalesId",
                table: "Clients",
                column: "SalesId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Users_SalesId",
                table: "Projects",
                column: "SalesId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceRequests_Users_SalesId",
                table: "ServiceRequests",
                column: "SalesId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Users_SalesId",
                table: "Clients");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Users_SalesId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceRequests_Users_SalesId",
                table: "ServiceRequests");

            migrationBuilder.DropIndex(
                name: "IX_ServiceRequests_SalesId",
                table: "ServiceRequests");

            migrationBuilder.DropIndex(
                name: "IX_Projects_SalesId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Clients_SalesId",
                table: "Clients");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DropColumn(
                name: "SalesId",
                table: "ServiceRequests");

            migrationBuilder.DropColumn(
                name: "CommissionType",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "CommissionValue",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "SalesId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "SalesId",
                table: "Clients");
        }
    }
}
