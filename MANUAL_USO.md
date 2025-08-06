# 📖 Manual de Uso - Bot Farmácia Rocha

## 🎯 Para Clientes

### Como Iniciar uma Conversa
 - Envie qualquer uma mensagem

### Menu Principal - Opções Disponíveis

**1️⃣ Fazer Pedido**
- Cadastra produtos desejados
- Escolhe entrega ou retirada
- Encaminha para atendente

**2️⃣ Meus Dados / Cadastro**
- Visualiza dados cadastrados
- Permite atualização de informações

**3️⃣ Horários de Funcionamento**
- Mostra horários da farmácia
- Informações de contato

**4️⃣ Informações sobre Entrega**
- Taxa e tempo de entrega
- Raio de atendimento

**5️⃣ Localização da Farmácia**
- Endereço completo
- Como chegar

**6️⃣ Falar com Atendente**
- Conecta com atendente humano
- Para dúvidas específicas


### Como Fazer um Pedido

#### Passo 1: Cadastro (primeira vez)
1. Digite "1" no menu principal
2. Informe seu **nome completo**
3. Confirme seu número de telefone (o bot irá sugerir) ou digite um novo com DDD
4. Forneça seu **endereço completo** e detalhado

#### Passo 2: Adicionar Produtos
1. Digite os produtos, um por linha
2. Exemplo:
   \`\`\`
   Dipirona 500mg - 1 caixa
   Vitamina C - 2 frascos
   Protetor solar FPS 60
   \`\`\`
3. Digite **"FINALIZAR"** quando terminar
4. Para remover o último item adicionado, digite **"APAGAR ULTIMO"**

#### Passo 3: Escolher Entrega/Retirada
- **Opção 1**: Entrega em casa (com taxa)
- **Opção 2**: Retirar na farmácia (sem taxa)

#### Passo 4: Confirmação
1. Revise os dados
2. Digite "CONFIRMAR"
3. Receba o número do pedido
4. Aguarde contato do atendente

### Comandos Úteis
- **"menu"**: Volta ao menu principal
- **"FINALIZAR"**: Termina lista de produtos
- **"APAGAR ULTIMO"**: Remove o último produto da lista
- **"CONFIRMAR"**: Confirma pedido

---

## 👨‍💼 Para Atendentes

### Notificações Recebidas
Você receberá notificações no seu WhatsApp para **novos pedidos** e **solicitações de atendimento**. Cada notificação virá com um **ID da Conversa** (que pode ser o número do pedido ou o contato do cliente).

**Exemplo de Notificação de Pedido:**
```
🚨 *NOVO PEDIDO - Farmácia Rocha*

🆔 Pedido: *1678886400000*
👤 Cliente: João da Silva
...

*Para responder, use o comando:*
`1678886400000 Responder Sua mensagem aqui`
```

### Como Responder e Gerenciar Atendimentos

O sistema agora permite que você "abra" um canal de comunicação direto com o cliente.

#### Passo 1: Abrir o Atendimento (Obrigatório)
Para começar a conversar com um cliente, use o comando `Abrir Atendimento`. Isso vincula a conversa a você, permitindo que envie mensagens diretas.

**Comando:**
```
[ID_DA_CONVERSA] Abrir Atendimento
```
**Exemplo:**
```
1678886400000 Abrir Atendimento
```
O bot confirmará que o atendimento está ativo para você.

#### Passo 2: Conversar com o Cliente
Uma vez que o atendimento está aberto, **você não precisa mais usar comandos**. Apenas envie suas mensagens, áudios ou imagens diretamente na conversa com o bot, e elas serão encaminhadas ao cliente.

- A sua **primeira mensagem** será enviada com uma apresentação automática: _"Olá [Nome do Cliente], quem fala é o(a) [Seu Nome]."_
- As mensagens seguintes serão enviadas diretamente.

#### Passo 3: Finalizar o Atendimento
Quando a conversa terminar, é **muito importante** finalizá-la para liberar o cliente e você para outros atendimentos.

**Comando:**
```
[ID_DA_CONVERSA] Finalizar
```
**Exemplo:**
```
1678886400000 Finalizar
```
O cliente receberá uma mensagem de encerramento e voltará ao menu principal do bot.

### Resumo dos Comandos do Atendente
- `[ID] Abrir Atendimento`: Inicia a conversa direta.
- `[ID] Finalizar`: Encerra a conversa.
- `[ID] Responder [mensagem]`: (Opcional) Envia uma única mensagem sem abrir o atendimento direto. Útil para respostas rápidas.

### Informações Importantes
- **Atendimento Automático**: As sessões de atendimento são finalizadas automaticamente após **3 horas de inatividade**.
- **Dados do Cliente**: A notificação inicial contém todos os dados necessários:
- 🆔 Número do pedido
- 👤 Dados do cliente
- 📋 Lista de produtos
- 🚚 Tipo de entrega/retirada
- ⏰ Data e hora

### Horários de Atendimento
- **Segunda a Sexta**: 08:00 às 22:00
- **Sábado**: 08:00 às 20:00
- **Domingo**: 09:00 às 18:00

#### Taxa de Entrega
- **Valor**: R$ 5,00
- **Tempo**: 30 a 60 minutos
- **Raio**: 5km da farmácia

#### Dados da Farmácia
- **Nome**: Farmácia Rocha
- **Endereço**: Rua das Flores, 123 - Centro - São Paulo/SP
- **Telefone**: (11) 3456-7890

---

## 🔧 Para Administradores

### Configurações Importantes

#### Números dos Atendentes
Altere no arquivo `robo.js`:
\`\`\`javascript
atendentes: [
    "5511999999999@c.us", // Formato: DDI + DDD + NÚMERO
    "5511888888888@c.us"
]
\`\`\`
#### Nomes dos Atendentes (NOVO)
Configure o nome que aparecerá para o cliente no arquivo `robo.js`:
\`\`\`javascript
nomesAtendentes: {
    "5511999999999@c.us": "Carlos",
    "5511888888888@c.us": "Ana"
}
\`\`\`
#### Dados da Farmácia
Configure no objeto `FARMACIA_CONFIG`:
\`\`\`javascript
const FARMACIA_CONFIG = {
    nome: "Farmácia Rocha",
    endereco: "Rua das Flores, 123 - Centro - São Paulo/SP",
    telefone: "(11) 3456-7890",
    // ... outras configurações
};
\`\`\`

### Monitoramento

#### Arquivos de Dados
- **usuarios.json**: Clientes cadastrados
- **pedidos.json**: Histórico de pedidos
- **conversas.json**: Estados das conversas
- **atendentesAtivos.json**: Mapeamento de atendimentos ativos

#### Backup Automático
- Salva dados a cada 5 minutos
- Salva os dados ao encerrar o bot (Ctrl + C)
- Dados persistem entre reinicializações

### Manutenção

#### Reiniciar o Bot
\`\`\`bash
# Parar o bot
Ctrl + C

# Iniciar novamente
node robo.js
\`\`\`

#### Verificar Logs
- Mensagens de erro aparecem no terminal
- Monitore conexões e notificações

#### Limpeza de Dados
- Remova conversas antigas periodicamente
- Faça backup dos dados importantes

---

## ❓ Perguntas Frequentes

### Para Clientes

**P: O bot funciona 24 horas?**
R: Sim, o bot responde 24h, mas atendentes humanos têm horários específicos.

**P: Posso alterar meu pedido?**
R: Após enviar, fale com o atendente para alterações.

**P: O que acontece se eu não responder o atendente?**
R: A conversa será encerrada automaticamente após 3 horas de inatividade para que você possa usar o menu novamente.

**P: Como sei se meu pedido foi recebido?**
R: Você recebe um número de pedido e confirmação.

**P: O bot guarda meus dados?**
R: Sim, para facilitar pedidos futuros. Dados são seguros.

### Para Atendentes

**P: Como sei que há um novo pedido?**
R: Você recebe notificação automática no WhatsApp.

**P: Posso ver pedidos antigos?**
R: Sim, consulte o arquivo pedidos.json ou peça ao administrador.

**P: E se o cliente não responder?**
R: Tente contato em horários diferentes ou use outros meios.

---

## 📞 Suporte Técnico

### Problemas Comuns

#### Bot não responde
1. Verifique se está conectado
2. Reinicie o bot
3. Escaneie QR Code novamente

#### Não recebo notificações
1. Confirme seu número na configuração
2. Teste enviando mensagem para o bot
3. Verifique se não está em grupo

#### Dados perdidos
1. Verifique arquivos .json
2. Restaure backup se disponível
3. Reconfigure se necessário

### Contato para Suporte
- 📧 **Email**: alvaro.sateles10@gmail.com
- 📱 **WhatsApp**: (11) 94701-5576

---

**✅ Bot Farmácia Rocha - Versão 1.0**
*Desenvolvido por Alvaro Sáteles, para otimizar vendas e atendimento*
