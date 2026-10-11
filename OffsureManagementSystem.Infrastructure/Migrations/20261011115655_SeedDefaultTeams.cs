using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OffsureManagementSystem.Infrastructure.Migrations
{
    /// <summary>
    /// One-time insert of the default offshore teams. Runs once per database, so admin edits
    /// and deletions afterwards are kept. Skips any name that already exists.
    /// </summary>
    public partial class SeedDefaultTeams : Migration
    {
        private static readonly (string Name, string Description)[] DefaultTeams =
        {
            ("Software Development", "Web, mobile and backend engineers who build and integrate business systems."),
            ("System Administration", "Keep servers, identities and end-user infrastructure healthy and patched."),
            ("NOC & Monitoring", "Round-the-clock monitoring, alert triage and first-line incident response."),
            ("Network & Security", "Design and protect the network edge, from switching to firewalls and SOC."),
            ("Cloud & DevOps", "Cloud platforms, CI/CD pipelines and container infrastructure."),
            ("Enterprise Applications", "Business platforms and ERP systems the client runs day to day."),
            ("Data & Database", "Database administration, reporting and business intelligence."),
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            for (var i = 0; i < DefaultTeams.Length; i++)
            {
                var (name, description) = DefaultTeams[i];
                migrationBuilder.Sql($@"
IF NOT EXISTS (SELECT 1 FROM [Teams] WHERE [Name] = N'{Escape(name)}' AND [IsDeleted] = 0)
    INSERT INTO [Teams] ([Name], [Description], [CoverImage], [DisplayOrder], [IsActive], [CreatedAt], [IsDeleted])
    VALUES (N'{Escape(name)}', N'{Escape(description)}', N'', {i + 1}, 1, SYSUTCDATETIME(), 0);");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (name, _) in DefaultTeams)
            {
                migrationBuilder.Sql($@"
UPDATE [TeamMembers] SET [TeamId] = NULL
WHERE [TeamId] IN (SELECT [Id] FROM [Teams] WHERE [Name] = N'{Escape(name)}');
DELETE FROM [Teams] WHERE [Name] = N'{Escape(name)}';");
            }
        }

        private static string Escape(string value) => value.Replace("'", "''");
    }
}
