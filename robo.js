const qrcode = require("qrcode-terminal")
const { Client, MessageMedia } = require("whatsapp-web.js")
const fs = require("fs")
const path = require("path")
const client = new Client()

// Armazenamento de dados (em produção, use um banco de dados)
let usuarios = {}
let pedidos = {}
let conversas = {}
let atendentesAtivos = {}; // Novo: { "atendenteId": "conversationId" }

// Configurações da farmácia
const FARMACIA_CONFIG = {
  nome: "Farmácia Rocha",
  endereco: "Povoado de Raspador, Praça do mercado - Ribeira do Amparo - BA",
  telefone: "(81) 9850-8538",
  horarios: {
    segunda_sabado: "08:00 às 12:00 e 14:00 às 18:30",
  },
  entrega: {
    taxa: "R$ 5,00",
    tempo: "30 a 60 minutos",
    raio: "5km",
  },
  atendentes: [
    "5511947015576@c.us", // Substitua pelos números reais dos atendentes
    // Adicione mais atendentes aqui, ex: "5521987654321@c.us"
  ],
  // NOVO: Mapeamento de IDs de atendentes para seus nomes
  nomesAtendentes: {
    "5511947015576@c.us": "Alvaro", // Exemplo: "ID_DO_ATENDENTE@c.us": "Nome do Atendente"
    // Adicione outros atendentes aqui conforme necessário
  },
}

// Estados da conversa
const ESTADOS = {
  INICIAL: "inicial",
  MENU_PRINCIPAL: "menu_principal",
  CADASTRO: "cadastro",
  PEDIDO: "pedido",
  ENTREGA_RETIRADA: "entrega_retirada",
  FINALIZANDO: "finalizando",
  AGUARDANDO_ATENDENTE: "aguardando_atendente",
  VISUALIZANDO_INFO: "visualizando_info",
}

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true })
  console.log("Escaneie o QR Code para conectar o WhatsApp")
})

client.on("ready", () => {
  console.log("🤖 Bot da Farmácia Rocha conectado e funcionando!")
  carregarDados()
  // Inicia a verificação de sessões inativas a cada 10 minutos
  setInterval(checkInactiveSessions, 10 * 60 * 1000); 
})

client.initialize()

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

// Função para obter saudação baseada no horário
function obterSaudacao() {
  const hora = new Date().getHours()
  if (hora >= 6 && hora < 12) return "Bom dia"
  if (hora >= 12 && hora < 18) return "Boa tarde"
  return "Boa noite"
}

// Função para verificar se a farmácia está aberta
function isFarmaciaOpen() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // A farmácia funciona de Segunda a Sábado (1 a 6)
  if (dayOfWeek === 0) { // Domingo
    return false;
  }

  // Horários de funcionamento: "08:00 às 12:00 e 14:00 às 18:30"
  const parseTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
  };

  const [period1, period2] = FARMACIA_CONFIG.horarios.segunda_sabado.split(' e ');
  const [start1Str, end1Str] = period1.split(' às ');
  const [start2Str, end2Str] = period2.split(' às ');

  const start1 = parseTime(start1Str);
  const end1 = parseTime(end1Str);
  const start2 = parseTime(start2Str);
  const end2 = parseTime(end2Str);
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Verifica se está dentro do primeiro período
  const isOpenInPeriod1 = currentTimeInMinutes >= start1 && currentTimeInMinutes <= end1;
  // Verifica se está dentro do segundo período
  const isOpenInPeriod2 = currentTimeInMinutes >= start2 && currentTimeInMinutes <= end2;

  return isOpenInPeriod1 || isOpenInPeriod2;
}


// Função para salvar dados
function salvarDados() {
  try {
    fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2))
    fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2))
    fs.writeFileSync("conversas.json", JSON.stringify(conversas, null, 2))
    fs.writeFileSync("atendentesAtivos.json", JSON.stringify(atendentesAtivos, null, 2)) // Salvar atendentes ativos
  } catch (error) {
    console.error("Erro ao salvar dados:", error)
  }
}

// Função para carregar dados
function carregarDados() {
  try {
    if (fs.existsSync("usuarios.json")) {
      usuarios = JSON.parse(fs.readFileSync("usuarios.json", "utf8"))
    }
    if (fs.existsSync("pedidos.json")) {
      pedidos = JSON.parse(fs.readFileSync("pedidos.json", "utf8"))
    }
    if (fs.existsSync("conversas.json")) {
      conversas = JSON.parse(fs.readFileSync("conversas.json", "utf8"))
    }
    if (fs.existsSync("atendentesAtivos.json")) { // Carregar atendentes ativos
      atendentesAtivos = JSON.parse(fs.readFileSync("atendentesAtivos.json", "utf8"))
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error)
  }
}

// Função para inicializar conversa
function inicializarConversa(userId) {
  if (!conversas[userId]) {
    conversas[userId] = {
      estado: ESTADOS.INICIAL,
      dadosTemporarios: {},
      ultimaInteracao: new Date().toISOString(),
      atendenteRespondeuPrimeiraVez: false, // Flag para primeira resposta do atendente
      atendimentoStartTime: null, // NOVO: Timestamp para controle de timeout
      linkedPedidoId: null, // NOVO: Para vincular atendimento a um pedido específico
    }
  }
  return conversas[userId]
}

// Função para enviar menu principal
async function enviarMenuPrincipal(msg, nomeUsuario) {
  const chat = await msg.getChat()
  await delay(1000)
  await chat.sendStateTyping()
  await delay(2000)
  const menuText = `🏥 *${FARMACIA_CONFIG.nome}* 🏥

Olá ${nomeUsuario}! Como posso ajudá-lo hoje?

*📋 MENU PRINCIPAL:*

*1️⃣* - 🛒 Fazer Pedido
*2️⃣* - 👤 Meus Dados / Cadastro
*3️⃣* - 🕒 Horários de Funcionamento
*4️⃣* - 🚚 Informações sobre Entrega
*5️⃣* - 📍 Localização da Farmácia
*6️⃣* - 👨‍⚕️ Falar com Atendente

Digite o número da opção desejada ou digite *menu* para ver este menu novamente.`
  await client.sendMessage(msg.from, menuText)
}

// Função para enviar mensagem de comando não entendido
async function enviarMensagemComandoNaoEntendido(msg) {
  await client.sendMessage(
    msg.from,
    "❌ Comando não entendido. Digite *menu* para voltar ao menu principal."
  )
}

// Função para processar cadastro
async function processarCadastro(msg, conversa) {
  const chat = await msg.getChat()
  const userId = msg.from // Este é o ID do WhatsApp, que contém o número do telefone
  
  if (!conversa.dadosTemporarios.etapaCadastro) {
    conversa.dadosTemporarios.etapaCadastro = "nome"
    await delay(1000)
    await chat.sendStateTyping()
    await delay(1500)
    await client.sendMessage(msg.from, "👤 *CADASTRO DE USUÁRIO*\n\nPor favor, digite seu *nome completo*:")
    return
  }

  switch (conversa.dadosTemporarios.etapaCadastro) {
    case "nome":
      if (msg.body.trim().length < 2) {
        await client.sendMessage(msg.from, "⚠️ Por favor, digite um nome válido com pelo menos 2 caracteres:")
        return
      }
      conversa.dadosTemporarios.nome = msg.body
      conversa.dadosTemporarios.etapaCadastro = "confirmar_telefone"
      
      // Extrai o número de telefone do userId (ex: "5511999998888@c.us" -> "5511999998888")
      const extractedPhoneRaw = userId.split('@')[0]; 
      const phone = extractedPhoneRaw.startsWith("55") ? extractedPhoneRaw.slice(2) : extractedPhoneRaw;
      const extractedPhone = `${phone.slice(0, 2)} ${phone.slice(2, 7)} ${phone.slice(7)}`;
      await delay(1000);
      await chat.sendStateTyping();
      await delay(1500);
      await client.sendMessage(msg.from, `📱 Este é o seu número de telefone para cadastro: *${extractedPhone}*?\n\nDigite *SIM* para confirmar ou digite o número correto (com DDD):`);
      break

    case "confirmar_telefone":
      const input = msg.body.toUpperCase().trim();
      const currentPhone = userId.split('@')[0];

      if (input === "SIM") {
        conversa.dadosTemporarios.telefone = currentPhone;
        conversa.dadosTemporarios.etapaCadastro = "endereco"; // Move para o endereço
        await delay(1000);
        await chat.sendStateTyping();
        await delay(1500);
        await client.sendMessage(msg.from, "🏠 Ótimo! Agora, por favor, digite seu *endereço completo* com o máximo de detalhes possível (Rua, Número, Bairro, Complemento, Bairro, Cidade, CEP, Ponto de Referência, se houver):");
      } else {
        // O usuário forneceu um número diferente ou entrada inválida
        if (!/^\d{10,11}$/.test(msg.body.replace(/\D/g, ''))) {
          await client.sendMessage(msg.from, "⚠️ Número inválido. Por favor, digite um telefone válido (apenas números, com DDD) ou *SIM* para confirmar o número atual:");
          // Permanece na mesma etapa para pedir novamente
          // conversa.dadosTemporarios.etapaCadastro continua "confirmar_telefone"
        } else {
          conversa.dadosTemporarios.telefone = msg.body.replace(/\D/g, ''); // Salva o novo número
          conversa.dadosTemporarios.etapaCadastro = "endereco"; // Move para o endereço
          await delay(1000);
          await chat.sendStateTyping();
          await delay(1500);
          await client.sendMessage(msg.from, "🏠 Telefone atualizado! Agora, por favor, digite seu *endereço completo* com o máximo de detalhes possível (Rua, Número, Bairro, Complemento, Bairro, Cidade, CEP, Ponto de Referência, se houver):");
        }
      }
      break

    case "endereco": // Esta etapa agora lida com o endereço detalhado
      if (msg.body.trim().length < 15) { // Aumentado o comprimento mínimo para endereço detalhado
        await client.sendMessage(msg.from, "⚠️ Por favor, digite um endereço mais completo, incluindo rua, número, bairro, cidade e, se possível, CEP e ponto de referência:");
        return
      }
      conversa.dadosTemporarios.endereco = msg.body
      
      // Salvar usuário
      usuarios[userId] = {
        nome: conversa.dadosTemporarios.nome,
        telefone: conversa.dadosTemporarios.telefone, // Usa o telefone confirmado/fornecido
        endereco: conversa.dadosTemporarios.endereco,
        dataCadastro: new Date().toISOString(),
        pedidos: [],
      }
      // Limpar dados temporários
      delete conversa.dadosTemporarios.etapaCadastro
      delete conversa.dadosTemporarios.nome
      delete conversa.dadosTemporarios.telefone
      delete conversa.dadosTemporarios.endereco
      conversa.estado = ESTADOS.MENU_PRINCIPAL
      salvarDados()
      await delay(1000)
      await chat.sendStateTyping()
      await delay(2000)
      await client.sendMessage(
        msg.from,
        "✅ *Cadastro realizado com sucesso!*\n\nAgora você pode fazer pedidos e aproveitar todos os nossos serviços.",
      )
      await delay(1000)
      await enviarMenuPrincipal(msg, usuarios[userId].nome.split(" ")[0])
      break

    default:
      await enviarMensagemComandoNaoEntendido(msg)
      break
  }
}

// Função para processar pedidos
async function processarPedido(msg, conversa) {
  const chat = await msg.getChat()
  const userId = msg.from
  
  if (!usuarios[userId]) {
    conversa.estado = ESTADOS.CADASTRO
    await delay(1000)
    await chat.sendStateTyping()
    await delay(1500)
    await client.sendMessage(msg.from, "⚠️ Para fazer pedidos, primeiro preciso do seu cadastro.\n\nVamos começar?")
    await processarCadastro(msg, conversa)
    return
  }

  if (!conversa.dadosTemporarios.etapaPedido) {
    conversa.dadosTemporarios.etapaPedido = "produtos"
    conversa.dadosTemporarios.produtos = []
    await delay(1000)
    await chat.sendStateTyping()
    await delay(2000)
    await client.sendMessage(
      msg.from,
      `🛒 *FAZER PEDIDO*

Olá ${usuarios[userId].nome.split(" ")[0]}!

Digite os *medicamentos/produtos* que deseja, um por linha.

*Exemplo:*
Dipirona 500mg - 1 caixa
Vitamina C - 2 frascos
Protetor solar FPS 60

Quando terminar, digite *FINALIZAR*
Para remover o último item, digite *APAGAR ULTIMO*`,
    )
    return
  }

  // Lógica para apagar o último item
  if (msg.body.toUpperCase() === "APAGAR ULTIMO") {
    if (conversa.dadosTemporarios.produtos.length > 0) {
      const removedItem = conversa.dadosTemporarios.produtos.pop();
      await delay(500);
      const currentList = conversa.dadosTemporarios.produtos.length > 0 
        ? conversa.dadosTemporarios.produtos.map((p, i) => `${i + 1}. ${p}`).join("\n") 
        : "_Nenhum item ainda._";
      await client.sendMessage(
        msg.from,
        `🗑️ Item removido: *${removedItem}*\n\nLista atual de produtos:\n${currentList}\n\nContinue adicionando produtos ou digite *FINALIZAR* quando terminar. Para remover o último item, digite *APAGAR ULTIMO*.`
      );
    } else {
      await delay(500);
      await client.sendMessage(
        msg.from,
        "⚠️ Não há itens para remover no seu pedido. Adicione itens ou digite *FINALIZAR* para concluir."
      );
    }
    return; // Retorna para não processar como um novo produto
  }

  // Handle FINALIZAR command first
  if (msg.body.toUpperCase() === "FINALIZAR") {
    if (conversa.dadosTemporarios.produtos.length === 0) {
      await client.sendMessage(
        msg.from,
        "⚠️ Você ainda não adicionou nenhum produto. Adicione itens antes de finalizar ou digite *menu* para voltar.",
      )
      return
    }
    conversa.estado = ESTADOS.ENTREGA_RETIRADA
    await delay(1000)
    await chat.sendStateTyping()
    await delay(2000)
    const listaProdutos = conversa.dadosTemporarios.produtos
      .map((produto, index) => `${index + 1}. ${produto}`)
      .join("\n")
    await client.sendMessage(
      msg.from,
      `📋 *RESUMO DO PEDIDO:*

${listaProdutos}

🚚 Como você prefere receber seu pedido?

*1* - 🏠 Entrega em casa (Taxa: ${FARMACIA_CONFIG.entrega.taxa})
*2* - 🏪 Retirar na farmácia

Digite *1* ou *2*:`,
    )
    return
  }

  // If not FINALIZAR, it must be a product. Validate it.
  if (msg.body.trim().length < 2) {
    await client.sendMessage(
      msg.from,
      "⚠️ Por favor, digite um nome de produto válido (pelo menos 2 caracteres) ou *FINALIZAR* para concluir o pedido."
    )
    return
  }

  // Adicionar produto à lista
  conversa.dadosTemporarios.produtos.push(msg.body)
  await delay(500)
  await client.sendMessage(
    msg.from,
    `✅ Produto adicionado: ${msg.body}\n\nContinue adicionando produtos ou digite *FINALIZAR* quando terminar. Para remover o último item, digite *APAGAR ULTIMO*.`,
  )
}

// Função para processar entrega/retirada
async function processarEntregaRetirada(msg, conversa) {
  const chat = await msg.getChat()
  const userId = msg.from
  
  if (msg.body === "1") {
    conversa.dadosTemporarios.tipoEntrega = "entrega"
    conversa.estado = ESTADOS.FINALIZANDO
    await delay(1000)
    await chat.sendStateTyping()
    await delay(2000)
    await client.sendMessage(
      msg.from,
      `🚚 *ENTREGA SELECIONADA*

📍 Endereço: ${usuarios[userId].endereco}
💰 Taxa de entrega: ${FARMACIA_CONFIG.entrega.taxa}
⏱️ Tempo estimado: ${FARMACIA_CONFIG.entrega.tempo}

O endereço está correto? 
*1* - Sim, confirmar
*2* - Não, alterar endereço`,
    )
  } else if (msg.body === "2") {
    conversa.dadosTemporarios.tipoEntrega = "retirada"
    conversa.estado = ESTADOS.FINALIZANDO
    await delay(1000)
    await chat.sendStateTyping()
    await delay(2000)
    await client.sendMessage(
      msg.from,
      `🏪 *RETIRADA NA FARMÁCIA*

📍 Endereço: ${FARMACIA_CONFIG.endereco}
📞 Telefone: ${FARMACIA_CONFIG.telefone}

⏰ *Horários de funcionamento:*
Segunda a Sábado: ${FARMACIA_CONFIG.horarios.segunda_sabado}

Digite *CONFIRMAR* para finalizar o pedido:`,
    )
  } else {
    await enviarMensagemComandoNaoEntendido(msg)
  }
}

// Função para finalizar pedido
async function finalizarPedido(msg, conversa) {
  const chat = await msg.getChat()
  const userId = msg.from
  
  if (msg.body.toUpperCase() === "CONFIRMAR" || msg.body === "1") {
    // Gerar ID do pedido
    const pedidoId = Date.now().toString()
    // Salvar pedido
    pedidos[pedidoId] = {
      id: pedidoId,
      userId: userId, // Salva o userId para poder responder ao pedido
      produtos: conversa.dadosTemporarios.produtos,
      tipoEntrega: conversa.dadosTemporarios.tipoEntrega,
      endereco: usuarios[userId].endereco,
      status: "aguardando_atendente",
      dataHora: new Date().toISOString(),
      atendenteRespondeuPrimeiraVez: false, // Novo flag para primeira resposta do atendente para este pedido
    }
    // Adicionar pedido ao usuário
    usuarios[userId].pedidos.push(pedidoId)
    // Limpar dados temporários
    delete conversa.dadosTemporarios.etapaPedido
    delete conversa.dadosTemporarios.produtos
    delete conversa.dadosTemporarios.tipoEntrega
    
    conversa.estado = ESTADOS.AGUARDANDO_ATENDENTE
    conversa.atendimentoStartTime = new Date().toISOString(); // NOVO: Inicia o timer de atendimento
    conversa.linkedPedidoId = pedidoId; // NOVO: Vincula a conversa ao pedido
    
    salvarDados()
    await delay(1000)
    await chat.sendStateTyping()
    await delay(3000)
    await client.sendMessage(
      msg.from,
      `✅ *PEDIDO CONFIRMADO!*

🆔 Número do pedido: *${pedidoId}*

Seu pedido foi enviado para nossos atendentes e em breve você receberá o orçamento e confirmação.

⏱️ Tempo estimado para resposta: 5-40 minutos

Obrigado por escolher a ${FARMACIA_CONFIG.nome}! 💚`,
    )
    // Notificar atendentes
    await notificarAtendentes(userId, usuarios[userId], "novo_pedido", pedidoId) // Passa o pedidoId
  } else if (msg.body === "2") {
    await delay(1000)
    await chat.sendStateTyping()
    await delay(1500)
    await client.sendMessage(msg.from, "🏠 Digite o novo endereço para entrega:")
    // Aguardar novo endereço
    conversa.dadosTemporarios.aguardandoEndereco = true
  } else if (conversa.dadosTemporarios.aguardandoEndereco) {
    if (msg.body.trim().length < 15) { // Aumentado o comprimento mínimo para endereço detalhado
      await client.sendMessage(msg.from, "⚠️ Por favor, digite um endereço mais completo, incluindo rua, número, bairro, cidade e, se possível, CEP e ponto de referência:")
      return
    }
    usuarios[userId].endereco = msg.body
    delete conversa.dadosTemporarios.aguardandoEndereco
    salvarDados()
    await delay(1000)
    await chat.sendStateTyping()
    await delay(2000)
    await client.sendMessage(
      msg.from,
      `✅ Endereço atualizado!

📍 Novo endereço: ${msg.body}
💰 Taxa de entrega: ${FARMACIA_CONFIG.entrega.taxa}
⏱️ Tempo estimado: ${FARMACIA_CONFIG.entrega.tempo}

Digite *CONFIRMAR* para finalizar o pedido:`,
    )
  } else {
    await enviarMensagemComandoNaoEntendido(msg)
  }
}

// Função para notificar atendentes
async function notificarAtendentes(userId, usuario, tipoNotificacao, conversationId = userId, originalMsg = null) {
  let mensagemAtendente = "";
  let instrucaoResposta = `*Para responder a este cliente, envie uma mensagem no formato:*\n\`\`\`\n${conversationId} Responder Sua mensagem aqui\n\`\`\`\n*Para abrir o atendimento e enviar mensagens diretas, use:*\n\`\`\`\n${conversationId} Abrir Atendimento\n\`\`\`\n*Para finalizar o atendimento, use:*\n\`\`\`\n${conversationId} Finalizar\n\`\`\``;
  let mediaToSend = null;

  if (tipoNotificacao === "novo_pedido") {
    const pedido = pedidos[conversationId]; // conversationId aqui é o pedidoId
    const listaProdutos = pedido.produtos.map((produto, index) => `${index + 1}. ${produto}`).join("\n")
    mensagemAtendente = `🚨 *NOVO PEDIDO - ${FARMACIA_CONFIG.nome}*

🆔 Pedido: *${pedido.id}*
👤 Cliente: ${usuario.nome}
📱 Telefone: ${usuario.telefone}
📍 Endereço: ${usuario.endereco}
🚚 Tipo: ${pedido.tipoEntrega === "entrega" ? "Entrega" : "Retirada"}

📋 *Produtos solicitados:*
${listaProdutos}

⏰ Data/Hora: ${new Date(pedido.dataHora).toLocaleString("pt-BR")}

${instrucaoResposta}
Ex: \`${conversationId} Responder Olá ${usuario.nome.split(" ")[0]}, seu pedido está sendo preparado!\``;

  } else if (tipoNotificacao === "solicitacao_atendimento") {
    mensagemAtendente = `👨‍⚕️ *SOLICITAÇÃO DE ATENDIMENTO HUMANO*

👤 Cliente: ${usuario.nome}
📱 Contato: ${userId}
⏰ Data/Hora: ${new Date().toLocaleString("pt-BR")}

Cliente solicitou atendimento humano. Por favor, entre em contato.

${instrucaoResposta}
Ex: \`${conversationId} Responder Olá ${usuario.nome.split(" ")[0]}, como posso ajudar?\``;

  } else if (tipoNotificacao === "mensagem_usuario_atendimento" && originalMsg) {
    const messageType = originalMsg.type;
    const messageBody = originalMsg.body;
    const isMedia = originalMsg.hasMedia;

    mensagemAtendente = `💬 *MENSAGEM DO CLIENTE EM ATENDIMENTO*

👤 Cliente: ${usuario.nome}
📱 Contato: ${userId}
Tipo: ${messageType}`;

    if (messageType === 'chat') {
      mensagemAtendente += `\nMensagem: ${messageBody}`;
    } else if (isMedia) {
      mensagemAtendente += `\n(Anexo: ${messageType})`;
      try {
        mediaToSend = await originalMsg.downloadMedia();
      } catch (error) {
        console.error("Erro ao baixar mídia:", error);
        mensagemAtendente += "\n⚠️ Erro ao baixar mídia.";
      }
    } else {
      mensagemAtendente += `\nMensagem: ${messageBody || '(Mensagem sem corpo)'}`;
    }

    mensagemAtendente += `\n\n${instrucaoResposta}`;
    mensagemAtendente += `\nEx: \`${conversationId} Responder Entendi sua dúvida, vou verificar.\``;
  }

  // Enviar para todos os atendentes
  for (const atendenteId of FARMACIA_CONFIG.atendentes) {
    try {
      if (mediaToSend) {
        await client.sendMessage(atendenteId, mediaToSend, { caption: mensagemAtendente });
      } else {
        await client.sendMessage(atendenteId, mensagemAtendente);
      }
    } catch (error) {
      console.error(`Erro ao notificar atendente ${atendenteId}:`, error);
    }
  }
}

// Função para finalizar atendimento automaticamente
async function autoFinalizeSession(userId, reason) {
  const conversa = conversas[userId];
  if (!conversa) return;

  console.log(`Finalizando atendimento para ${userId} automaticamente devido a: ${reason}`);

  let clientName = usuarios[userId]?.nome?.split(" ")[0] || "Cliente";
  let messageToClient = `✅ *Atendimento finalizado automaticamente!*`;

if (reason === 'inatividade (3 horas)') {
  messageToClient += `\n\nPara iniciar um novo atendimento, digite *menu*.`;
} else if (reason === 'fechamento da farmácia') {
  messageToClient += `\n\nSeu atendimento foi encerrado devido ao ${reason}.
\nNossa farmácia está fora do horário de funcionamento. Fique ligado nos nossos horários:\n*Segunda a Sábado:* ${FARMACIA_CONFIG.horarios.segunda_sabado}\n\nAguardamos seu contato durante o nosso horário de atendimento! 😊`;
}

  try {
    await client.sendMessage(userId, messageToClient);
  } catch (error) {
    console.error(`Erro ao enviar mensagem de finalização automática para ${userId}:`, error);
  }

  // Resetar estado do cliente
  conversa.estado = ESTADOS.MENU_PRINCIPAL;
  conversa.atendimentoStartTime = null;
  conversa.atendenteRespondeuPrimeiraVez = false;

  // Se houver um pedido vinculado, atualiza o status do pedido
  if (conversa.linkedPedidoId && pedidos[conversa.linkedPedidoId]) {
    pedidos[conversa.linkedPedidoId].status = "finalizado_automaticamente";
  }
  conversa.linkedPedidoId = null;

  // Remover o atendente ativo, se houver
  for (const attendantId in atendentesAtivos) {
    if (atendentesAtivos[attendantId] === userId || atendentesAtivos[attendantId] === conversa.linkedPedidoId) {
      delete atendentesAtivos[attendantId];
      try {
        await client.sendMessage(attendantId, `ℹ️ Atendimento com ${userId.split('@')[0]} (ID da conversa: ${atendentesAtivos[attendantId]}) foi finalizado automaticamente devido a ${reason}.`);
      } catch (error) {
        console.error(`Erro ao notificar atendente ${attendantId} sobre finalização automática:`, error);
      }
    }
  }
  salvarDados();
}

// NOVO: Função para verificar sessões inativas
async function checkInactiveSessions() {
  console.log("Verificando sessões inativas...");
  const currentTime = new Date();
  const isCurrentlyOpen = isFarmaciaOpen();

  for (const userId in conversas) {
    const conversa = conversas[userId];

    // Apenas verifica sessões que estão aguardando atendente ou em atendimento
    if (conversa.estado === ESTADOS.AGUARDANDO_ATENDENTE && conversa.atendimentoStartTime) {
      const startTime = new Date(conversa.atendimentoStartTime);
      const diffHours = (currentTime - startTime) / (1000 * 60 * 60);

      if (diffHours >= 3) {
        await autoFinalizeSession(userId, 'inatividade (3 horas)');
      }
    }
  }
  salvarDados(); // Salva após a verificação
}


// Função principal para processar mensagens
client.on("message", async (msg) => {
  // Só responder mensagens de contatos individuais (não grupos)
  if (!msg.from.endsWith("@c.us")) {
    return
  }

  const userId = msg.from
  const conversa = inicializarConversa(userId)
  const contact = await msg.getContact()
  const nomeContato = contact.pushname || "Cliente"

  // Atualizar última interação
  conversa.ultimaInteracao = new Date().toISOString()

  // --- Lógica para atendentes responderem aos usuários ---
  if (FARMACIA_CONFIG.atendentes.includes(userId)) {
    // Obter o nome do atendente do mapeamento ou fallback para pushname/genérico
    const attendantName = FARMACIA_CONFIG.nomesAtendentes[userId] || (await msg.getContact()).pushname || "Atendente";

    // 1. Comando para FINALIZAR atendimento: [ID_DA_CONVERSA] Finalizar
    const finalizeMatch = msg.body.match(/^(?<conversationId>\S+)\s+Finalizar\s*$/i);
    if (finalizeMatch && finalizeMatch.groups) {
      const conversationId = finalizeMatch.groups.conversationId;
      let targetUserId = null;
      let clientName = "Cliente";

      if (pedidos[conversationId] && pedidos[conversationId].userId) {
        targetUserId = pedidos[conversationId].userId;
        clientName = usuarios[targetUserId]?.nome?.split(" ")[0] || "Cliente";
        pedidos[conversationId].atendenteRespondeuPrimeiraVez = false; // Reset flag
        pedidos[conversationId].status = "finalizado_atendimento";
      } else if (conversas[conversationId]) {
        targetUserId = conversationId;
        clientName = usuarios[targetUserId]?.nome?.split(" ")[0] || "Cliente";
        conversas[conversationId].atendenteRespondeuPrimeiraVez = false; // Reset flag
      }

      if (targetUserId) {
        try {
          await client.sendMessage(targetUserId, `✅ *Atendimento finalizado!*

Obrigado por entrar em contato, ${clientName}. Se precisar de algo mais, digite *menu* para voltar ao menu principal.`);
          conversas[targetUserId].estado = ESTADOS.MENU_PRINCIPAL; // Retorna o cliente ao menu principal
          conversas[targetUserId].atendimentoStartTime = null; // NOVO: Limpa o timer
          conversas[targetUserId].linkedPedidoId = null; // NOVO: Limpa o link do pedido
          salvarDados();

          delete atendentesAtivos[userId]; // Remove a conversa ativa para este atendente
          salvarDados();

          await client.sendMessage(userId, `✅ Atendimento com ${targetUserId.split('@')[0]} (ID da conversa: ${atendentesAtivos[userId]}) foi finalizado com sucesso.`);
        } catch (error) {
          console.error(`Erro ao finalizar atendimento para ${targetUserId}:`, error);
          await client.sendMessage(userId, `❌ Erro ao finalizar atendimento para ${targetUserId.split('@')[0]} (ID da conversa: ${conversationId}).`);
        }
      } else {
        await client.sendMessage(userId, `⚠️ ID da conversa (${conversationId}) não encontrado ou inválido para finalizar.`);
      }
      return;
    }

    // 2. Comando para ABRIR atendimento: [ID_DA_CONVERSA] Abrir Atendimento
    const openMatch = msg.body.match(/^(?<conversationId>\S+)\s+Abrir Atendimento\s*$/i);
    if (openMatch && openMatch.groups) {
      const conversationId = openMatch.groups.conversationId;
      let targetUserId = null;

      if (pedidos[conversationId] && pedidos[conversationId].userId) {
        targetUserId = pedidos[conversationId].userId;
        pedidos[conversationId].status = "em_atendimento"; //  Atualiza status do pedido
      } else if (conversas[conversationId]) {
        targetUserId = conversationId;
      }

      if (targetUserId) {
        atendentesAtivos[userId] = conversationId; // Define a conversa ativa para este atendente
        conversas[targetUserId].atendimentoStartTime = new Date().toISOString(); // Reseta o timer ao abrir atendimento
        salvarDados();
        await client.sendMessage(userId, `✅ Atendimento para ${targetUserId.split('@')[0]} (Número da conversa: ${conversationId}) *ativado*. Agora você pode enviar mensagens diretamente.`);
      } else {
        await client.sendMessage(userId, `⚠️ Número da conversa (${conversationId}) não encontrado ou inválido para abrir atendimento.`);
      }
      return;
    }

    // 3. Comando para RESPONDER e iniciar/continuar atendimento: [ID_DA_CONVERSA] Responder Sua mensagem aqui
    const respondMatch = msg.body.match(/^(?<conversationId>\S+)\s+Responder\s+(?<message>.*)/i);
    let conversationIdToProcess = null;
    let messageContentToProcess = null;

    if (respondMatch && respondMatch.groups) {
      // Explicit command: [ID] Responder [MSG]
      conversationIdToProcess = respondMatch.groups.conversationId;
      messageContentToProcess = respondMatch.groups.message;
      atendentesAtivos[userId] = conversationIdToProcess; // Define esta como a conversa ativa do atendente
      salvarDados();
    } else if (atendentesAtivos[userId]) {
      // No explicit command, but an active conversation exists
      conversationIdToProcess = atendentesAtivos[userId];
      messageContentToProcess = msg.body;
    }

    if (conversationIdToProcess) {
      let targetUserId = null;
      let clientName = "Cliente";
      let respondedFirstTimeFlag = false;

      if (pedidos[conversationIdToProcess] && pedidos[conversationIdToProcess].userId) {
        targetUserId = pedidos[conversationIdToProcess].userId;
        clientName = usuarios[targetUserId]?.nome?.split(" ")[0] || "Cliente";
        respondedFirstTimeFlag = pedidos[conversationIdToProcess].atendenteRespondeuPrimeiraVez;
        pedidos[conversationIdToProcess].status = "em_atendimento"; // NOVO: Atualiza status do pedido
      } else if (conversas[conversationIdToProcess]) {
        targetUserId = conversationIdToProcess;
        clientName = usuarios[targetUserId]?.nome?.split(" ")[0] || "Cliente";
        respondedFirstTimeFlag = conversas[conversationIdToProcess].atendenteRespondeuPrimeiraVez;
      }

      if (targetUserId) {
        let finalMessageContent = messageContentToProcess;

        if (!respondedFirstTimeFlag) {
          finalMessageContent = `Olá ${clientName}, quem fala é o(a) *${attendantName}*.\n\n${messageContentToProcess}`;
          if (pedidos[conversationIdToProcess]) {
            pedidos[conversationIdToProcess].atendenteRespondeuPrimeiraVez = true;
          } else if (conversas[conversationIdToProcess]) {
            conversas[conversationIdToProcess].atendenteRespondeuPrimeiraVez = true;
          }
          salvarDados();
        }
        
        //  Reseta o timer de atendimento a cada resposta do atendente
        conversas[targetUserId].atendimentoStartTime = new Date().toISOString();
        salvarDados();

        try {
          if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            await client.sendMessage(targetUserId, media, { caption: `👨‍⚕️ *${attendantName}:* ${finalMessageContent}` });
          } else {
            await client.sendMessage(targetUserId, `👨‍⚕️ *${attendantName}:* ${finalMessageContent}`);
          }
          
        } catch (error) {
          console.error(`Erro ao enviar mensagem do atendente para ${targetUserId}:`, error);
          await client.sendMessage(userId, `❌ Erro ao enviar mensagem para ${targetUserId.split('@')[0]} (ID da conversa: ${conversationIdToProcess}).`);
        }
      } else {
        await client.sendMessage(userId, `⚠️ ID da conversa ativa (${conversationIdToProcess}) não encontrado ou inválido.`);
      }
      return;
    }

    // Fallback: Se nenhum comando específico foi usado e não há conversa ativa
    await client.sendMessage(userId, "⚠️ Comando de atendente inválido ou nenhuma conversa ativa. Use: `[ID_DA_CONVERSA] Abrir Atendimento`, `[ID_DA_CONVERSA] Responder Sua mensagem aqui` (para iniciar e responder), ou `[ID_DA_CONVERSA] Finalizar`.");
    return;
  }
  // --- Fim da lógica para atendentes ---

  // Verificar horário de funcionamento para clientes (exceto atendentes)
  if (!isFarmaciaOpen()) {
    await client.sendMessage(
      msg.from,
      `⏰ Olá! A *${FARMACIA_CONFIG.nome}* está fora do horário de funcionamento no momento.

Fique ligado nos nossos horários:
*Segunda a Sábado:* ${FARMACIA_CONFIG.horarios.segunda_sabado}

Aguardamos seu contato durante o nosso horário de atendimento! 😊`
    );
    return; // Interrompe o processamento da mensagem se a farmácia estiver fechada
  }


  // Comandos especiais
  if (msg.body.match(/(menu|Menu|início|inicio)/i)) {
    // Impedir que o usuário volte ao menu se estiver em atendimento ativo
    if (conversa.estado === ESTADOS.AGUARDANDO_ATENDENTE) {
      await client.sendMessage(
        msg.from,
        "💬 Você está em um atendimento ativo. Por favor, aguarde a resposta do atendente ou peça para ele finalizar o atendimento para voltar ao menu principal."
      );
      return; // Impede que o fluxo continue para o menu
    }
    conversa.estado = ESTADOS.MENU_PRINCIPAL
    await enviarMenuPrincipal(msg, nomeContato.split(" ")[0])
    return
  }

  // Mensagem inicial ou saudações
  if (
    msg.body.match(/(oi|olá|ola|bom dia|boa tarde|boa noite|dia|tarde|boa noite)/i) &&
    conversa.estado === ESTADOS.INICIAL
  ) {
    const chat = await msg.getChat()
    const saudacao = obterSaudacao()
    await delay(2000)
    await chat.sendStateTyping()
    await delay(3000)
    await client.sendMessage(
      msg.from,
      `${saudacao}! 😊

Seja bem-vindo(a) à *${FARMACIA_CONFIG.nome}*! Eu sou o assistente virtual e estou aqui para ajudá-lo com:

• 🛒 Pedidos de medicamentos
• 📋 Cadastro e informações
• 🚚 Entregas e retiradas
• ❓ Dúvidas em geral

Vamos começar?`,
    )
    conversa.estado = ESTADOS.MENU_PRINCIPAL
    await delay(3000) // Mantém o delay para UX
    await enviarMenuPrincipal(msg, nomeContato.split(" ")[0]) // Envia o menu principal
    return // Garante que a execução pare aqui
  }

  // Processar baseado no estado atual
  switch (conversa.estado) {
    case ESTADOS.MENU_PRINCIPAL:
      await processarMenuPrincipal(msg, conversa, nomeContato)
      break
    case ESTADOS.CADASTRO:
      await processarCadastro(msg, conversa)
      break
    case ESTADOS.PEDIDO:
      await processarPedido(msg, conversa)
      break
    case ESTADOS.ENTREGA_RETIRADA:
      await processarEntregaRetirada(msg, conversa)
      break
    case ESTADOS.FINALIZANDO:
      await finalizarPedido(msg, conversa)
      break
    case ESTADOS.AGUARDANDO_ATENDENTE:
      // Se o usuário está aguardando atendente, encaminha a mensagem para o atendente
      const usuarioAtual = usuarios[userId] || { nome: nomeContato, telefone: userId.split('@')[0] };
      // Passa o originalMsg para que a função possa encaminhar mídias (incluindo figurinhas)
      await notificarAtendentes(userId, usuarioAtual, "mensagem_usuario_atendimento", userId, msg); 
      break;
    case ESTADOS.VISUALIZANDO_INFO:
      // Se estiver visualizando info e não digitou 'menu', é um comando não entendido
      await enviarMensagemComandoNaoEntendido(msg)
      break
    default:
      // Fallback para estados inesperados, retorna ao menu principal
      conversa.estado = ESTADOS.MENU_PRINCIPAL
      await enviarMenuPrincipal(msg, nomeContato.split(" ")[0])
      break
  }

  // Salvar dados após cada interação
  salvarDados()
})

// Função para processar menu principal
async function processarMenuPrincipal(msg, conversa, nomeContato) {
  const chat = await msg.getChat()
  const userId = msg.from
  
  switch (msg.body) {
    case "1":
      conversa.estado = ESTADOS.PEDIDO
      await processarPedido(msg, conversa)
      break
    case "2":
      if (usuarios[userId]) {
        await delay(1000)
        await chat.sendStateTyping()
        await delay(2000)
        await client.sendMessage(
          msg.from,
          `👤 *SEUS DADOS CADASTRADOS:*

📝 Nome: ${usuarios[userId].nome}
📱 Telefone: ${usuarios[userId].telefone}
🏠 Endereço: ${usuarios[userId].endereco}
📅 Cadastrado em: ${new Date(usuarios[userId].dataCadastro).toLocaleDateString("pt-BR")}
🛒 Total de pedidos: ${usuarios[userId].pedidos.length}

Para alterar algum dado, digite *atualizar* ou *menu* para voltar.`,
        )
      } else {
        conversa.estado = ESTADOS.CADASTRO
        await processarCadastro(msg, conversa)
      }
      break
    case "3":
      await delay(1000)
      await chat.sendStateTyping()
      await delay(2000)
      await client.sendMessage(
        msg.from,
        `🕒 *HORÁRIOS DE FUNCIONAMENTO*

📍 ${FARMACIA_CONFIG.endereco}

⏰ *Horários:*
🔹 Segunda a Sábado: ${FARMACIA_CONFIG.horarios.segunda_sabado}

📞 Telefone: ${FARMACIA_CONFIG.telefone}

Digite *menu* para voltar ao menu principal.`,
      )
      conversa.estado = ESTADOS.VISUALIZANDO_INFO // Define o estado para visualizando info
      break
    case "4":
      await delay(1000)
      await chat.sendStateTyping()
      await delay(2000)
      await client.sendMessage(
        msg.from,
        `🚚 *INFORMAÇÕES SOBRE ENTREGA*

💰 Taxa de entrega: ${FARMACIA_CONFIG.entrega.taxa}
⏱️ Tempo estimado: ${FARMACIA_CONFIG.entrega.tempo}
📍 Raio de entrega: ${FARMACIA_CONFIG.entrega.raio}

🏪 *Retirada na farmácia:*
📍 ${FARMACIA_CONFIG.endereco}
💰 Sem taxa adicional
⏱️ Disponível nos horários de funcionamento

Digite *menu* para voltar ao menu principal.`,
      )
      conversa.estado = ESTADOS.VISUALIZANDO_INFO // Define o estado para visualizando info
      break
    case "5":
      await delay(1000)
      await chat.sendStateTyping()
      await delay(2000)
      await client.sendMessage(
        msg.from,
        `📍 *LOCALIZAÇÃO DA FARMÁCIA*

🏥 ${FARMACIA_CONFIG.nome}
📍 ${FARMACIA_CONFIG.endereco}
📞 ${FARMACIA_CONFIG.telefone}

🚗 *Como chegar:*
• Ao lado do centro da cidade

🕒 *Horários:*
Segunda a Sábado: ${FARMACIA_CONFIG.horarios.segunda_sabado}

Digite *menu* para voltar ao menu principal.`,
      )
      conversa.estado = ESTADOS.VISUALIZANDO_INFO // Define o estado para visualizando info
      break
    case "6":
      await delay(1000)
      await chat.sendStateTyping()
      await delay(2000)
      await client.sendMessage(
        msg.from,
        `👨‍⚕️ *FALAR COM ATENDENTE*

Você será conectado com um de nossos atendentes em breve!

⏱️ Horário de atendimento humano:
Segunda a Sábado: 08:00 às 12:00 e 14:00 às 18:30

Aguarde que em instantes um atendente entrará em contato com você.

Digite *menu* se precisar voltar ao menu principal.`,
      )
      conversa.estado = ESTADOS.AGUARDANDO_ATENDENTE; // Muda o estado do usuário para aguardando atendente
      conversa.atendimentoStartTime = new Date().toISOString(); // NOVO: Inicia o timer de atendimento
      conversa.linkedPedidoId = null; // NOVO: Não há pedido vinculado diretamente
      // Notificar atendentes sobre solicitação
      const usuarioSolicitante = usuarios[userId] || { nome: nomeContato, telefone: userId.split('@')[0] };
      // Passa o userId como conversationId para o atendente saber para quem responder
      await notificarAtendentes(userId, usuarioSolicitante, "solicitacao_atendimento", userId); 
      break
    default:
      // Mensagem de erro específica do menu principal
      await delay(1000)
      await client.sendMessage(
        msg.from,
        "⚠️ Opção inválida. Por favor, digite um número de 1 a 6 ou *menu* para ver as opções novamente.",
      )
      await delay(2000)
      await enviarMenuPrincipal(msg, nomeContato.split(" ")[0])
      break
  }
}

// Salvar dados a cada 5 minutos
setInterval(salvarDados, 5 * 60 * 1000)

// Salvar dados ao encerrar o processo
process.on("SIGINT", () => {
  console.log("\n🔄 Salvando dados antes de encerrar...")
  salvarDados()
  console.log("✅ Dados salvos. Encerrando bot...")
  process.exit(0)
})

console.log("🚀 Iniciando Bot da Farmácia Rocha...")
