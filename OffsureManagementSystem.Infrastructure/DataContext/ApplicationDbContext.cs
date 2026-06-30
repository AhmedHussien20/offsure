namespace OffshoreManagementSystem.Infrastructure.DataContext
{
    using System.Reflection;
    using Microsoft.EntityFrameworkCore;
    using OffshoreManagementSystem.Domain.BaseEntity;
    using OffshoreManagementSystem.Domain.Entities;
    using OffsureManagementSystem.Domain.Entities;
    using OffsureManagementSystem.Domain.Entities.Enum;

    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // DbSets
        public DbSet<User> Users { get; set; }
        public DbSet<TeamMember> TeamMembers { get; set; }
        public DbSet<Skill> Skills { get; set; }
        public DbSet<TeamMemberSkill> TeamMemberSkills { get; set; }
        public DbSet<TeamMemberCertificate> TeamMemberCertificates { get; set; }
        public DbSet<TeamMemberExperience> TeamMemberExperiences { get; set; }
        public DbSet<Client> Clients { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<ServiceRequest> ServiceRequests { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectAssignment> ProjectAssignments { get; set; }
        public DbSet<ProjectSkill> ProjectSkills { get; set; }
        public DbSet<ProjectResourceManager> ProjectResourceManagers { get; set; }
        public DbSet<ProjectMilestone> ProjectMilestones { get; set; }
        public DbSet<Timesheet> Timesheets { get; set; }
        public DbSet<TimesheetEntry> TimesheetEntries { get; set; }
        public DbSet<PortfolioProject> PortfolioProjects { get; set; }
        public DbSet<PortfolioProjectImage> PortfolioProjectImages { get; set; }

        public DbSet<Role> Roles { get; set; }
        public DbSet<SkillCategory> SkillCategories { get; set; }
        public DbSet<ServiceCategory> ServiceCategories { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // USER ENTITY CONFIGURATION
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Email)
                    .IsRequired()
                    .HasMaxLength(256);

                entity.Property(e => e.PasswordHash)
                    .IsRequired();

                entity.Property(e => e.FirstName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.LastName)
                    .IsRequired()
                    .HasMaxLength(100);


                entity.Property(e => e.IsEmailVerified)
                    .HasDefaultValue(false);

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);


                entity.Property(u => u.PasswordResetToken)
                    .HasMaxLength(500);

                entity.Property(u => u.EmailVerificationToken)
                    .HasMaxLength(500);

                entity.Property(u => u.RefreshToken)
                    .HasMaxLength(500);

                entity.HasIndex(e => e.Email)
                    .IsUnique();

                entity.HasOne(e => e.Client)
                    .WithOne(c => c.User)
                    .HasForeignKey<Client>(c => c.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.TeamMembers)
                    .WithOne(t => t.User)
                    .HasForeignKey(t => t.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Role)
                   .WithMany(r => r.Users)
                   .HasForeignKey(e => e.RoleId)
                   .OnDelete(DeleteBehavior.Restrict);
            });


            modelBuilder.Entity<Role>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.Description)
                    .HasMaxLength(500);

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);

                entity.HasIndex(e => e.Name)
                    .IsUnique();

                entity.HasMany(e => e.Users)
                    .WithOne(u => u.Role)
                    .HasForeignKey(u => u.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);



                var rolesSeededAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                entity.HasData(
                    new Role
                    {
                        Id = 1,
                        Name = "Administrator",
                        Description = "Full access to configuration, users, and all operational data.",
                        IsActive = true,
                        CreatedAt = rolesSeededAt,
                        IsDeleted = false
                    },
                    new Role
                    {
                        Id = 2,
                        Name = "Client",
                        Description = "Company portal; manage service requests and view related projects.",
                        IsActive = true,
                        CreatedAt = rolesSeededAt,
                        IsDeleted = false
                    },
                    new Role
                    {
                        Id = 3,
                        Name = "TeamMember",
                        Description = "Internal staff profile, skills, and assignments on requests and projects.",
                        IsActive = true,
                        CreatedAt = rolesSeededAt,
                        IsDeleted = false
                    },
                    new Role
                    {
                        Id = 4,
                        Name = "ResourceManager",
                        Description = "Manages assigned team members, skills, allocations, and project delivery without financial access.",
                        IsActive = true,
                        CreatedAt = rolesSeededAt,
                        IsDeleted = false
                    });
            });

            // TEAM MEMBER ENTITY CONFIGURATION
            modelBuilder.Entity<TeamMember>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.YearsOfExperience)
                    .HasDefaultValue(0);

                entity.Property(e => e.CV)
                    .HasMaxLength(500);

                entity.Property(e => e.ProfilePhoto)
                    .HasMaxLength(500);

                entity.Property(e => e.IntroVideo)
                    .HasMaxLength(500);

                entity.Property(e => e.PhoneNumber)
                    .HasMaxLength(20);

                entity.Property(e => e.IsAvailable)
                    .HasDefaultValue(true);

                entity.Property(e => e.HourlySalary)
                    .HasPrecision(18, 2);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.TeamMembers)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.ResourceManager)
                    .WithMany(u => u.ManagedTeamMembers)
                    .HasForeignKey(e => e.ResourceManagerId)
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired(false);

                entity.HasMany(e => e.ProjectAssignments)
                    .WithOne(p => p.TeamMember)
                    .HasForeignKey(p => p.TeamMemberId)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            modelBuilder.Entity<SkillCategory>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.Description)
                    .HasMaxLength(500);

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);

                entity.HasIndex(e => e.Name)
                    .IsUnique();

                entity.HasMany(e => e.Skills)
                    .WithOne(s => s.SkillCategory)
                    .HasForeignKey(s => s.SkillCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // SERVICE CATEGORY ENTITY CONFIGURATION
            modelBuilder.Entity<ServiceCategory>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.Description)
                    .HasMaxLength(500);

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);

                entity.HasIndex(e => e.Name)
                    .IsUnique();

                entity.HasMany(e => e.Services)
                    .WithOne(s => s.ServiceCategory)
                    .HasForeignKey(s => s.ServiceCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });



            // SKILL ENTITY CONFIGURATION
            modelBuilder.Entity<Skill>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.Description)
                    .HasMaxLength(500);

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);

                entity.HasMany(e => e.TeamMemberSkills)
                    .WithOne(ts => ts.Skill)
                    .HasForeignKey(ts => ts.SkillId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.SkillCategory)
                    .WithMany(sc => sc.Skills)
                    .HasForeignKey(e => e.SkillCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);

            });

            // TEAM MEMBER SKILL ENTITY CONFIGURATION
            modelBuilder.Entity<TeamMemberSkill>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.ProficiencyLevel)
                    .IsRequired();

                entity.Property(e => e.YearsOfExperience)
                    .HasDefaultValue(0);

                entity.Property(e => e.AcquiredDate)
                    .IsRequired();

                entity.Property(e => e.IsEndorsed)
                    .HasDefaultValue(false);

                entity.Property(e => e.EndorsementCount)
                    .HasDefaultValue(0);

                entity.HasOne(e => e.TeamMember)
                    .WithMany(t => t.TeamMemberSkills)
                    .HasForeignKey(e => e.TeamMemberId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Skill)
                    .WithMany(s => s.TeamMemberSkills)
                    .HasForeignKey(e => e.SkillId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Composite index to prevent duplicate skill assignments to same member
                entity.HasIndex(e => new { e.TeamMemberId, e.SkillId })
                    .IsUnique();
            });

            modelBuilder.Entity<TeamMemberCertificate>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(e => e.Issuer)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.HasOne(e => e.TeamMember)
                    .WithMany(t => t.Certificates)
                    .HasForeignKey(e => e.TeamMemberId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TeamMemberExperience>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.JobTitle)
                    .IsRequired()
                    .HasMaxLength(150);

                entity.Property(e => e.Company)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(e => e.Description)
                    .HasMaxLength(2000);

                entity.HasOne(e => e.TeamMember)
                    .WithMany(t => t.Experiences)
                    .HasForeignKey(e => e.TeamMemberId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.TeamMemberId, e.DisplayOrder });
            });

            // CLIENT ENTITY CONFIGURATION
            modelBuilder.Entity<Client>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.CompanyName)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.Property(e => e.ContactPersonPhone)
                    .HasMaxLength(20);

                entity.Property(e => e.CompanyAddress)
                    .HasMaxLength(500);

                entity.Property(e => e.City)
                    .HasMaxLength(100);

                entity.Property(e => e.Country)
                    .HasMaxLength(100);

                entity.Property(e => e.PostalCode)
                    .HasMaxLength(20);

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);

                entity.HasOne(e => e.User)
                    .WithOne(u => u.Client)
                    .HasForeignKey<Client>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.ServiceRequests)
                    .WithOne(s => s.Client)
                    .HasForeignKey(s => s.ClientId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SERVICE ENTITY CONFIGURATION
            modelBuilder.Entity<Service>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(e => e.Description)
                    .HasMaxLength(1000);

                entity.Property(e => e.IsVisible)
                    .HasDefaultValue(true);

                entity.HasMany(e => e.ServiceRequests)
                    .WithOne(s => s.Service)
                    .HasForeignKey(s => s.ServiceId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.PortfolioProjects)
                    .WithOne(p => p.Service)
                    .HasForeignKey(p => p.ServiceId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.ServiceCategory)
                   .WithMany(sc => sc.Services)
                   .HasForeignKey(e => e.ServiceCategoryId)
                   .OnDelete(DeleteBehavior.Restrict);
            });

            // SERVICE REQUEST ENTITY CONFIGURATION
            modelBuilder.Entity<ServiceRequest>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title)
                    .IsRequired()
                    .HasMaxLength(300);

                entity.Property(e => e.Description)
                    .HasMaxLength(2000);

                entity.Property(e => e.Status)
                    .HasConversion<string>()
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(e => e.RequestedDate)
                    .IsRequired();

                entity.Property(e => e.Priority)
                    .HasDefaultValue(3);

                entity.Property(e => e.Budget)
                    .HasPrecision(18, 2);

                entity.HasOne(e => e.Client)
                    .WithMany(c => c.ServiceRequests)
                    .HasForeignKey(e => e.ClientId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Service)
                    .WithMany(s => s.ServiceRequests)
                    .HasForeignKey(e => e.ServiceId)
                    .OnDelete(DeleteBehavior.Restrict);

               
            });
           

            // PROJECT ENTITY CONFIGURATION
            modelBuilder.Entity<Project>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(300);

                entity.Property(e => e.Description)
                    .HasMaxLength(2000);

                entity.Property(e => e.Status)
                    .HasConversion<string>()
                    .HasMaxLength(50)
                    .IsRequired();

                entity.Property(e => e.StartDate)
                    .IsRequired();

                entity.Property(e => e.Progress)
                    .HasDefaultValue(0);

                entity.Property(e => e.Budget)
                    .HasPrecision(18, 2);

                entity.Property(e => e.BudgetType)
                    .HasConversion<string>()
                    .HasMaxLength(20)
                    .HasDefaultValue(ProjectBudgetType.Total);

                entity.Property(e => e.HourlyRate)
                    .HasPrecision(18, 2);

                entity.HasOne(e => e.ServiceRequest)
                    .WithOne(s => s.Project)
                    .HasForeignKey<Project>(e => e.ServiceRequestId)
                    .OnDelete(DeleteBehavior.SetNull)
                    .IsRequired(false);

                entity.HasMany(e => e.ProjectAssignments)
                    .WithOne(p => p.Project)
                    .HasForeignKey(p => p.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.ProjectSkills)
                    .WithOne(ps => ps.Project)
                    .HasForeignKey(ps => ps.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.ProjectResourceManagers)
                    .WithOne(rm => rm.Project)
                    .HasForeignKey(rm => rm.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.ProjectMilestones)
                    .WithOne(m => m.Project)
                    .HasForeignKey(m => m.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ProjectMilestone>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(e => e.Description)
                    .HasMaxLength(1000);

                entity.Property(e => e.PaymentPercentage)
                    .HasPrecision(5, 2);

                entity.Property(e => e.PaymentAmount)
                    .HasPrecision(18, 2);

                entity.Property(e => e.Status)
                    .HasConversion<string>()
                    .HasMaxLength(30)
                    .IsRequired();

                entity.HasIndex(e => new { e.ProjectId, e.Order });
            });

            modelBuilder.Entity<ProjectResourceManager>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Project)
                    .WithMany(p => p.ProjectResourceManagers)
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.ResourceManager)
                    .WithMany()
                    .HasForeignKey(e => e.ResourceManagerUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.ProjectId, e.ResourceManagerUserId })
                    .IsUnique()
                    .HasFilter("[IsDeleted] = 0");

                entity.Property(e => e.HourlyCostRate)
                    .HasPrecision(18, 2);
            });

            modelBuilder.Entity<Timesheet>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.Project)
                    .WithMany()
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.TeamMember)
                    .WithMany()
                    .HasForeignKey(e => e.TeamMemberId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.ProjectId, e.TeamMemberId, e.WorkDate })
                    .IsUnique()
                    .HasFilter("[IsDeleted] = 0");
            });

            modelBuilder.Entity<TimesheetEntry>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Description)
                    .HasMaxLength(500)
                    .IsRequired();

                entity.Property(e => e.Hours)
                    .HasPrecision(8, 2);

                entity.HasOne(e => e.Timesheet)
                    .WithMany(t => t.Entries)
                    .HasForeignKey(e => e.TimesheetId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // PROJECT SKILL ENTITY CONFIGURATION
            modelBuilder.Entity<ProjectSkill>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.IsSelected)
                    .HasDefaultValue(true);

                entity.HasOne(e => e.Project)
                    .WithMany(p => p.ProjectSkills)
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Skill)
                    .WithMany(s => s.ProjectSkills)
                    .HasForeignKey(e => e.SkillId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.ProjectId, e.SkillId })
                    .IsUnique();
            });

            // PROJECT ASSIGNMENT ENTITY CONFIGURATION
            modelBuilder.Entity<ProjectAssignment>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Role)
                    .HasMaxLength(100);

                entity.Property(e => e.AssignedDate)
                    .IsRequired();

                entity.Property(e => e.IsActive)
                    .HasDefaultValue(true);

                entity.Property(e => e.HourlyRate)
                    .HasPrecision(18, 2);

                entity.HasOne(e => e.Project)
                    .WithMany(p => p.ProjectAssignments)
                    .HasForeignKey(e => e.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.TeamMember)
                    .WithMany(t => t.ProjectAssignments)
                    .HasForeignKey(e => e.TeamMemberId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Skill)
                    .WithMany()
                    .HasForeignKey(e => e.SkillId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.ProjectId, e.TeamMemberId, e.SkillId, e.IsActive });

                entity.HasQueryFilter(a => a.IsActive && !a.IsDeleted);
            });

            // PORTFOLIO PROJECT ENTITY CONFIGURATION
            modelBuilder.Entity<PortfolioProject>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title)
                    .IsRequired()
                    .HasMaxLength(300);

                entity.Property(e => e.Description)
                    .HasMaxLength(2000);

                entity.Property(e => e.ClientName)
                    .IsRequired()
                    .HasMaxLength(200);

                entity.Property(e => e.ThumbnailUrl)
                    .HasMaxLength(500);

                entity.Property(e => e.CompletedDate)
                    .IsRequired();

                entity.Property(e => e.IsPublished)
                    .HasDefaultValue(true);

                entity.HasOne(e => e.Service)
                    .WithMany(s => s.PortfolioProjects)
                    .HasForeignKey(e => e.ServiceId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.PortfolioProjectImages)
                    .WithOne(i => i.PortfolioProject)
                    .HasForeignKey(i => i.PortfolioProjectId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // PORTFOLIO PROJECT IMAGE ENTITY CONFIGURATION
            modelBuilder.Entity<PortfolioProjectImage>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.ImageUrl)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(e => e.ImageAltText)
                    .HasMaxLength(500);

                entity.Property(e => e.DisplayOrder)
                    .IsRequired();

                entity.HasOne(e => e.PortfolioProject)
                    .WithMany(p => p.PortfolioProjectImages)
                    .HasForeignKey(e => e.PortfolioProjectId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            ConfigureSoftDeleteFilters(modelBuilder);
        }

        private static void ConfigureSoftDeleteFilters(ModelBuilder modelBuilder)
        {
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (entityType.IsKeyless || entityType.ClrType is null)
                    continue;

                var clrType = entityType.ClrType;
                if (!typeof(BaseEntity).IsAssignableFrom(clrType) || clrType.IsAbstract)
                    continue;

                typeof(ApplicationDbContext)
                    .GetMethod(nameof(SetSoftDeleteFilter), BindingFlags.NonPublic | BindingFlags.Static)!
                    .MakeGenericMethod(clrType)
                    .Invoke(null, new object[] { modelBuilder });
            }
        }

        private static void SetSoftDeleteFilter<TEntity>(ModelBuilder modelBuilder)
            where TEntity : BaseEntity
        {
            modelBuilder.Entity<TEntity>().HasQueryFilter(e => !e.IsDeleted);
        }
    }
}
