using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.migrations
{
    /// <inheritdoc />
    public partial class AddToolResultFormBilgileri : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FormBilgileri",
                table: "ToolResults",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(8640));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 2,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "ToolName", "UpdatedAt" },
                values: new object[] { "Sosyal Medya İçerik Takvimi", new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120) });

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 4,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 5,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 6,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 7,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 8,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 9,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 10,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9120));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 11,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 25, 17, 22, 36, 228, DateTimeKind.Utc).AddTicks(9140));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FormBilgileri",
                table: "ToolResults");

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(5610));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 2,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "ToolName", "UpdatedAt" },
                values: new object[] { "30 Günlük İçerik Takvimi", new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060) });

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 4,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 5,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 6,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 7,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 8,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 9,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 10,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 11,
                column: "UpdatedAt",
                value: new DateTime(2026, 9, 9, 19, 29, 53, 0, DateTimeKind.Utc).AddTicks(6060));
        }
    }
}
