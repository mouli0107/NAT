using HealthDrive.Tracker.Application.AI.Interfaces;
using HealthDrive.Tracker.Application.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HealthDrive.Tracker.Infrastructure.AI;

/// <summary>
/// Registers all AI-layer services. Call from Program.cs:
///   builder.Services.AddAiServices(builder.Configuration);
/// </summary>
public static class AiServiceRegistration
{
    public static IServiceCollection AddAiServices(
        this IServiceCollection services,
        IConfiguration config)
    {
        // Feature flag service (in-memory cache + SQL)
        services.AddMemoryCache();
        services.AddScoped<IFeatureFlagService>(sp =>
            new FeatureFlagService(
                config.GetConnectionString("HealthDriveDb")!,
                sp.GetRequiredService<IMemoryCache>(),
                sp.GetRequiredService<ILogger<FeatureFlagService>>()));

        // PHI scanner — singleton, pure regex, no state
        services.AddSingleton<IPhiScannerService, PhiScannerService>();

        // LLM Provider — Azure OpenAI when configured, Null otherwise
        var aoaiSection = config.GetSection(AzureOpenAIOptions.Section);
        if (aoaiSection.Exists() && !string.IsNullOrWhiteSpace(aoaiSection["ApiKey"]))
        {
            services.Configure<AzureOpenAIOptions>(aoaiSection);
            services.AddScoped<ILlmProvider, AzureOpenAIProvider>();
        }
        else
        {
            // No Azure OpenAI credentials — use no-op provider (feature effectively disabled)
            services.AddSingleton<ILlmProvider, NullLlmProvider>();
        }

        // Application-layer AI services
        services.AddScoped<IEmailEnrichmentService, EmailEnrichmentService>();
        services.AddScoped<IAIDepartmentRoutingService, AIDepartmentRoutingService>();

        return services;
    }
}
