using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EditAdminEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: target email may already exist on Id=1 or another row.
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM [Users] WHERE [Id] = 1)
                   AND NOT EXISTS (
                        SELECT 1 FROM [Users]
                        WHERE [Email] = N'rbasilious@offshoretechx.net')
                BEGIN
                    UPDATE [Users]
                    SET [Email] = N'rbasilious@offshoretechx.net'
                    WHERE [Id] = 1;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM [Users] WHERE [Id] = 1 AND [Email] = N'rbasilious@offshoretechx.net')
                   AND NOT EXISTS (
                        SELECT 1 FROM [Users]
                        WHERE [Email] = N'admin@admin.com')
                BEGIN
                    UPDATE [Users]
                    SET [Email] = N'admin@admin.com'
                    WHERE [Id] = 1;
                END
                """);
        }
    }
}
