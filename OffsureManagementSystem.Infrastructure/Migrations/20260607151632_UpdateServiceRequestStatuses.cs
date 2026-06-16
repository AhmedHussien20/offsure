using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateServiceRequestStatuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Status is stored as nvarchar enum names (HasConversion<string>()).
            migrationBuilder.Sql(@"
UPDATE sr
SET sr.Status = N'AcceptedWithProject'
FROM ServiceRequests sr
INNER JOIN Projects p ON p.ServiceRequestId = sr.Id
WHERE sr.Status = N'InProgress';
");

            migrationBuilder.Sql(@"
UPDATE ServiceRequests
SET Status = N'PrimaryAccepted'
WHERE Status = N'InProgress';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE ServiceRequests
SET Status = N'InProgress'
WHERE Status IN (N'PrimaryAccepted', N'AcceptedWithProject');
");
        }
    }
}
