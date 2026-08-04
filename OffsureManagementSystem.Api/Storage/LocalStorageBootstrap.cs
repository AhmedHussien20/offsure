using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace OffsureManagementSystem.API.Storage;

internal static class LocalStorageBootstrap
{
    public const string StorageRootKey = "Storage:Root";
    public const string TeamCvRootKey = "Storage:TeamCvRoot";
    public const string TeamPhotoRootKey = "Storage:TeamPhotoRoot";
    public const string TeamIntroVideoRootKey = "Storage:TeamIntroVideoRoot";
    public const string PortfolioImageRootKey = "Storage:PortfolioImageRoot";
    public const string ProjectInvoiceRootKey = "Storage:ProjectInvoiceRoot";

    public static void Configure(WebApplicationBuilder builder)
    {
        var storageRoot = ResolveStorageRoot(builder.Environment, builder.Configuration);
        var cvRoot = Path.Combine(storageRoot, "team-cvs");
        var photoRoot = Path.Combine(storageRoot, "team-photos");
        var introVideoRoot = Path.Combine(storageRoot, "team-videos");
        var portfolioRoot = Path.Combine(storageRoot, "portfolio-images");
        var invoiceRoot = Path.Combine(storageRoot, "project-invoices");

        Directory.CreateDirectory(cvRoot);
        Directory.CreateDirectory(photoRoot);
        Directory.CreateDirectory(introVideoRoot);
        Directory.CreateDirectory(portfolioRoot);
        Directory.CreateDirectory(invoiceRoot);

        var overrides = new Dictionary<string, string?>();
        if (string.IsNullOrWhiteSpace(builder.Configuration[StorageRootKey]))
            overrides[StorageRootKey] = storageRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[TeamCvRootKey]))
            overrides[TeamCvRootKey] = cvRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[TeamPhotoRootKey]))
            overrides[TeamPhotoRootKey] = photoRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[TeamIntroVideoRootKey]))
            overrides[TeamIntroVideoRootKey] = introVideoRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[PortfolioImageRootKey]))
            overrides[PortfolioImageRootKey] = portfolioRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[ProjectInvoiceRootKey]))
            overrides[ProjectInvoiceRootKey] = invoiceRoot;

        if (overrides.Count > 0)
            builder.Configuration.AddInMemoryCollection(overrides);
    }

    public static void UseUploadedFileStaticFiles(WebApplication app)
    {
        MapStaticFolder(app, TeamCvRootKey, "/storage/team-cvs");
        MapStaticFolder(app, TeamPhotoRootKey, "/storage/team-photos");
        MapStaticFolder(app, TeamIntroVideoRootKey, "/storage/team-videos");
        MapStaticFolder(app, PortfolioImageRootKey, "/portfolio-images");
        MapStaticFolder(app, ProjectInvoiceRootKey, "/storage/project-invoices");
    }

    private static void MapStaticFolder(WebApplication app, string configKey, string requestPath)
    {
        var physicalPath = app.Configuration[configKey];
        if (string.IsNullOrWhiteSpace(physicalPath))
            return;

        Directory.CreateDirectory(physicalPath);

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(physicalPath),
            RequestPath = requestPath,
            ContentTypeProvider = BuildContentTypeProvider()
        });
    }

    private static FileExtensionContentTypeProvider BuildContentTypeProvider()
    {
        var provider = new FileExtensionContentTypeProvider();
        // Ensure intro media audio/video extensions serve with a correct content type.
        provider.Mappings[".m4a"] = "audio/mp4";
        provider.Mappings[".oga"] = "audio/ogg";
        provider.Mappings[".webm"] = "video/webm";
        provider.Mappings[".mov"] = "video/quicktime";
        return provider;
    }

    private static string ResolveStorageRoot(IWebHostEnvironment env, IConfiguration config)
    {
        var configuredRoot = config[StorageRootKey];
        if (!string.IsNullOrWhiteSpace(configuredRoot))
        {
            // Resolve relative paths against ContentRoot (e.g. "../storage").
            return Path.GetFullPath(configuredRoot, env.ContentRootPath);
        }

        if (env.IsDevelopment())
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "OffsureManagementSystem",
                "storage");
        }

        // Store next to the publish/output folder — not inside it — so
        // `rm -rf publish` + republish does not delete uploaded files.
        // Example: ContentRoot=/var/www/offsure/publish → /var/www/offsure/storage
        var parent = Directory.GetParent(env.ContentRootPath)?.FullName;
        if (!string.IsNullOrWhiteSpace(parent))
            return Path.Combine(parent, "storage");

        return Path.Combine(env.ContentRootPath, "storage");
    }
}
