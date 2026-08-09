using OffshoreManagementSystem.Domain.BaseEntity;

namespace OffsureManagementSystem.Domain.Entities
{
    /// <summary>
    /// One row per landing-page section. Editable marketing copy lives in <see cref="ContentJson"/>.
    /// Dynamic modules (services, portfolio, team) keep their data in their own tables.
    /// </summary>
    public class LandingPageSection : BaseEntity
    {
        /// <summary>Stable key used by API and FE (e.g. hero, stats, services).</summary>
        public string SectionKey { get; set; } = string.Empty;

        /// <summary>Admin UI label (e.g. "Hero section").</summary>
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>Short admin description of what this section controls.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>Section payload as JSON (typed/validated in the application layer).</summary>
        public string ContentJson { get; set; } = "{}";

        /// <summary>When false, public landing omits this section.</summary>
        public bool IsVisible { get; set; } = true;

        /// <summary>
        /// True when list items come from another module (Services, Portfolio, Team).
        /// ContentJson then holds titles/subtitles only.
        /// </summary>
        public bool IsDynamic { get; set; }

        public int SortOrder { get; set; }
    }
}
