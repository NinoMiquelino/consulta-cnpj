document.addEventListener('DOMContentLoaded', () => {
    // 1. Seleção de Elementos CNPJ
    const cnpjInput = document.getElementById('cnpj');
    const btnBuscarCnpj = document.getElementById('btn-buscar-cnpj');
    
    // Campos de Resultado
    const nomeInput = document.getElementById('nome');
    const fantasiaInput = document.getElementById('fantasia');
    const situacaoInput = document.getElementById('situacao');
    const logradouroInput = document.getElementById('logradouro');
    const numeroInput = document.getElementById('numero');
    const bairroInput = document.getElementById('bairro');
    const municipioInput = document.getElementById('municipio');
    const ufInput = document.getElementById('uf');

    // Elementos de Feedback e Seleção
    const erroMsg = document.getElementById('erro-msg');
    const loadingIcon = document.getElementById('loading-icon');
    const radioButtons = document.querySelectorAll('input[name="consulta-method"]');


    // Funções de UX (Mantidas)
    const limparCamposResultado = () => {
        nomeInput.value = '';
        fantasiaInput.value = '';
        situacaoInput.value = '';
        logradouroInput.value = '';
        numeroInput.value = '';
        bairroInput.value = '';
        municipioInput.value = '';
        ufInput.value = '';
    };

    const exibirErro = (mensagem) => {
        limparCamposResultado();
        erroMsg.textContent = mensagem;
        erroMsg.style.display = 'block';
        cnpjInput.classList.add('is-invalid');
    };

    const ocultarErro = () => {
        erroMsg.style.display = 'none';
        cnpjInput.classList.remove('is-invalid');
    };
    
    // Funcao para preencher os campos com o resultado
    const preencherCampos = (data) => {
        nomeInput.value = data.nome || '';
        fantasiaInput.value = data.fantasia || '';
        situacaoInput.value = data.situacao || '';
        logradouroInput.value = data.logradouro || '';
        numeroInput.value = data.numero || '';
        bairroInput.value = data.bairro || '';
        municipioInput.value = data.municipio || '';
        ufInput.value = data.uf || '';
    };
    
    // =========================================================
    // 2. FUNÇÃO CALLBACK GLOBAL PARA JSONP (MÉTODO JS)
    // =========================================================
    // Esta função será chamada diretamente pela API da ReceitaWS
    window.meu_callbackcnpj = (data) => {
        loadingIcon.style.display = 'none'; 
        btnBuscarCnpj.disabled = false;
        
        if (data.status === 'ERROR') {
            const msg = data.message || 'CNPJ não encontrado ou inválido (JSONP).';
            exibirErro(msg);
        } else {
            preencherCampos(data);
        }
        
        // Remove o script dinâmico após o processamento (limpeza)
        const oldScript = document.getElementById('receitaws-script');
        if (oldScript) {
            document.head.removeChild(oldScript);
        }
    };
    // =========================================================

    // Lógica de Seleção de URL (APENAS PARA O PROXY PHP)
    const getTargetUrl = (cnpjLimpo) => {
        const selectedMethod = document.querySelector('input[name="consulta-method"]:checked').value;
        
        if (selectedMethod === 'js') {
             // Retorna a URL completa JSONP com o callback
            return `https://receitaws.com.br/v1/cnpj/${cnpjLimpo}?callback=meu_callbackcnpj`;
        } else if (selectedMethod === 'php') {
            // Consulta Via Proxy (PHP usa fetch normal)
            return `consulta_cnpj.php?cnpj=${cnpjLimpo}`;
        }
        return null;
    };
    
    // Função Principal que consulta o CNPJ
const buscarCNPJ = async (cnpj) => {
    ocultarErro();
    limparCamposResultado();
    loadingIcon.style.display = 'flex'; 
    btnBuscarCnpj.disabled = true;

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const selectedMethod = document.querySelector('input[name="consulta-method"]:checked').value;

    if (cnpjLimpo.length !== 14) {
        loadingIcon.style.display = 'none';
        btnBuscarCnpj.disabled = false;
        exibirErro('O CNPJ deve ter 14 dígitos.');
        return; 
    }

    const url = getTargetUrl(cnpjLimpo);

    if (selectedMethod === 'js') {
        // ==============================================
        // MÉTODO JSONP (CORS FIX) - REMOÇÃO DO TIMEOUT
        // ==============================================
        // Garante que qualquer script anterior seja removido antes de adicionar um novo.
        const oldScript = document.getElementById('receitaws-script');
        if (oldScript) {
            document.head.removeChild(oldScript);
        }

        const script = document.createElement('script');
        script.src = url;
        script.id = 'receitaws-script';
        document.head.appendChild(script);
        
        // Adiciona um listener para erros de rede na tag script (embora menos confiável para JSONP)
        script.onerror = () => {
            // Se houver um erro de rede ou o script não carregar
            window.meu_callbackcnpj({ 
                status: 'ERROR', 
                message: 'Erro de rede ou falha ao carregar script JSONP.' 
            });
        };

        // O resultado é tratado pela função global window.meu_callbackcnpj
        // O mecanismo de timeout interno do navegador será usado, se necessário.
        // ==============================================

    } else if (selectedMethod === 'php') {
        // ... (MÉTODO FETCH/PROXY PHP permanece inalterado) ...
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok || data.status === 'ERROR') {
                const msg = data.message || 'Erro na comunicação via Proxy PHP.';
                exibirErro(msg);
                return;
            }

            preencherCampos(data);
            
        } catch (error) {
            console.error('Erro ao buscar o CNPJ via PHP:', error);
            exibirErro('Erro de rede ou comunicação com o proxy PHP.');
        } finally {
            loadingIcon.style.display = 'none'; 
            btnBuscarCnpj.disabled = false;
        }
    }
};

    // Event Listener: Acionamento pelo botão
    btnBuscarCnpj.addEventListener('click', () => {
        buscarCNPJ(cnpjInput.value);
    });
    
    // Event Listener: Acionamento por ENTER no campo CNPJ
    cnpjInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            buscarCNPJ(cnpjInput.value);
        }
    });

    // Event Listener: Máscara e Limpeza de Erro
    cnpjInput.addEventListener('input', (event) => {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length > 12) {
            value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
        } else if (value.length > 8) {
            value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
        } else if (value.length > 5) {
            value = value.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
        }
        event.target.value = value;
        
        if (cnpjInput.classList.contains('is-invalid')) {
            ocultarErro();
        }
    });
    
    // Limpar campos ao trocar o método de consulta
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            ocultarErro();
            limparCamposResultado();
            cnpjInput.value = ''; 
        });
    });
});