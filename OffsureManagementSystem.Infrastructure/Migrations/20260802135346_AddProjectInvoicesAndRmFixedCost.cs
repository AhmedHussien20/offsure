using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectInvoicesAndRmFixedCost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FixedCostAmount",
                table: "ProjectResourceManagers",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProjectInvoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    MilestoneId = table.Column<int>(type: "int", nullable: true),
                    BillingYear = table.Column<int>(type: "int", nullable: true),
                    BillingMonth = table.Column<int>(type: "int", nullable: true),
                    InvoiceFileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    InvoiceFileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PurchaseOrderFileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: true),
                    PurchaseOrderFileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PaymentStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
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
                    table.PrimaryKey("PK_ProjectInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectInvoices_ProjectMilestones_MilestoneId",
                        column: x => x.MilestoneId,
                        principalTable: "ProjectMilestones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProjectInvoices_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectInvoices_MilestoneId",
                table: "ProjectInvoices",
                column: "MilestoneId",
                unique: true,
                filter: "[MilestoneId] IS NOT NULL AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectInvoices_ProjectId",
                table: "ProjectInvoices",
                column: "ProjectId",
                unique: true,
                filter: "[MilestoneId] IS NULL AND [BillingYear] IS NULL AND [BillingMonth] IS NULL AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectInvoices_ProjectId_BillingYear_BillingMonth",
                table: "ProjectInvoices",
                columns: new[] { "ProjectId", "BillingYear", "BillingMonth" },
                unique: true,
                filter: "[BillingYear] IS NOT NULL AND [BillingMonth] IS NOT NULL AND [IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectInvoices");

            migrationBuilder.DropColumn(
                name: "FixedCostAmount",
                table: "ProjectResourceManagers");
        }
    }
}
