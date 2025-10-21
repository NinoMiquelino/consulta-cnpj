<?php
// Define o fuso horário
date_default_timezone_set('America/Sao_Paulo');

// Configura os cabeçalhos para CORS e JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Inicializa variáveis
$response_data = [];
$http_status_code = 200;

try {
    // 1. Coleta e Limpa o CNPJ
    $cnpj = isset($_REQUEST['cnpj']) ? $_REQUEST['cnpj'] : '';
    $cnpj_limpo = preg_replace('/[^0-9]/', '', $cnpj);

    // 2. Validação Simples
    if (empty($cnpj_limpo) || strlen($cnpj_limpo) !== 14) {
        $http_status_code = 400; // Bad Request
        throw new Exception('CNPJ inválido ou não fornecido: ' . $cnpj);
    }

    // 3. Monta a URL da ReceitaWS
    // NOTA: A ReceitaWS é gratuita, mas limitada a 3 consultas por minuto.
    $url_receita = "https://receitaws.com.br/v1/cnpj/{$cnpj_limpo}";

    // 4. Configuração e Execução da Requisição cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url_receita);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Timeout de 10 segundos

    $response_receita = curl_exec($ch);
    
    // Verifica se houve erro de cURL (ex: falha de rede)
    if (curl_errno($ch)) {
        $curl_error = curl_error($ch);
        $http_status_code = 503; // Service Unavailable
        curl_close($ch);
        throw new Exception("Erro de cURL na comunicação com a ReceitaWS: " . $curl_error);
    }

    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // 5. Verifica o status HTTP da ReceitaWS
    if ($http_code !== 200) {
        // Se a API retornar um status de erro (ex: 404, 429 - Too Many Requests)
        $http_status_code = $http_code;
        throw new Exception("ReceitaWS retornou status HTTP: {$http_code}. CNPJ: {$cnpj_limpo}");
    }

    // 6. Decodifica a Resposta
    $data_receita = json_decode($response_receita, true);

    // 7. Verifica erros de negócio da ReceitaWS (Ex: CNPJ Inexistente ou Limite Excedido)
    if (isset($data_receita['status']) && $data_receita['status'] === 'ERROR') {
        // Usa o status e a mensagem fornecida pela API. Ex: 'CNPJ inválido'
        $http_status_code = 400; 
        $message = $data_receita['message'] ?? 'CNPJ não encontrado ou inválido.';
        $response_data = ['status' => 'ERROR', 'message' => $message];
        
        // Registra o erro de negócio, mas não como um erro fatal do sistema
        error_log("ERRO CNPJ BUSINESS: {$message}. CNPJ: {$cnpj_limpo}");
    } else {
        // Sucesso: Retorna os dados
        $response_data = $data_receita;
    }

} catch (Exception $e) {
    // Se ocorrer uma exceção (throw), registra e prepara a resposta de erro
    $error_message = $e->getMessage();
    
    error_log("ERRO CNPJ PROXY ({$http_status_code}): {$error_message}");

    // Prepara a resposta de erro para o Frontend (se ainda não tiver sido definida)
    if (empty($response_data) || $http_status_code >= 500) {
        $response_data = [
            'status' => 'ERROR', 
            'message' => 'Erro interno na busca de CNPJ. Verifique o log do servidor.'
        ];
    }
}

// 8. Envia o código de status HTTP e a resposta JSON para o frontend
http_response_code($http_status_code);
echo json_encode($response_data);
?>
