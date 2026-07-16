<?php
/**
 * Kolay KOBİ — AI Araçları n8n Proxy
 *
 * Tarayıcıdan n8n'e doğrudan yapılan uzun istekler bazı ağlarda (ISS/DPI,
 * antivirüs, Akamai/CDN gateway timeout'u) kesintiye uğruyor. Bu snippet,
 * istekleri aynı origin üzerinden (kolaykobi.com) alıp n8n'e sunucu
 * tarafında iletir.
 *
 * Kurulum: Code Snippets eklentisine yeni snippet olarak ekleyin (Run everywhere)
 * veya temanın functions.php dosyasının sonuna yapıştırın (<?php satırı hariç).
 *
 * SENKRON kullanım (eski, kısa süren araçlar için hâlâ geçerli):
 *   POST https://kolaykobi.com/wp-json/kolaykobi/v1/ai/{tool}
 *   body: {"prompt": "..."}
 *
 * ASENKRON kullanım (job/polling — uzun süren araçlar için, ör. takvim):
 *   POST https://kolaykobi.com/wp-json/kolaykobi/v1/ai/{tool}/start
 *     body: {"prompt": "..."}  →  {"job_id": "...", "status": "pending"}
 *   GET  https://kolaykobi.com/wp-json/kolaykobi/v1/ai/{tool}/status/{job_id}
 *     →  {"status": "pending" | "completed" | "error" | "not_found", ...}
 *
 * Bu iki uç, n8n tarafında AYNI webhook path'ine (tool adına karşılık gelen)
 * POST ile, durum sorgusu için ise "{webhook-path}-status" adlı ikinci bir
 * GET webhook'a gider — n8n workflow'unun bunu desteklemesi gerekir
 * (bkz. n8n-workflows/kolay-kobi-takvim-async.json örneği).
 */

add_action('rest_api_init', function () {
    register_rest_route('kolaykobi/v1', '/ai/(?P<tool>[a-z0-9-]+)', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'kolaykobi_ai_proxy',
    ));

    register_rest_route('kolaykobi/v1', '/ai/(?P<tool>[a-z0-9-]+)/start', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'kolaykobi_ai_job_start',
    ));

    register_rest_route('kolaykobi/v1', '/ai/(?P<tool>[a-z0-9-]+)/status/(?P<job_id>[a-z0-9]+)', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'kolaykobi_ai_job_status',
    ));
});

// n8n'deki her tool webhook'unun ADI (path). Senkron ve asenkron uçlar
// aynı webhook path'i paylaşır — asenkron/senkron ayrımını n8n workflow'unun
// kendisi (responseMode + arka planda devam eden node zinciri) belirler.
function kolaykobi_ai_tool_map() {
    return array(
        'geri-donus' => 'kolay-kobi-geri-donus',
        'chatbot'    => 'kolay-kobi-chatbot',
        'takvim'     => 'kolay-kobi-takvim',
        'rakip'      => 'kolay-kobi-rakip',
        'butce'      => 'kolay-kobi-butce',
        'wa'         => 'kolay-kobi-wa',
        'persona'    => 'kolay-kobi-persona',
        'skor'       => 'kolay-kobi-skor',
    );
}

// job_id'nin n8n workflow koduyla aynı karakter kümesinden ([a-z0-9], 24
// karakter) geldiğini doğrular — proxy üzerinden n8n'e keyfi path/query
// enjekte edilmesini engeller.
function kolaykobi_is_valid_job_id($job_id) {
    return is_string($job_id) && preg_match('/^[a-z0-9]{8,64}$/', $job_id) === 1;
}

// Asenkron akışın 1. adımı: n8n'in job-başlatma webhook'unu TETİKLER ama
// n8n bu uçta HEMEN (1-2sn içinde) job_id ile yanıt verdiği için burada
// kısa bir timeout yeterli — Akamai/CDN gateway timeout'una hiç yaklaşmıyoruz.
function kolaykobi_ai_job_start(WP_REST_Request $request) {
    $tools = kolaykobi_ai_tool_map();
    $tool = $request->get_param('tool');
    if (!isset($tools[$tool])) {
        return new WP_REST_Response(array('error' => 'Bilinmeyen araç'), 404);
    }

    $prompt = $request->get_json_params()['prompt'] ?? '';
    if (!is_string($prompt) || $prompt === '' || strlen($prompt) > 20000) {
        return new WP_REST_Response(array('error' => 'Geçersiz prompt'), 400);
    }

    $response = wp_remote_post(
        'https://n8n.srv1492396.hstgr.cloud/webhook/' . $tools[$tool],
        array(
            'timeout' => 15,
            'headers' => array('Content-Type' => 'application/json'),
            'body'    => wp_json_encode(array('prompt' => $prompt)),
        )
    );

    if (is_wp_error($response)) {
        return new WP_REST_Response(array('error' => $response->get_error_message()), 502);
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    return new WP_REST_Response($body ?: array('error' => 'Boş yanıt'), $code ?: 502);
}

// Asenkron akışın 2. adımı: tarayıcı bunu her birkaç saniyede bir çağırıp
// job'un durumunu sorar. n8n'in durum webhook'u da hızlı yanıt verdiği için
// (staticData'dan okuma, AI çağrısı yok) kısa timeout yeterli.
function kolaykobi_ai_job_status(WP_REST_Request $request) {
    $tools = kolaykobi_ai_tool_map();
    $tool = $request->get_param('tool');
    $job_id = $request->get_param('job_id');

    if (!isset($tools[$tool])) {
        return new WP_REST_Response(array('error' => 'Bilinmeyen araç'), 404);
    }
    if (!kolaykobi_is_valid_job_id($job_id)) {
        return new WP_REST_Response(array('error' => 'Geçersiz job_id'), 400);
    }

    $response = wp_remote_get(
        'https://n8n.srv1492396.hstgr.cloud/webhook/' . $tools[$tool] . '-status?jobId=' . rawurlencode($job_id),
        array('timeout' => 15)
    );

    if (is_wp_error($response)) {
        return new WP_REST_Response(array('error' => $response->get_error_message()), 502);
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    return new WP_REST_Response($body ?: array('error' => 'Boş yanıt'), $code ?: 502);
}

function kolaykobi_ai_proxy(WP_REST_Request $request) {
    // Reasoning modelinin uzun süren isteklerinde PHP'nin varsayılan
    // max_execution_time'ı (genelde 30-60s) wp_remote_post'un timeout
    // parametresini beklemeden süreci öldürmesin diye yükseltiyoruz.
    if (function_exists('set_time_limit')) {
        @set_time_limit(340);
    }

    // İzin verilen n8n webhook'ları — tool adı → webhook path
    $tools = array(
        'geri-donus' => 'kolay-kobi-geri-donus',
        'chatbot'    => 'kolay-kobi-chatbot',
        'takvim'     => 'kolay-kobi-takvim',
        'rakip'      => 'kolay-kobi-rakip',
        'butce'      => 'kolay-kobi-butce',
        'wa'         => 'kolay-kobi-wa',
        'persona'    => 'kolay-kobi-persona',
        'skor'       => 'kolay-kobi-skor',
    );

    $tool = $request->get_param('tool');
    if (!isset($tools[$tool])) {
        return new WP_REST_Response(array('error' => 'Bilinmeyen araç'), 404);
    }

    $prompt = $request->get_json_params()['prompt'] ?? '';
    if (!is_string($prompt) || $prompt === '' || strlen($prompt) > 20000) {
        return new WP_REST_Response(array('error' => 'Geçersiz prompt'), 400);
    }

    $response = wp_remote_post(
        'https://n8n.srv1492396.hstgr.cloud/webhook/' . $tools[$tool],
        array(
            'timeout' => 320,
            'headers' => array('Content-Type' => 'application/json'),
            'body'    => wp_json_encode(array('prompt' => $prompt)),
        )
    );

    if (is_wp_error($response)) {
        return new WP_REST_Response(array('error' => $response->get_error_message()), 502);
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    return new WP_REST_Response($body ?: array('error' => 'Boş yanıt'), $code ?: 502);
}
