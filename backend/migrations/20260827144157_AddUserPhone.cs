using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KolayKobi.Api.migrations
{
    /// <summary>
    /// Users tablosuna isteğe bağlı Phone sütunu ekler (kayıt formunda toplanır).
    ///
    /// NOT: EF bu migration'ı üretirken iki ALAKASIZ işlem daha ekliyordu ve
    /// bunlar elle çıkarıldı:
    ///   1) ToolPurchases.AutoRenew sütunundaki veritabanı varsayılanının
    ///      (DEFAULT true) düşürülmesi — modelde HasDefaultValue tanımı yok,
    ///      canlı veritabanında ise varsayılan mevcut. Uygulama her INSERT'te
    ///      değeri açıkça gönderdiği için varsayılanı düşürmenin faydası yok,
    ///      riski var.
    ///   2) ToolPrices.UpdatedAt seed damgalarının yeniden yazılması — seed
    ///      DateTime.UtcNow kullandığı için her migration'da değişiyor;
    ///      uygulanması admin panelindeki gerçek "son güncelleme" bilgisini siler.
    /// </summary>
    public partial class AddUserPhone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Users");
        }
    }
}
