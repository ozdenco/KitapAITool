using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using KolayKobi.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KolayKobi.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserService users) : ControllerBase
{
    public record RegisterRequest(
        [Required, MaxLength(128)] string Name,
        [Required, EmailAddress] string Email,
        [Required, MinLength(8)] string Password);

    public record LoginRequest(
        [Required, EmailAddress] string Email,
        [Required] string Password);

    public record RefreshRequest(
        [Required] string AccessToken,
        [Required] string RefreshToken);

    public record GoogleRequest([Required] string IdToken);

    public record ForgotPasswordRequest(
        [Required, EmailAddress] string Email);

    public record ResetPasswordRequest(
        [Required] string Token,
        [Required, MinLength(8)] string NewPassword);

    // ── Kayıt ─────────────────────────────────────────────────────────────────
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var result = await users.RegisterAsync(req.Name, req.Email, req.Password);
        if (result is null)
            return Conflict(new { success = false, error = "Bu e-posta adresi zaten kayıtlı." });

        var (user, access, refresh) = result.Value;
        return Ok(new
        {
            success = true,
            data = new
            {
                tokens = new { accessToken = access, refreshToken = refresh },
                user   = new { user.Id, user.Name, user.Email, user.EmailVerified }
            }
        });
    }

    // ── Giriş ─────────────────────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var result = await users.LoginAsync(req.Email, req.Password);
        if (result is null)
            return Unauthorized(new { success = false, error = "E-posta veya şifre hatalı." });

        var (user, access, refresh) = result.Value;
        return Ok(new
        {
            success = true,
            data = new
            {
                tokens = new { accessToken = access, refreshToken = refresh },
                user   = new { user.Id, user.Name, user.Email, user.EmailVerified }
            }
        });
    }

    // ── Google OAuth ──────────────────────────────────────────────────────────
    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleRequest req)
    {
        var result = await users.GoogleLoginAsync(req.IdToken);
        if (result is null)
            return Unauthorized(new { success = false, error = "Google doğrulaması başarısız." });

        var (user, access, refresh) = result.Value;
        return Ok(new
        {
            success = true,
            data = new
            {
                tokens = new { accessToken = access, refreshToken = refresh },
                user   = new { user.Id, user.Name, user.Email, user.EmailVerified }
            }
        });
    }

    // ── E-posta doğrulama ─────────────────────────────────────────────────────
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { success = false, error = "Geçersiz doğrulama bağlantısı." });

        var ok = await users.VerifyEmailAsync(token);
        if (!ok)
            return BadRequest(new { success = false, error = "Bağlantı geçersiz veya süresi dolmuş." });

        return Ok(new { success = true });
    }

    // ── Doğrulama maili yeniden gönder ───────────────────────────────────────
    [HttpPost("resend-verification")]
    [Authorize]
    public async Task<IActionResult> ResendVerification()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ok = await users.ResendVerificationAsync(userId);

        return ok
            ? Ok(new { success = true })
            : BadRequest(new { success = false, error = "E-posta gönderilemedi veya zaten doğrulanmış." });
    }

    // ── Şifremi unuttum ───────────────────────────────────────────────────────
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        await users.ForgotPasswordAsync(req.Email);
        // Kullanıcı var/yok bilgisini verme — her zaman aynı yanıt
        return Ok(new { success = true, message = "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
    }

    // ── Şifre sıfırla ────────────────────────────────────────────────────────
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        var ok = await users.ResetPasswordAsync(req.Token, req.NewPassword);
        if (!ok)
            return BadRequest(new { success = false, error = "Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar şifre sıfırlama isteği gönderin." });

        return Ok(new { success = true, message = "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz." });
    }

    // ── Token yenile ──────────────────────────────────────────────────────────
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        var result = await users.RefreshAsync(req.AccessToken, req.RefreshToken);
        if (result is null)
            return Unauthorized(new { success = false, error = "Oturum süresi doldu. Lütfen tekrar giriş yapın." });

        var (_, access, refresh) = result.Value;
        return Ok(new
        {
            success = true,
            data    = new { accessToken = access, refreshToken = refresh }
        });
    }

    // ── Mevcut kullanıcı ─────────────────────────────────────────────────────
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await users.GetByIdAsync(userId);
        if (user is null) return NotFound(new { success = false, error = "Kullanıcı bulunamadı." });

        return Ok(new
        {
            success = true,
            data = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.EmailVerified,
                plan = user.Subscription?.Plan.Type.ToString().ToLower() ?? "free"
            }
        });
    }

    // ── Çıkış ─────────────────────────────────────────────────────────────────
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await users.LogoutAsync(userId);
        return NoContent();
    }
}
