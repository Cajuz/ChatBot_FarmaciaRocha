# 🤖 Bot de Vendas - Farmácia Rocha

Bot inteligente para WhatsApp que automatiza vendas e atendimento da Farmácia Rocha.

## 🚀 Funcionalidades

### ✅ Principais Recursos
- **Cadastro de Usuários**: Coleta e armazena dados dos clientes
- **Processamento de Pedidos**: Sistema completo de pedidos com produtos
- **Comandos de Pedido**: Permite remover o último item (`APAGAR ULTIMO`)
- **Entrega/Retirada**: Opções de entrega ou retirada na farmácia
- **Gerenciamento de Atendimento Humano**:
  - Notifica atendentes sobre novos pedidos e solicitações.
  - Permite que atendentes conversem diretamente com os clientes.
  - Controle de sessão de atendimento com comandos para `Abrir` e `Finalizar`.
- **Informações**: Horários, localização e dúvidas gerais
- **Apenas Contatos**: Não responde em grupos

### 🛠️ Tecnologias
- Node.js
- whatsapp-web.js
- Sistema de arquivos para persistência
- QR Code para autenticação

## 📋 Pré-requisitos

- Node.js 16+ instalado
- WhatsApp instalado no celular
- Conexão com internet estável

## 🔧 Instalação

1. **Clone ou baixe o projeto**
\`\`\`bash
git clone [url-do-projeto]
cd farmacia-rocha-bot
\`\`\`

2. **Instale as dependências**
\`\`\`bash
npm install
\`\`\`

3. **Configure os atendentes**
Edite o arquivo `robo.js` e altere os números dos atendentes:
\`\`\`javascript
atendentes: [
    "5511999999999@c.us", // Substitua pelo número real
    "5511888888888@c.us"  // Formato: DDI + DDD + NÚMERO
]
\`\`\`
4. **Configure os nomes dos atendentes**
No mesmo arquivo `robo.js`, adicione os nomes que serão exibidos aos clientes:
\`\`\`javascript
nomesAtendentes: {
    "5511999999999@c.us": "Carlos",
    "5511888888888@c.us": "Ana"
}
\`\`\`

4. **Configure dados da farmácia**
Altere as informações da farmácia no objeto `FARMACIA_CONFIG`:
\`\`\`javascript
const FARMACIA_CONFIG = {
    nome: "Farmácia Rocha",
    endereco: "Seu endereço aqui",
    telefone: "Seu telefone",
    // ... outras configurações
};
\`\`\`

## 🚀 Como Usar

1. **Inicie o bot**
\`\`\`bash
node robo.js
\`\`\`

2. **Escaneie o QR Code**
- Abra o WhatsApp no celular
- Vá em "Dispositivos conectados"
- Escaneie o QR Code que aparece no terminal

3. **Bot funcionando!**
- O bot estará ativo e respondendo mensagens
- Teste enviando "oi" para o número conectado

## 📱 Fluxo de Uso

### Para Clientes:
1. **Saudação inicial**: "Oi", "Bom dia", etc.
2. **Menu principal**: 6 opções disponíveis
3. **Fazer pedido**: Cadastro → Produtos → Entrega/Retirada
4. **Finalização**: Encaminhamento para atendentes

### Para Atendentes:
1. **Recebem notificações** com um ID de conversa.
2. Usam o comando `[ID] Abrir Atendimento` para iniciar uma conversa direta.
3. Conversam normalmente com o cliente (enviando texto, áudio, etc.).
4. Usam o comando `[ID] Finalizar` para encerrar o atendimento.

## 📊 Dados Armazenados

O bot salva automaticamente:
- **usuarios.json**: Dados dos clientes cadastrados
- **pedidos.json**: Histórico de todos os pedidos
- **conversas.json**: Estado das conversas ativas
- **atendentesAtivos.json**: Mapeamento de atendimentos em andamento

## 🔧 Personalização

### Alterar Horários
\`\`\`javascript
horarios: {
    segunda_sexta: "08:00 às 22:00",
    sabado: "08:00 às 20:00", 
    domingo: "09:00 às 18:00"
}
\`\`\`

### Alterar Taxa de Entrega
\`\`\`javascript
entrega: {
    taxa: "R$ 5,00",
    tempo: "30 a 60 minutos",
    raio: "5km"
}
\`\`\`

### Adicionar Mais Atendentes
\`\`\`javascript
atendentes: [
    "5511999999999@c.us",
    "5511888888888@c.us",
    "5511777777777@c.us" // Novo atendente
]
\`\`\`

## 🛡️ Segurança

- ✅ Só responde contatos individuais
- ✅ Não responde grupos
- ✅ Dados salvos localmente
- ✅ Backup periódico a cada 5 minutos
- ✅ Finalização automática de sessões inativas (após 3 horas)

## 🆘 Solução de Problemas

### Bot não conecta
- Verifique se o WhatsApp está funcionando
- Tente escanear o QR Code novamente
- Reinicie o bot

### Não recebe mensagens
- Verifique se o número está correto
- Confirme que não é um grupo
- Teste com "menu" ou "oi"

### Atendentes não recebem notificações
- Verifique os números no formato correto
- Confirme que os números têm WhatsApp
- Teste enviando mensagem manual

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: alvaro.sateles10@gmail.com
- 📱 WhatsApp: (11) 94701-5576

---

**Desenvolvido com carinho por Alvaro para a Farmácia Rocha**
