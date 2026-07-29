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
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "DeletedAt", "DeletedBy", "Email", "EmailVerificationExpiry", "EmailVerificationToken", "FirstName", "IsActive", "IsDeleted", "IsEmailVerified", "LastLoginAt", "LastName", "PasswordHash", "PasswordResetToken", "PasswordResetTokenExpiry", "RefreshToken", "RefreshTokenExpiry", "RoleId", "UpdatedAt", "UpdatedBy" },
                values: new object[] { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, "admin@admin.com", null, null, "Admin", true, false, true, null, "Admin", "$2a$12$LxgpMTV/ZoaEqx.4S9T7yupxxQZq4SsJ.O6vlOxghnTK3M4gU9.I.", null, null, null, null, 1, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1);
        }
    }
}
