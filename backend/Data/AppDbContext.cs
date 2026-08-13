using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<ToolUsageLog> ToolUsageLogs => Set<ToolUsageLog>();
    public DbSet<ToolPurchase> ToolPurchases => Set<ToolPurchase>();
    public DbSet<ToolResult> ToolResults => Set<ToolResult>();
    public DbSet<PaymentOrder> PaymentOrders => Set<PaymentOrder>();
    public DbSet<ToolPrice> ToolPrices => Set<ToolPrice>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);

        // ── Users ──────────────────────────────────────────────────────────────
        m.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256).IsRequired();
            e.Property(u => u.Name).HasMaxLength(128).IsRequired();
        });

        // ── Plans ──────────────────────────────────────────────────────────────
        m.Entity<Plan>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Name).HasMaxLength(64).IsRequired();
            e.Property(p => p.PriceMonthly).HasColumnType("decimal(10,2)");
            e.Property(p => p.PricePerUse).HasColumnType("decimal(10,4)");

            // Seed default plans
            e.HasData(
                new Plan { Id = 1, Type = PlanType.Free,       Name = "Ücretsiz",  Description = "Her araç için ayda 3 kullanım", PriceMonthly = 0,    UsagePerToolPerMonth = 3  },
                new Plan { Id = 2, Type = PlanType.Standard,   Name = "Standart",  Description = "Tüm araçlarda ayda 10 kullanım", PriceMonthly = 199,  UsagePerToolPerMonth = 10 },
                new Plan { Id = 3, Type = PlanType.Premium,    Name = "Premium",   Description = "Tüm araçlarda ayda 25 kullanım", PriceMonthly = 399,  UsagePerToolPerMonth = 25 },
                new Plan { Id = 4, Type = PlanType.Enterprise, Name = "Kurumsal",  Description = "Kullandıkça öde",               PriceMonthly = 0,    UsagePerToolPerMonth = null, PricePerUse = 15 }
            );
        });

        // ── Subscriptions ──────────────────────────────────────────────────────
        m.Entity<Subscription>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.User).WithOne(u => u.Subscription).HasForeignKey<Subscription>(s => s.UserId);
            e.HasOne(s => s.Plan).WithMany(p => p.Subscriptions).HasForeignKey(s => s.PlanId);
        });

        // ── ToolUsageLogs ──────────────────────────────────────────────────────
        m.Entity<ToolUsageLog>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => new { l.UserId, l.ToolId, l.UsedAt });
            e.HasOne(l => l.User).WithMany(u => u.UsageLogs).HasForeignKey(l => l.UserId);
            e.Property(l => l.ToolId).HasMaxLength(64).IsRequired();
        });

        // ── ToolPurchases ──────────────────────────────────────────────────────
        m.Entity<ToolPurchase>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.User).WithMany(u => u.ToolPurchases).HasForeignKey(p => p.UserId);
            e.Property(p => p.ToolId).HasMaxLength(64).IsRequired();
            e.Property(p => p.AmountPaid).HasColumnType("decimal(10,2)");
        });

        // ── ToolResults ────────────────────────────────────────────────────────
        m.Entity<ToolResult>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => new { r.UserId, r.CreatedAt });
            e.HasOne(r => r.User).WithMany(u => u.ToolResults).HasForeignKey(r => r.UserId);
            e.Property(r => r.ToolId).HasMaxLength(64).IsRequired();
            e.Property(r => r.InputSummary).HasMaxLength(200);
        });

        // ── ToolPrices ─────────────────────────────────────────────────────────
        m.Entity<ToolPrice>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.ToolId).IsUnique();
            e.Property(p => p.ToolId).HasMaxLength(64).IsRequired();
            e.Property(p => p.ToolName).HasMaxLength(128).IsRequired();
            e.Property(p => p.PriceMonthly).HasColumnType("decimal(10,2)");

            // Seed: Trend Video ve İçerik Takvimi ₺29, diğerleri ₺9
            e.HasData(
                new ToolPrice { Id = 1,  ToolId = "gorunurluk-skoru",  ToolName = "İşletme Görünürlük Skoru",    PriceMonthly = 9,  IsActive = true },
                new ToolPrice { Id = 2,  ToolId = "musteri-persona",    ToolName = "Müşteri Persona Oluşturucu",  PriceMonthly = 9,  IsActive = true },
                new ToolPrice { Id = 3,  ToolId = "icerik-takvimi",     ToolName = "30 Günlük İçerik Takvimi",   PriceMonthly = 29, IsActive = true },
                new ToolPrice { Id = 4,  ToolId = "whatsapp-satis",     ToolName = "WhatsApp Satış Script Üretici", PriceMonthly = 9, IsActive = true },
                new ToolPrice { Id = 5,  ToolId = "reklam-butce",       ToolName = "Reklam Bütçe Dağıtıcı",      PriceMonthly = 9,  IsActive = true },
                new ToolPrice { Id = 6,  ToolId = "musteri-geri-donus", ToolName = "Müşteri Geri Dönüş Senaryosu", PriceMonthly = 9, IsActive = true },
                new ToolPrice { Id = 7,  ToolId = "rakip-analiz",       ToolName = "Rakip Analiz Panosu",         PriceMonthly = 9,  IsActive = true },
                new ToolPrice { Id = 8,  ToolId = "chatbot-senaryo",    ToolName = "Chatbot Senaryo Hazırlayıcı", PriceMonthly = 9,  IsActive = true },
                new ToolPrice { Id = 9,  ToolId = "ai-gorunurluk",      ToolName = "AI Görünürlük Takipçisi",     PriceMonthly = 9,  IsActive = true },
                new ToolPrice { Id = 10, ToolId = "viral-video",        ToolName = "Viral Video Uyarlayıcı",      PriceMonthly = 9,  IsActive = true },
                new ToolPrice { Id = 11, ToolId = "trend-video",        ToolName = "Trend Video Bulucu",          PriceMonthly = 29, IsActive = true }
            );
        });

        // ── PaymentOrders ──────────────────────────────────────────────────────
        m.Entity<PaymentOrder>(e =>
        {
            e.HasKey(o => o.Id);
            e.HasIndex(o => o.ConversationId).IsUnique();
            e.HasIndex(o => o.IyzicoToken);
            e.HasOne(o => o.User).WithMany().HasForeignKey(o => o.UserId);
            // PlanId nullable — tekil araç ödemelerinde null
            e.HasOne(o => o.Plan).WithMany().HasForeignKey(o => o.PlanId).IsRequired(false);
            e.Property(o => o.Amount).HasColumnType("decimal(10,2)");
            e.Property(o => o.ConversationId).HasMaxLength(64).IsRequired();
            e.Property(o => o.IyzicoToken).HasMaxLength(256);
            e.Property(o => o.IyzicoPaymentId).HasMaxLength(64);
            e.Property(o => o.ToolId).HasMaxLength(64);
        });
    }
}
