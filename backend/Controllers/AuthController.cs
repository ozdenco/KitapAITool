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

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var result = await users.RegisterAsync(req.Name, req.Email, req.Password);
        if (result is null)
            return Conflict(new { error = "Bu e-posta adresi zaten kayıtlı." });

        var (user, access, refresh) = result.Value;
        return Ok(new
        {
            accessToken = access,
            refreshToken = refresh,
            user = new { user.Id, user.Name, user.Email }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var result = await users.LoginAsync(req.Email, req.Password);
        if (result is null)
            return Unauthorized(new { error = "E-posta veya şifre hatalı." });

        var (user, access, refresh) = result.Value;
        return Ok(new
        {
            accessToken = access,
            refreshToken = refresh,
            user = new { user.Id, user.Name, user.Email }
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        var result = await users.RefreshAsync(req.AccessToken, req.RefreshToken);
        if (result is null)
            return Unauthorized(new { error = "Oturum süresi doldu. Lütfen tekrar giriş yapın." });

        var (user, access, refresh) = result.Value;
        return Ok(new
        {
            accessToken = access,
            refreshToken = refresh,
            user = new { user.Id, user.Name, user.Email }
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await users.GetByIdAsync(userId);
        if (user is null) return NotFound();

        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            plan = user.Subscription?.Plan.Type.ToString().ToLower() ?? "free"
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await users.LogoutAsync(userId);
        return NoContent();
    }
}
