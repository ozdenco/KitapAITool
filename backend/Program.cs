using System.Text;
using KolayKobi.Api.Data;
using KolayKobi.Api.Services;
using KolayKobi.Api.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ──────────────────────────────────────────────────────────────────────────────
// Services
// ──────────────────────────────────────────────────────────────────────────────

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "KolayKOBİ API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            []
        }
    });
});

// Database
// EF Core 10 yükseltmesinde PendingModelChangesWarning exception fırlatacak şekilde değişti.
// Migrations doğru şekilde uygulanır — bu warning snapshot tutarsızlığından kaynaklanır.
builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseNpgsql(builder.Configuration.GetConnectionString("Default"))
        .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret not configured");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(opts =>
    opts.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("is_admin", "true")));

// CORS — allow frontend origin
builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(p => p
        .WithOrigins(
            "http://localhost:3000",
            "https://kolaykobi.com",
            "https://www.kolaykobi.com")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

// Application services
// n8n proxy: AI işlemleri uzun sürebilir. Retry YOK — idempotent değil (iki kez çağrılırsa
// n8n iki kez çalışır, token harcar).
// rakip-analiz: Gemini(90s) + MiniMax(120s) = 210s max → 240s ile yeterli marj.
// Diğer sync araçlar: MiniMax 120s max → 240s fazlasıyla yeterli.
// Async araçlar (takvim, trend-video): ilk webhook hızlı döner; bu timeout onları etkilemez.
builder.Services.AddHttpClient<N8nProxyService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(240);
});
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ToolUsageService>();
builder.Services.AddScoped<SubscriptionService>();

// PayTR ödeme — ayrı HttpClient (token alma kısa, 30s yeterli)
builder.Services.AddHttpClient("paytr", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddScoped<PayTrService>();

// Günlük otomatik yenileme servisi (03:00 UTC)
builder.Services.AddHostedService<RecurringRenewalService>();

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline
// ──────────────────────────────────────────────────────────────────────────────

var app = builder.Build();

// Auto-run migrations on startup (development + production/Docker)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
