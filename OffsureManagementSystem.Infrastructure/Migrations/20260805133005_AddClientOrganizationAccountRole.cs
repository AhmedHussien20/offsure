using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClientOrganizationAccountRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AccountRole",
                table: "Clients",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "ParentClientId",
                table: "Clients",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_AccountRole",
                table: "Clients",
                column: "AccountRole");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_ParentClientId",
                table: "Clients",
                column: "ParentClientId");

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Clients_ParentClientId",
                table: "Clients",
                column: "ParentClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Clients_ParentClientId",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_Clients_AccountRole",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_Clients_ParentClientId",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "AccountRole",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "ParentClientId",
                table: "Clients");
        }
    }
}
