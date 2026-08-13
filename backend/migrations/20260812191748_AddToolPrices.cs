using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace KolayKobi.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddToolPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ToolPrices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ToolId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ToolName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PriceMonthly = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolPrices", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "ToolPrices",
                columns: new[] { "Id", "IsActive", "PriceMonthly", "ToolId", "ToolName", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, true, 9m, "gorunurluk-skoru", "İşletme Görünürlük Skoru", new DateTime(2026, 8, 12, 19, 17, 48, 630, DateTimeKind.Utc).AddTicks(9750) },
                    { 2, true, 9m, "musteri-persona", "Müşteri Persona Oluşturucu", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(200) },
                    { 3, true, 29m, "icerik-takvimi", "30 Günlük İçerik Takvimi", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(210) },
                    { 4, true, 9m, "whatsapp-satis", "WhatsApp Satış Script Üretici", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(210) },
                    { 5, true, 9m, "reklam-butce", "Reklam Bütçe Dağıtıcı", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(210) },
                    { 6, true, 9m, "musteri-geri-donus", "Müşteri Geri Dönüş Senaryosu", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(220) },
                    { 7, true, 9m, "rakip-analiz", "Rakip Analiz Panosu", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230) },
                    { 8, true, 9m, "chatbot-senaryo", "Chatbot Senaryo Hazırlayıcı", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230) },
                    { 9, true, 9m, "ai-gorunurluk", "AI Görünürlük Takipçisi", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230) },
                    { 10, true, 9m, "viral-video", "Viral Video Uyarlayıcı", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230) },
                    { 11, true, 29m, "trend-video", "Trend Video Bulucu", new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ToolPrices_ToolId",
                table: "ToolPrices",
                column: "ToolId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ToolPrices");
        }
    }
}
