using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectInvoiceDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectInvoiceDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectInvoiceId = table.Column<int>(type: "int", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<int>(type: "int", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectInvoiceDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectInvoiceDocuments_ProjectInvoices_ProjectInvoiceId",
                        column: x => x.ProjectInvoiceId,
                        principalTable: "ProjectInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectInvoiceDocuments_ProjectInvoiceId_DisplayOrder",
                table: "ProjectInvoiceDocuments",
                columns: new[] { "ProjectInvoiceId", "DisplayOrder" });

            // Backfill existing primary invoice files into the documents table.
            migrationBuilder.Sql("""
                INSERT INTO ProjectInvoiceDocuments
                    (ProjectInvoiceId, FileName, FileUrl, DisplayOrder, CreatedAt, IsDeleted)
                SELECT
                    i.Id,
                    i.InvoiceFileName,
                    i.InvoiceFileUrl,
                    1,
                    i.CreatedAt,
                    0
                FROM ProjectInvoices i
                WHERE i.IsDeleted = 0
                  AND NULLIF(LTRIM(RTRIM(i.InvoiceFileUrl)), '') IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1
                      FROM ProjectInvoiceDocuments d
                      WHERE d.ProjectInvoiceId = i.Id AND d.IsDeleted = 0
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectInvoiceDocuments");
        }
    }
}
