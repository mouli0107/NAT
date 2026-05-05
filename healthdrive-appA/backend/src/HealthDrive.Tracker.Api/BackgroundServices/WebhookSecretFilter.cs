using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HealthDrive.Tracker.Api.BackgroundServices;

/// <summary>
/// Action filter that validates the shared secret on the email intake webhook.
/// The secret is stored in Azure Key Vault and injected via IConfiguration.
/// Clients (Azure Communication Services) must pass the header:
///   X-Webhook-Secret: &lt;secret&gt;
/// </summary>
public sealed class WebhookSecretFilter : IActionFilter
{
    private const string HeaderName = "X-Webhook-Secret";
    private readonly string _expectedSecret;

    public WebhookSecretFilter(IConfiguration config)
    {
        _expectedSecret = config["EmailIntake:WebhookSecret"]
            ?? throw new InvalidOperationException("EmailIntake:WebhookSecret is not configured.");
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var value)
            || value != _expectedSecret)
        {
            context.Result = new UnauthorizedResult();
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
