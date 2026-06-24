using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace OffsureManagementSystem.API.Storage;

internal static class LocalStorageBootstrap
{
    public const string StorageRootKey = "Storage:Root";
    public const string TeamCvRootKey = "Storage:TeamCvRoot";
    public const string TeamPhotoRootKey = "Storage:TeamPhotoRoot";
    public const string PortfolioImageRootKey = "Storage:PortfolioImageRoot";

    public static void Configure(WebApplicationBuilder builder)
    {
        var storageRoot = ResolveStorageRoot(builder.Environment, builder.Configuration);
        var cvRoot = Path.Combine(storageRoot, "team-cvs");
        var photoRoot = Path.Combine(storageRoot, "team-photos");
        var portfolioRoot = Path.Combine(storageRoot, "portfolio-images");

        Directory.CreateDirectory(cvRoot);
        Directory.CreateDirectory(photoRoot);
        Directory.CreateDirectory(portfolioRoot);

        var overrides = new Dictionary<string, string?>();
        if (string.IsNullOrWhiteSpace(builder.Configuration[StorageRootKey]))
            overrides[StorageRootKey] = storageRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[TeamCvRootKey]))
            overrides[TeamCvRootKey] = cvRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[TeamPhotoRootKey]))
            overrides[TeamPhotoRootKey] = photoRoot;
        if (string.IsNullOrWhiteSpace(builder.Configuration[PortfolioImageRootKey]))
            overrides[PortfolioImageRootKey] = portfolioRoot;

        if (overrides.Count > 0)
            builder.Configuration.AddInMemoryCollection(overrides);
    }

    public static void UseUploadedFileStaticFiles(WebApplication app)
    {
        MapStaticFolder(app, TeamCvRootKey, "/storage/team-cvs");
        MapStaticFolder(app, TeamPhotoRootKey, "/storage/team-photos");
        MapStaticFolder(app, PortfolioImageRootKey, "/portfolio-images");
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
            RequestPath = requestPath
        });
    }

    private static string ResolveStorageRoot(IWebHostEnvironment env, IConfiguration config)
    {
        var configuredRoot = config[StorageRootKey];
        if (!string.IsNullOrWhiteSpace(configuredRoot))
            return configuredRoot;

        if (env.IsDevelopment())
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "OffsureManagementSystem",
                "storage");
        }

        return Path.Combine(env.ContentRootPath, "storage");
    }
}
