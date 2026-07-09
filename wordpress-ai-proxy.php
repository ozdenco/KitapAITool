<?php
/**
 * Kolay KOBİ — AI Araçları n8n Proxy
 *
 * Tarayıcıdan n8n'e doğrudan yapılan uzun istekler bazı ağlarda (ISS/DPI,
 * antivirüs) kesintiye uğruyor. Bu snippet, istekleri aynı origin üzerinden
 * (kolaykobi.com) alıp n8n'e sunucu tarafında iletir.
 *
 * Kurulum: Code Snippets eklentisine yeni snippet olarak ekleyin (Run everywhere)
 * veya temanın functions.php dosyasının sonuna yapıştırın (<?php satırı hariç).
 *
 * Kullanım: POST https://kolaykobi.com/wp-json/kolaykobi/v1/ai/{tool}
 *   body: {"prompt": "..."}
 */

add_action('rest_api_init', function () {
    register_rest_route('kolaykobi/v1', '/ai/(?P<tool>[a-z0-9-]+)', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'kolaykobi_ai_proxy',
    ));
});

function kolaykobi_ai_proxy(WP_REST_Request $request) {
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
            'timeout' => 180,
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
