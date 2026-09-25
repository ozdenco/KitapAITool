# Medya servisi — ffmpeg + küçük bir Node HTTP sunucusu.
#
# Bağımlılık YOK: sunucu yalnızca Node'un yerleşik modüllerini kullanıyor
# (http, child_process, fs, crypto). npm install adımı ve node_modules yok,
# imaj küçük kalıyor ve güncellenecek paket yüzeyi oluşmuyor.
FROM node:22-alpine

# ffmpeg birleştirme (-c copy) ve kare çıkarma için; ffprobe teşhis için işe yarıyor
#
# ttf-dejavu: hook metnini videoya basmak için (drawtext). Alpine'da varsayılan
# olarak Türkçe karakter içeren bir yazı tipi YOK; ş, ğ, ı, İ, ç, ö, ü kutucuk
# olarak çıkardı. DejaVu Sans bu karakterlerin tamamını içeriyor.
RUN apk add --no-cache ffmpeg ttf-dejavu

WORKDIR /uygulama
COPY sunucu.js ./

# Çıktı ve geçici dizinler — compose'ta kalıcı birim bağlanıyor
RUN mkdir -p /veri/cikti /veri/gecici

ENV PORT=8080 \
    CIKTI_DIZINI=/veri/cikti \
    GECICI_DIZINI=/veri/gecici

EXPOSE 8080

# Kök olmayan kullanıcı — node imajında hazır gelen 'node' kullanıcısı
RUN chown -R node:node /veri /uygulama
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8080/saglik || exit 1

CMD ["node", "sunucu.js"]
