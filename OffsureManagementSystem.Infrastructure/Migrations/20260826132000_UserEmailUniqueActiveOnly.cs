using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UserEmailUniqueActiveOnly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Free emails held by already soft-deleted users so active accounts can reuse them.
            migrationBuilder.Sql("""
                UPDATE [Users]
                SET [Email] = LEFT([Email], CASE
                        WHEN 256 - LEN(CONCAT('.deleted.', [Id])) < 1 THEN 1
                        ELSE 256 - LEN(CONCAT('.deleted.', [Id]))
                    END) + CONCAT('.deleted.', [Id])
                WHERE [IsDeleted] = 1
                  AND [Email] NOT LIKE '%.deleted.%';
                """);

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }
    }
}
