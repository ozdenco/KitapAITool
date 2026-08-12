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
// n8n proxy: AI işlemleri 60s+ sürebilir. Retry YOK — idempotent değil (iki kez çağrılırsa
// n8n iki kez çalışır, token harcar). Frontend 210s timeout; backend 180s (biraz önde biter).
builder.Services.AddHttpClient<N8nProxyService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(180);
});
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ToolUsageService>();
builder.Services.AddScoped<SubscriptionService>();

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
