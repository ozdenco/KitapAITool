using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAutoRenewAndToolPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentOrders_Plans_PlanId",
                table: "PaymentOrders");

            migrationBuilder.AddColumn<bool>(
                name: "AutoRenew",
                table: "Subscriptions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<int>(
                name: "PlanId",
                table: "PaymentOrders",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "ToolId",
                table: "PaymentOrders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

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

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentOrders_Plans_PlanId",
                table: "PaymentOrders",
                column: "PlanId",
                principalTable: "Plans",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentOrders_Plans_PlanId",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "AutoRenew",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "ToolId",
                table: "PaymentOrders");

            migrationBuilder.AlterColumn<int>(
                name: "PlanId",
                table: "PaymentOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 630, DateTimeKind.Utc).AddTicks(9750));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 2,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(200));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 3,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(210));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 4,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(210));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 5,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(210));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 6,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(220));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 7,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 8,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 9,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 10,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230));

            migrationBuilder.UpdateData(
                table: "ToolPrices",
                keyColumn: "Id",
                keyValue: 11,
                column: "UpdatedAt",
                value: new DateTime(2026, 8, 12, 19, 17, 48, 631, DateTimeKind.Utc).AddTicks(230));

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentOrders_Plans_PlanId",
                table: "PaymentOrders",
                column: "PlanId",
                principalTable: "Plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
