using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OffsureManagementSystem.Application.Common.Exceptions;
using OffsureManagementSystem.Application.DTOs.LandingPageDTOs;
using OffsureManagementSystem.Application.Interfaces.IRepository;
using OffsureManagementSystem.Application.Interfaces.Services;
using OffsureManagementSystem.Domain.Entities;

namespace OffsureManagementSystem.Infrastructure.Services
{
    public class LandingPageContentService : ILandingPageContentService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
        };

        /// <summary>Editable CMS sections only (static copy). Dynamic modules are excluded.</summary>
        private static readonly HashSet<string> KnownKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "home",
            "stats",
            "about",
            "faq",
            "clients",
            "contact",
            "footer",
        };

        /// <summary>
        /// Module-driven or unused sections — not managed in Landing CMS.
        /// Cards come from Services / Portfolio; Team was never on the landing page.
        /// </summary>
        private static readonly HashSet<string> RemovedCmsKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "team",
            "service-categories",
            "highlights",
            "services",
            "portfolio",
        };

        private static readonly IReadOnlyDictionary<string, string> LegacyKeyMap =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["hero"] = "home",
            };

        private readonly IRepository<LandingPageSection> _sectionRepo;

        public LandingPageContentService(IRepository<LandingPageSection> sectionRepo)
        {
            _sectionRepo = sectionRepo;
        }

        public async Task<IReadOnlyList<LandingPageSectionDto>> GetPublicSectionsAsync()
        {
            await EnsureSeededAsync();
            // Return all sections (including hidden) so the landing page can honor IsVisible toggles.
            var rows = await _sectionRepo
                .Query()
                .AsNoTracking()
                .Where(s => !s.IsDeleted)
                .OrderBy(s => s.SortOrder)
                .ThenBy(s => s.Id)
                .ToListAsync();

            return rows.Select(Map).ToList();
        }

        public async Task<IReadOnlyList<LandingPageSectionDto>> GetAdminSectionsAsync()
        {
            await EnsureSeededAsync();
            var rows = await _sectionRepo
                .Query()
                .AsNoTracking()
                .Where(s => !s.IsDeleted)
                .OrderBy(s => s.SortOrder)
                .ThenBy(s => s.Id)
                .ToListAsync();

            return rows.Select(Map).ToList();
        }

        public async Task<LandingPageSectionDto> GetByKeyAsync(string sectionKey, bool publicOnly)
        {
            await EnsureSeededAsync();
            var key = NormalizeKey(sectionKey);
            var row = await _sectionRepo
                .Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(s => !s.IsDeleted && s.SectionKey == key);

            if (row is null)
                throw new AppException("Landing section not found.", 404);

            if (publicOnly && !row.IsVisible)
                throw new AppException("Landing section not found.", 404);

            return Map(row);
        }

        public async Task<LandingPageSectionDto> UpdateSectionAsync(
            string sectionKey,
            UpdateLandingPageSectionDto dto,
            int? updatedBy)
        {
            await EnsureSeededAsync();
            var key = NormalizeKey(sectionKey);
            var row = await _sectionRepo
                .Query()
                .FirstOrDefaultAsync(s => !s.IsDeleted && s.SectionKey == key);

            if (row is null)
                throw new AppException("Landing section not found.", 404);

            ValidateContent(key, dto.Content);

            row.ContentJson = SerializeContent(dto.Content);
            row.IsVisible = dto.IsVisible;
            row.UpdatedAt = DateTime.UtcNow;
            row.UpdatedBy = updatedBy;

            _sectionRepo.SaveInclude(
                row,
                nameof(row.ContentJson),
                nameof(row.IsVisible),
                nameof(row.UpdatedAt),
                nameof(row.UpdatedBy));

            await _sectionRepo.SaveChangesAsync();
            return Map(row);
        }

        public async Task<IReadOnlyList<LandingPageSectionDto>> BulkUpdateAsync(
            BulkUpdateLandingPageSectionsDto dto,
            int? updatedBy)
        {
            if (dto.Sections is null || dto.Sections.Count == 0)
                throw new AppException("No sections provided.", 400);

            await EnsureSeededAsync();

            var keys = dto.Sections.Select(s => NormalizeKey(s.SectionKey)).Distinct().ToList();
            var rows = await _sectionRepo
                .Query()
                .Where(s => !s.IsDeleted && keys.Contains(s.SectionKey))
                .ToListAsync();

            var byKey = rows.ToDictionary(r => r.SectionKey, StringComparer.OrdinalIgnoreCase);

            foreach (var item in dto.Sections)
            {
                var key = NormalizeKey(item.SectionKey);
                if (!byKey.TryGetValue(key, out var row))
                    throw new AppException($"Landing section '{key}' not found.", 404);

                ValidateContent(key, item.Content);
                row.ContentJson = SerializeContent(item.Content);
                row.IsVisible = item.IsVisible;
                row.UpdatedAt = DateTime.UtcNow;
                row.UpdatedBy = updatedBy;

                _sectionRepo.SaveInclude(
                    row,
                    nameof(row.ContentJson),
                    nameof(row.IsVisible),
                    nameof(row.UpdatedAt),
                    nameof(row.UpdatedBy));
            }

            await _sectionRepo.SaveChangesAsync();
            return await GetAdminSectionsAsync();
        }

        private async Task EnsureSeededAsync()
        {
            var seeds = BuildSeedDefinitions().ToList();
            var seedsByKey = seeds.ToDictionary(s => s.Key, s => s, StringComparer.OrdinalIgnoreCase);
            var rows = await _sectionRepo.Query().Where(s => !s.IsDeleted).ToListAsync();
            var now = DateTime.UtcNow;
            var changed = false;

            // 0) Drop module-driven / unused CMS rows (Services, Portfolio/Highlights, Team, legacy keys).
            foreach (var row in rows.Where(r => RemovedCmsKeys.Contains(r.SectionKey)).ToList())
            {
                row.IsDeleted = true;
                row.DeletedAt = now;
                _sectionRepo.SaveInclude(row, nameof(row.IsDeleted), nameof(row.DeletedAt));
                rows.Remove(row);
                changed = true;
            }

            // 1) Rename legacy keys (hero → home).
            foreach (var row in rows.ToList())
            {
                if (!LegacyKeyMap.TryGetValue(row.SectionKey, out var newKey))
                    continue;

                var taken = rows.Any(s =>
                    !ReferenceEquals(s, row)
                    && string.Equals(s.SectionKey, newKey, StringComparison.OrdinalIgnoreCase));

                if (taken)
                {
                    row.IsDeleted = true;
                    row.DeletedAt = now;
                    _sectionRepo.SaveInclude(row, nameof(row.IsDeleted), nameof(row.DeletedAt));
                    rows.Remove(row);
                    changed = true;
                    continue;
                }

                row.SectionKey = newKey;
                row.UpdatedAt = now;
                _sectionRepo.SaveInclude(row, nameof(row.SectionKey), nameof(row.UpdatedAt));
                changed = true;
            }

            // 2) Always sync admin labels + fill missing content fields from seed (never wipe user edits).
            foreach (var row in rows)
            {
                if (!seedsByKey.TryGetValue(row.SectionKey, out var seed))
                    continue;

                var metaChanged = false;
                if (row.DisplayName != seed.DisplayName
                    || row.Description != seed.Description
                    || row.SortOrder != seed.SortOrder
                    || row.IsDynamic != seed.IsDynamic)
                {
                    row.DisplayName = seed.DisplayName;
                    row.Description = seed.Description;
                    row.SortOrder = seed.SortOrder;
                    row.IsDynamic = seed.IsDynamic;
                    metaChanged = true;
                }

                var contentChanged = TryMergeSeedContent(row.SectionKey, row.ContentJson, seed.ContentJson, out var mergedJson);
                if (contentChanged)
                    row.ContentJson = mergedJson;

                if (!metaChanged && !contentChanged)
                    continue;

                row.UpdatedAt = now;
                if (metaChanged && contentChanged)
                {
                    _sectionRepo.SaveInclude(
                        row,
                        nameof(row.DisplayName),
                        nameof(row.Description),
                        nameof(row.SortOrder),
                        nameof(row.IsDynamic),
                        nameof(row.ContentJson),
                        nameof(row.UpdatedAt));
                }
                else if (metaChanged)
                {
                    _sectionRepo.SaveInclude(
                        row,
                        nameof(row.DisplayName),
                        nameof(row.Description),
                        nameof(row.SortOrder),
                        nameof(row.IsDynamic),
                        nameof(row.UpdatedAt));
                }
                else
                {
                    _sectionRepo.SaveInclude(row, nameof(row.ContentJson), nameof(row.UpdatedAt));
                }

                changed = true;
            }

            // 3) Insert any missing sections.
            var existing = new HashSet<string>(rows.Select(r => r.SectionKey), StringComparer.OrdinalIgnoreCase);
            foreach (var seed in seeds)
            {
                if (existing.Contains(seed.Key))
                    continue;

                await _sectionRepo.AddAsync(new LandingPageSection
                {
                    SectionKey = seed.Key,
                    DisplayName = seed.DisplayName,
                    Description = seed.Description,
                    IsDynamic = seed.IsDynamic,
                    IsVisible = true,
                    SortOrder = seed.SortOrder,
                    ContentJson = seed.ContentJson,
                    CreatedAt = now,
                });
                changed = true;
            }

            if (changed)
                await _sectionRepo.SaveChangesAsync();
        }

        private static string NormalizeKey(string sectionKey)
        {
            var key = (sectionKey ?? string.Empty).Trim().ToLowerInvariant();
            if (LegacyKeyMap.TryGetValue(key, out var mapped))
                key = mapped;

            if (string.IsNullOrWhiteSpace(key) || !KnownKeys.Contains(key))
                throw new AppException("Invalid landing section key.", 400);
            return key;
        }

        /// <summary>
        /// Fills missing content keys (and empty arrays) from seed. Also upgrades known incomplete defaults
        /// so Home subtitle / FAQ answers match the public landing page without wiping custom edits.
        /// </summary>
        private static bool TryMergeSeedContent(
            string sectionKey,
            string? existingJson,
            string seedJson,
            out string mergedJson)
        {
            using var existingDoc = JsonDocument.Parse(string.IsNullOrWhiteSpace(existingJson) ? "{}" : existingJson);
            using var seedDoc = JsonDocument.Parse(seedJson);

            var map = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
            foreach (var prop in existingDoc.RootElement.EnumerateObject())
                map[prop.Name] = prop.Value.Clone();

            var changed = false;
            foreach (var prop in seedDoc.RootElement.EnumerateObject())
            {
                if (!map.TryGetValue(prop.Name, out var current))
                {
                    map[prop.Name] = prop.Value.Clone();
                    changed = true;
                    continue;
                }

                if (current.ValueKind == JsonValueKind.Array
                    && current.GetArrayLength() == 0
                    && prop.Value.ValueKind == JsonValueKind.Array
                    && prop.Value.GetArrayLength() > 0)
                {
                    map[prop.Name] = prop.Value.Clone();
                    changed = true;
                }
            }

            // Home: old subtitle omitted the "Explore service categories..." sentence shown on the landing page.
            if (string.Equals(sectionKey, "home", StringComparison.OrdinalIgnoreCase)
                && map.TryGetValue("subtitle", out var subtitleEl)
                && subtitleEl.ValueKind == JsonValueKind.String
                && seedDoc.RootElement.TryGetProperty("subtitle", out var seedSubtitle)
                && seedSubtitle.ValueKind == JsonValueKind.String)
            {
                var current = subtitleEl.GetString() ?? string.Empty;
                var seedSubtitleText = seedSubtitle.GetString() ?? string.Empty;
                const string legacyShort =
                    "Enterprise networking, security, and digital solutions — supported globally since 2018.";
                if (string.Equals(current.Trim(), legacyShort, StringComparison.Ordinal)
                    && !string.Equals(current.Trim(), seedSubtitleText.Trim(), StringComparison.Ordinal))
                {
                    map["subtitle"] = seedSubtitle.Clone();
                    changed = true;
                }
            }

            // About: upgrade the short headline that was missing "proven".
            if (string.Equals(sectionKey, "about", StringComparison.OrdinalIgnoreCase)
                && map.TryGetValue("subtitle", out var aboutSubtitleEl)
                && aboutSubtitleEl.ValueKind == JsonValueKind.String
                && seedDoc.RootElement.TryGetProperty("subtitle", out var seedAboutSubtitle)
                && seedAboutSubtitle.ValueKind == JsonValueKind.String)
            {
                var current = aboutSubtitleEl.GetString() ?? string.Empty;
                if (string.Equals(
                        current.Trim(),
                        "Remote networking expertise with global delivery.",
                        StringComparison.Ordinal))
                {
                    map["subtitle"] = seedAboutSubtitle.Clone();
                    changed = true;
                }
            }

            // FAQ: migrate answerHtml → plain answer text (clients edit plain text only).
            if (string.Equals(sectionKey, "faq", StringComparison.OrdinalIgnoreCase)
                && map.TryGetValue("items", out var itemsEl)
                && itemsEl.ValueKind == JsonValueKind.Array
                && seedDoc.RootElement.TryGetProperty("items", out var seedItems)
                && seedItems.ValueKind == JsonValueKind.Array)
            {
                var needsPlainMigration = itemsEl.EnumerateArray().Any(item =>
                    item.ValueKind == JsonValueKind.Object
                    && item.TryGetProperty("answerHtml", out _)
                    && (!item.TryGetProperty("answer", out var plain) || plain.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(plain.GetString())));

                var firstAnswer = string.Empty;
                if (itemsEl.GetArrayLength() > 0 && itemsEl[0].ValueKind == JsonValueKind.Object)
                {
                    if (itemsEl[0].TryGetProperty("answer", out var a) && a.ValueKind == JsonValueKind.String)
                        firstAnswer = a.GetString() ?? string.Empty;
                    else if (itemsEl[0].TryGetProperty("answerHtml", out var h) && h.ValueKind == JsonValueKind.String)
                        firstAnswer = h.GetString() ?? string.Empty;
                }

                if (needsPlainMigration
                    || (firstAnswer.Length > 0 && firstAnswer.Length < 220 && !firstAnswer.Contains("Mission:", StringComparison.Ordinal)))
                {
                    map["items"] = seedItems.Clone();
                    changed = true;
                }
            }

            if (!changed)
            {
                mergedJson = existingJson ?? "{}";
                return false;
            }

            var buffer = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, value) in map)
                buffer[key] = JsonSerializer.Deserialize<object>(value.GetRawText());

            mergedJson = JsonSerializer.Serialize(buffer, JsonOptions);
            return true;
        }

        private static void ValidateContent(string sectionKey, JsonElement content)
        {
            if (content.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
                throw new AppException("Section content is required.", 400);

            if (content.ValueKind != JsonValueKind.Object)
                throw new AppException("Section content must be a JSON object.", 400);

            // Round-trip ensures well-formed JSON and rejects oversized nonsense via serialize.
            _ = SerializeContent(content);

            // Light required-field checks per section.
            switch (sectionKey)
            {
                case "home":
                    RequireString(content, "platformName");
                    RequireString(content, "tagline");
                    break;
                case "contact":
                    RequireString(content, "email");
                    break;
            }
        }

        private static void RequireString(JsonElement content, string property)
        {
            if (!content.TryGetProperty(property, out var prop)
                || prop.ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(prop.GetString()))
            {
                throw new AppException($"Content field '{property}' is required.", 400);
            }
        }

        private static string SerializeContent(JsonElement content)
            => JsonSerializer.Serialize(content, JsonOptions);

        private static LandingPageSectionDto Map(LandingPageSection row)
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(row.ContentJson) ? "{}" : row.ContentJson);

            // Prefer canonical landing-nav labels even if DB still has old DisplayName rows.
            var key = row.SectionKey;
            if (LegacyKeyMap.TryGetValue(key, out var mappedKey))
                key = mappedKey;

            var seed = BuildSeedDefinitions()
                .FirstOrDefault(s => string.Equals(s.Key, key, StringComparison.OrdinalIgnoreCase));

            return new LandingPageSectionDto
            {
                Id = row.Id,
                SectionKey = key,
                DisplayName = !string.IsNullOrWhiteSpace(seed.DisplayName) ? seed.DisplayName : row.DisplayName,
                Description = !string.IsNullOrWhiteSpace(seed.Description) ? seed.Description : row.Description,
                IsDynamic = seed.Key is not null ? seed.IsDynamic : row.IsDynamic,
                IsVisible = row.IsVisible,
                SortOrder = seed.Key is not null ? seed.SortOrder : row.SortOrder,
                Content = doc.RootElement.Clone(),
                UpdatedAt = row.UpdatedAt,
            };
        }

        private static IEnumerable<(
            string Key,
            string DisplayName,
            string Description,
            bool IsDynamic,
            int SortOrder,
            string ContentJson)> BuildSeedDefinitions()
        {
            yield return (
                "home",
                "Home",
                "Main headline, subtitle, and call-to-action buttons",
                false,
                10,
                """
                {
                  "legalName": "Offshore TechX",
                  "platformName": "Offsure Management System",
                  "tagline": "Remote networking expertise, delivered worldwide.",
                  "subtitle": "Enterprise networking, security, and digital solutions — supported globally since 2018. Explore service categories, review delivered projects, and connect with Offshore TechX for networking, security, and digital solutions.",
                  "ctaPrimaryText": "Browse Categories",
                  "ctaSecondaryText": "Our Work"
                }
                """);

            yield return (
                "stats",
                "Stats",
                "Numbers shown below Home (categories, services, projects)",
                false,
                20,
                """
                {
                  "serviceCategoriesLabel": "Service Categories",
                  "publicServicesLabel": "Public Services",
                  "publishedProjectsLabel": "Published Projects",
                  "globalProjectsLabel": "Global Projects",
                  "globalProjectsValue": 100
                }
                """);

            yield return (
                "about",
                "About",
                "Company story, why choose us, and what we offer highlights",
                false,
                30,
                """
                {
                  "eyebrow": "About",
                  "title": "About Offshore TechX",
                  "subtitle": "Remote networking expertise with proven global delivery.",
                  "intro": "Founded in 2018, we specialize in remote support for enterprise networking, unified communications, security, data center, and digital solutions.",
                  "whoWeAreTitle": "Who We Are",
                  "whoWeAreParagraph1": "Founded in 2018, Offshore TechX provides remote support for networking solutions worldwide, with 100+ successfully completed projects.",
                  "whoWeAreParagraph2": "Our experts are committed to seamless, efficient network operations — backed by 15 years of multi-vendor experience across Cisco, Fortinet, Palo Alto, and more.",
                  "missionTitle": "Mission & Core Values",
                  "missionParagraph1": "Our mission is to deliver unparalleled remote support that enhances client productivity while fostering innovation and collaboration in digital communications.",
                  "missionParagraph2": "Integrity, excellence, and innovation guide how we serve clients — with a culture built on collaboration, continuous learning, and operational excellence.",
                  "whyChooseUsTitle": "Why Choose Us",
                  "whyChooseUsLead1": "15+ years of multi-vendor networking experience with expert certifications including CCIE (Cisco), PCNSE (Palo Alto), and NSE7 (Fortinet).",
                  "whyChooseUsLead2": "A track record of 100+ successfully completed projects worldwide, delivering reliable remote support across locations and complexity levels.",
                  "endToEndTitle": "End-to-End Solutions",
                  "endToEndParagraph1": "Beyond networking, we deliver enterprise and digital solutions — from mobile and web development to Agile delivery, system integration, AI-driven automation, and legacy support.",
                  "endToEndParagraph2": "Expert design services including BOM, HLD, LLD, and complete documentation for enterprise network projects. 24/7 deployment and support with SLA-backed response."
                }
                """);

            yield return (
                "faq",
                "Faq's",
                "Frequently asked questions shown on the landing page",
                false,
                40,
                """
                {
                  "eyebrow": "FAQ'S ?",
                  "title": "Frequently Asked Questions About Offshore TechX",
                  "subtitle": "Learn about our remote networking services, global delivery experience, and how to start your next project with Offshore TechX.",
                  "items": [
                    {
                      "question": "Who is Offshore TechX?",
                      "answer": "Founded in 2018, Offshore TechX specializes in remote support for networking solutions worldwide. Our team combines deep industry knowledge with a portfolio of 100+ successfully completed projects.\n\nMission: Provide unparalleled remote support that enhances client productivity while fostering innovation in digital communications."
                    },
                    {
                      "question": "What services does Offshore TechX offer?",
                      "answer": "We deliver vendor partnership support, technical training, consultation, design/presales (BOM, HLD, LLD), and 24/7 deployment/support with SLA coverage across enterprise networking, unified communications, security, wireless, data center, cybersecurity, and digital solutions.\n\nTip: Browse live Service Categories on this page to see offerings currently published in the system."
                    },
                    {
                      "question": "Why choose remote / offshore support?",
                      "answer": "Our model gives you certified multi-vendor expertise (CCIE, PCNSE, NSE7), proven global delivery, flexible team scaling, and significant cost efficiency compared with building and maintaining equivalent in-house capacity.\n\nNote: We support Cisco, Fortinet, Palo Alto, F5, NetApp, Microsoft, and more across LAN/WAN, SD-WAN, SD-Access, UC, and data center platforms."
                    },
                    {
                      "question": "How do I get started with a project?",
                      "answer": "Share your business goal, target timeline, environment details (sites, vendors, current stack), and the outcome you need. If you already reviewed a category or portfolio example, reference it in your message so our team can respond faster.\n\nContact: info@offshoretechx.net · +1 (702) 605-8569"
                    },
                    {
                      "question": "Are portfolio projects on this site real work?",
                      "answer": "Yes. The Our Work section presents published portfolio projects from the system. Only approved, published projects appear publicly so visitors can review real delivery examples.\n\nWebsite: https://offshoretechx.net/"
                    }
                  ]
                }
                """);

            yield return (
                "clients",
                "Clients",
                "Success story cards on the landing page",
                false,
                50,
                """
                {
                  "eyebrow": "Success Stories",
                  "title": "Proven delivery across industries worldwide.",
                  "subtitle": "Examples of outcomes we have delivered for enterprise clients.",
                  "stories": [
                    {
                      "icon": "fe fe-phone",
                      "title": "Unified Communications Deployment",
                      "sector": "Insurance · 500 employees",
                      "summary": "Implemented a comprehensive Cisco IP Telephony solution that transformed communication infrastructure and enabled seamless unified communication with strong mobility support.",
                      "highlight": "Cisco IP Telephony"
                    },
                    {
                      "icon": "fe fe-shield",
                      "title": "Secure SD-WAN for a Leading Bank",
                      "sector": "Financial Services · 63 branches",
                      "summary": "Designed and deployed a Cisco SD-WAN solution and migrated 63 branches from traditional WAN to a modern SD-WAN infrastructure.",
                      "highlight": "Cisco SD-WAN"
                    },
                    {
                      "icon": "fe fe-lock",
                      "title": "Secure Firewall Migration",
                      "sector": "Enterprise · 100 branches",
                      "summary": "Executed a security infrastructure upgrade and migrated firewalls across 100 branches from Cisco appliances to next-generation Palo Alto Networks firewalls.",
                      "highlight": "Palo Alto NGFW"
                    }
                  ]
                }
                """);

            yield return (
                "contact",
                "Contact",
                "Contact form title, subtitle, and company contact details",
                false,
                60,
                """
                {
                  "eyebrow": "Contact",
                  "title": "Get in Touch with Offshore TechX",
                  "subtitle": "Tell us about your project and we will respond promptly.",
                  "email": "info@offshoretechx.net",
                  "phone": "+1 (702) 605-8569",
                  "website": "https://offshoretechx.net/",
                  "supportHours": "24/7 deployment and support with SLA-backed response."
                }
                """);

            yield return (
                "footer",
                "Footer",
                "Footer about text, copyright, Capabilities, and social links",
                false,
                70,
                """
                {
                  "aboutText": "Offshore TechX specializes in remote support for networking solutions worldwide — with 100+ completed projects and deep multi-vendor expertise.",
                  "copyrightText": "All rights reserved.",
                  "capabilities": [
                    { "title": "Vendor Partnership" },
                    { "title": "Technical Training" },
                    { "title": "Consultation" },
                    { "title": "Design / Presales" },
                    { "title": "Deployment / Support / SLA" }
                  ],
                  "socialLinks": [
                    { "key": "facebook", "label": "Facebook", "icon": "fe fe-facebook", "url": "", "isVisible": false },
                    { "key": "github", "label": "GitHub", "icon": "fe fe-github", "url": "", "isVisible": false },
                    { "key": "x", "label": "X", "icon": "ri ri-twitter-x-line", "url": "", "isVisible": false },
                    { "key": "instagram", "label": "Instagram", "icon": "fe fe-instagram", "url": "", "isVisible": false },
                    { "key": "linkedin", "label": "LinkedIn", "icon": "fe fe-linkedin", "url": "", "isVisible": false },
                    { "key": "youtube", "label": "YouTube", "icon": "fe fe-youtube", "url": "", "isVisible": false }
                  ]
                }
                """);
        }
    }
}
