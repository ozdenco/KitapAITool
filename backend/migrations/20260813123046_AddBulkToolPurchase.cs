using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.migrations
{
    /// <inheritdoc />
    public partial class AddBulkToolPurchase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MonthlyLimit",
                table: "ToolPurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ToolIds",
                table: "PaymentOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UsesPerTool",
                table: "PaymentOrders",
                type: "integer",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(2940));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 2,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 3,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 4,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 5,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 6,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 7,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 8,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 9,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 10,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 11,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 12, 30, 46, 521, DateTimeKind.Utc).AddTicks(3430));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MonthlyLimit",
                table: "ToolPurchases");

            migrationBuilder.DropColumn(
                name: "ToolIds",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "UsesPerTool",
                table: "PaymentOrders");

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7040));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 2,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 3,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 4,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 5,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 6,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 7,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 8,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 9,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 10,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 11,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 13, 11, 1, 53, 335, DateTimeKind.Utc).AddTicks(7470));
        }
    }
}
