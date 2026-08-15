-- ══════════════════════════════════════════════════════════════════════════════
-- KolayKOBİ DB Düzeltme — 15 Ağustos 2026
-- Uygulama: psql -U postgres -d kolaykobi -f db-fix-2026-08-15.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. "test test" kullanıcısı — Premium ExpiresAt BUGÜNE çek (yenileme testi için) ─────
-- (14.08.2026'dan 15.08.2026 23:59 UTC'ye alıyoruz, renewal service bugün çalışınca yakalar)
UPDATE "Subscriptions"
SET
    "ExpiresAt" = '2026-08-15 23:59:59Z',
    "Status"    = 1   -- 1 = Active (renewal service sadece Active olanları işler)
WHERE "UserId" = (
    SELECT "Id" FROM "AspNetUsers"
    WHERE "NormalizedEmail" LIKE '%TEST%'
    ORDER BY "CreatedAt" DESC
    LIMIT 1
)
AND "Status" IN (0, 1, 2);   -- Pending / Active / Paused hepsini yakala

-- Kaç satır güncellendi kontrol et
DO $$
BEGIN
    RAISE NOTICE 'test test user Subscription updated (rows: %)',
        (SELECT COUNT(*) FROM "Subscriptions" s
         JOIN "AspNetUsers" u ON u."Id" = s."UserId"
         WHERE u."NormalizedEmail" LIKE '%TEST%'
           AND s."ExpiresAt" = '2026-08-15 23:59:59Z');
END $$;

-- ── 2. Yanlış yenileme PaymentOrders'ını düzelt ──────────────────────────────
-- Sorun: 2 ayrı kayıt, her biri ₺31,33 (₺94/3 bölmesiyle oluşturulmuş)
-- Düzeltme: İlk kaydı birleşik (toolIds JSON + doğru toplam) yapıyoruz,
--           ikinci kaydı siliyoruz.
--
-- Önce mevcut hatalı kayıtları listele (opsiyonel doğrulama):
-- SELECT id, "ToolId", "ToolIds", "Amount", "CreatedAt"
-- FROM "PaymentOrders"
-- WHERE "Amount" = 31.33
--   AND "IyzicoToken" = 'AUTO-RENEW'
--   AND "CreatedAt"::date = '2026-08-15';

-- Hatalı 2 kaydın Id'lerini bul ve düzelt
DO $$
DECLARE
    v_first_id  UUID;
    v_second_id UUID;
    v_user_id   UUID;
BEGIN
    -- Bugün oluşturulan, tutarı ~31.33 olan AUTO-RENEW araç kayıtlarını al
    SELECT id, "UserId"
    INTO v_first_id, v_user_id
    FROM "PaymentOrders"
    WHERE "IyzicoToken" = 'AUTO-RENEW'
      AND "CreatedAt"::date = '2026-08-15'
      AND "Amount" BETWEEN 30 AND 33
      AND "ToolId" IS NOT NULL
    ORDER BY "CreatedAt" ASC
    LIMIT 1;

    IF v_first_id IS NULL THEN
        RAISE NOTICE 'Düzeltilecek yanlış kayıt bulunamadı (zaten düzeltilmiş olabilir).';
        RETURN;
    END IF;

    SELECT id
    INTO v_second_id
    FROM "PaymentOrders"
    WHERE "IyzicoToken" = 'AUTO-RENEW'
      AND "CreatedAt"::date = '2026-08-15'
      AND "Amount" BETWEEN 30 AND 33
      AND "ToolId" IS NOT NULL
      AND id != v_first_id
    ORDER BY "CreatedAt" ASC
    LIMIT 1;

    RAISE NOTICE 'Birinci kayıt: %, İkinci kayıt: %', v_first_id, v_second_id;

    -- İlk kaydı birleşik hale getir: toolIds JSON + doğru toplam
    UPDATE "PaymentOrders"
    SET
        "ToolIds"    = '["musteri-persona","icerik-takvimi"]',
        "ToolId"     = NULL,
        "Amount"     = 76.00,     -- ₺18 + ₺58 = ₺76 (gerçek bireysel fiyatlar)
        "UsesPerTool" = 25
    WHERE id = v_first_id;

    RAISE NOTICE 'İlk kayıt güncellendi: %', v_first_id;

    -- İkinci kaydı sil (birleşik kayda dahil edildi)
    IF v_second_id IS NOT NULL THEN
        DELETE FROM "PaymentOrders" WHERE id = v_second_id;
        RAISE NOTICE 'İkinci kayıt silindi: %', v_second_id;
    END IF;

    -- İlgili yanlış ToolPurchase AmountPaid'lerini de düzelt
    -- (renewal ile oluşan yeni ToolPurchases — 15 Ağustos 2026)
    UPDATE "ToolPurchases"
    SET "AmountPaid" = 18.00
    WHERE "UserId" = v_user_id
      AND "ToolId" = 'musteri-persona'
      AND "PurchasedAt"::date = '2026-08-15'
      AND "IyzicoPaymentId" LIKE 'AR-TOOL-%';

    UPDATE "ToolPurchases"
    SET "AmountPaid" = 58.00
    WHERE "UserId" = v_user_id
      AND "ToolId" = 'icerik-takvimi'
      AND "PurchasedAt"::date = '2026-08-15'
      AND "IyzicoPaymentId" LIKE 'AR-TOOL-%';

    RAISE NOTICE 'ToolPurchase AmountPaid değerleri düzeltildi.';
END $$;

COMMIT;

-- ── Doğrulama sorguları ───────────────────────────────────────────────────────
-- Çalıştırmak için aşağıdaki SELECT'leri kopyalayıp ayrı çalıştırın:

-- 1) test test kullanıcısı abonelik durumu:
-- SELECT u."Email", s."Status", s."ExpiresAt", s."AutoRenew"
-- FROM "Subscriptions" s
-- JOIN "AspNetUsers" u ON u."Id" = s."UserId"
-- WHERE u."NormalizedEmail" LIKE '%TEST%';

-- 2) Düzeltilmiş ödeme kaydı:
-- SELECT id, "ToolId", "ToolIds", "Amount", "UsesPerTool", "CreatedAt"
-- FROM "PaymentOrders"
-- WHERE "CreatedAt"::date = '2026-08-15'
--   AND "IyzicoToken" = 'AUTO-RENEW'
-- ORDER BY "CreatedAt";
