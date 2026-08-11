using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db, EmailService email) : ControllerBase
{
    // ── DTOs ─────────────────────────────────────────────────────────────────

    public record AdminUserDto(
        Guid Id,
        string Name,
        string Email,
        string Company,
        bool IsAdmin,
        string PlanType,
        DateTime CreatedAt,
        DateTime? LastLoginAt,
        List<string> ToolsUsed,
        int TotalToolUses);

    public record UpdateUserRequest(
        [MaxLength(128)] string? Name,
        [MaxLength(256)] string? Company,
        bool? IsAdmin);

    public record CreateUserRequest(
        [Required, MaxLength(128)] string Name,
        [Required, EmailAddress, MaxLength(256)] string Email,
        [MaxLength(256)] string? Company,
        [Required, MinLength(8),
         RegularExpression(@"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$",
             ErrorMessage = "Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.")]
        string Password,
        bool IsAdmin = false,
        string Plan = "free");

    public record AdminResetPasswordRequest(
        [Required, MinLength(8),
         RegularExpression(@"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$",
             ErrorMessage = "Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.")]
        string NewPassword);

    // ── GET /api/admin/users ──────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await db.Users
            .Include(u => u.Subscription).ThenInclude(s => s!.Plan)
            .Include(u => u.UsageLogs)
            .OrderBy(u => u.CreatedAt)
            .ToListAsync();

        var data = users.Select(u => new AdminUserDto(
            u.Id,
            u.Name,
            u.Email,
            u.Company ?? string.Empty,
            u.IsAdmin,
            u.Subscription?.Plan.Type.ToString().ToLower() ?? "free",
            u.CreatedAt,
            u.LastLoginAt,
            u.UsageLogs.Select(l => l.ToolId).Distinct().ToList(),
            u.UsageLogs.Count
        )).ToList();

        return Ok(new { success = true, data });
    }

    // ── PATCH /api/admin/users/{id} ───────────────────────────────────────────
    [HttpPatch("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        // Sadece mevcut admin'den yetki kaldırılıyorsa kontrol et
        if (req.IsAdmin.HasValue && !req.IsAdmin.Value && user.IsAdmin)
        {
            var callerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (id == callerId)
                return BadRequest(new { success = false, error = "Kendi admin yetkinizi kaldıramazsınız." });

            var adminCount = await db.Users.CountAsync(u => u.IsAdmin);
            if (adminCount <= 1)
                return BadRequest(new { success = false, error = "En az bir admin kalmalı." });
        }

        if (req.Name is not null) user.Name    = req.Name.Trim();
        if (req.Company is not null) user.Company = req.Company.Trim() == string.Empty ? null : req.Company.Trim();
        if (req.IsAdmin.HasValue)   user.IsAdmin  = req.IsAdmin.Value;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── POST /api/admin/users ─────────────────────────────────────────────────
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return Conflict(new { success = false, error = "Bu e-posta adresi zaten kayıtlı." });

        if (!Enum.TryParse<PlanType>(req.Plan, ignoreCase: true, out var planType))
            planType = PlanType.Free;

        var plan = await db.Plans.FirstOrDefaultAsync(p => p.Type == planType);
        if (plan is null)
            return BadRequest(new { success = false, error = "Geçersiz plan tipi." });

        var user = new User
        {
            Name          = req.Name.Trim(),
            Email         = req.Email.ToLower().Trim(),
            Company       = string.IsNullOrWhiteSpace(req.Company) ? null : req.Company.Trim(),
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(req.Password),
            IsAdmin       = req.IsAdmin,
            EmailVerified = true,  // Admin tarafından oluşturulan → doğrulanmış sayılır
        };

        db.Users.Add(user);

        db.Subscriptions.Add(new Subscription
        {
            UserId = user.Id,
            PlanId = plan.Id,
            Status = SubscriptionStatus.Active,
        });

        await db.SaveChangesAsync();

        // Hoş geldiniz maili: kullanıcı 24 saat geçerli şifre belirleme linki alır
        var resetToken = Guid.NewGuid().ToString("N");
        user.PasswordResetToken  = resetToken;
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(24);
        await db.SaveChangesAsync();

        try
        {
            await email.SendWelcomeEmailAsync(user.Email, user.Name, resetToken);
        }
        catch (Exception ex)
        {
            // Mail hatası kullanıcı oluşturmayı geri almaz — loglayıp devam et
            Console.Error.WriteLine($"[AdminController] Welcome email failed for {user.Email}: {ex.Message}");
        }

        return Ok(new { success = true, data = new { user.Id, user.Name, user.Email } });
    }

    // ── POST /api/admin/users/{id}/reset-password ─────────────────────────────
    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] AdminResetPasswordRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
            return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        user.PasswordHash        = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.RefreshToken        = null;   // Mevcut oturumları sonlandır
        user.RefreshTokenExpiry  = null;
        user.UpdatedAt           = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
