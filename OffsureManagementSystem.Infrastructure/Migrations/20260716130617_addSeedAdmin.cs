using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class addSeedAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: DB may already have user Id=1 from manual seed or a partial prior apply.
            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [Id] = 1)
                BEGIN
                    SET IDENTITY_INSERT [Users] ON;
                    INSERT INTO [Users] (
                        [Id], [CreatedAt], [CreatedBy], [DeletedAt], [DeletedBy], [Email],
                        [EmailVerificationExpiry], [EmailVerificationToken], [FirstName], [IsActive],
                        [IsDeleted], [IsEmailVerified], [LastLoginAt], [LastName], [PasswordHash],
                        [PasswordResetToken], [PasswordResetTokenExpiry], [RefreshToken],
                        [RefreshTokenExpiry], [RoleId], [UpdatedAt], [UpdatedBy])
                    VALUES (
                        1, '2026-01-01T00:00:00.0000000Z', NULL, NULL, NULL, N'admin@admin.com',
                        NULL, NULL, N'Admin', CAST(1 AS bit),
                        CAST(0 AS bit), CAST(1 AS bit), NULL, N'Admin',
                        N'$2a$12$LxgpMTV/ZoaEqx.4S9T7yupxxQZq4SsJ.O6vlOxghnTK3M4gU9.I.',
                        NULL, NULL, NULL, NULL, 1, NULL, NULL);
                    SET IDENTITY_INSERT [Users] OFF;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM [Users]
                WHERE [Id] = 1 AND [Email] IN (N'admin@admin.com', N'rbasilious@offshoretechx.net');
                """);
        }
    }
}
