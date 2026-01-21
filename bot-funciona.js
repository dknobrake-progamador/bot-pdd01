// BOT PDD - VERSÃO CORRIGIDA (sem bug)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

console.log('🎯 BOT PDD - VERSÃO FUNCIONAL\n');

// Configuração
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

// Cliente com configuração que evita o bug
const client = new Client({
  authStrategy: new LocalAuth({ 
    clientId: 'PDD-FINAL',
    dataPath: './whatsapp_auth'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  }
});

// QR Code
client.on('qr', qr => {
  console.log('='.repeat(40));
  console.log('📱 QR CODE:');
  console.log('='.repeat(40));
  qrcode.generate(qr, { small: true });
  console.log('='.repeat(40));
});

// Conectado
client.on('ready', async () => {
  console.log('\n✅✅✅ BOT CONECTADO! ✅✅✅');
  console.log('⏰ ' + new Date().toLocaleString('pt-BR'));
  
  // TESTE: Enviar mensagem usando método seguro
  console.log('\n🔧 TESTANDO ENVIO...');
  
  try {
    // Método ALTERNATIVO que funciona
    const chat = await client.getChatById('5521978818116@c.us');
    await chat.sendMessage('✅ BOT PDD: Conectado e funcionando!');
    console.log('✅ TESTE: Mensagem enviada com SUCESSO!');
    console.log('✅ O bot está PRONTO para notificar!');
  } catch (erro) {
    console.log('⚠️  Teste falhou, mas o bot ainda detecta pedidos.');
    console.log('⚠️  Erro detalhado:', erro.message);
  }
  
  console.log('\n🎯 AGORA MONITORANDO GRUPOS...');
});

// Função SEGURA para enviar mensagens
async function enviarMensagemSegura(numero, mensagem) {
  try {
    // Método 1: Tentar método direto
    await client.sendMessage(numero, mensagem);
    return true;
  } catch (erro1) {
    try {
      // Método 2: Tentar via chat
      const chat = await client.getChatById(numero);
      await chat.sendMessage(mensagem);
      return true;
    } catch (erro2) {
      console.log(`❌ Falha ao enviar para ${numero}`);
      return false;
    }
  }
}

// Detectar mensagens
client.on('message', async msg => {
  if (msg.fromMe) return;
  
  const chat = await msg.getChat();
  if (!chat.isGroup) return;
  
  const texto = (msg.body || '').toLowerCase();
  const palavras = ['crlv', 'atpv', 'tpv', 'gravame', 'leilao'];
  
  if (palavras.some(p => texto.includes(p))) {
    console.log('\n' + '🚨'.repeat(15));
    console.log('🚨 PEDIDO DETECTADO!');
    console.log('💬 ' + texto.substring(0, 70));
    console.log('🏷️ ' + chat.name);
    console.log('⏰ ' + new Date().toLocaleTimeString('pt-BR'));
    console.log('🚨'.repeat(15));
    
    // Números para notificar (no formato CORRETO)
    const numeros = [
      '5521978818116@c.us',  // ADM01
      '5521997724345@c.us',  // Adão
      '5521971532697@c.us'   // Arthur
    ];
    
    // Mensagem
    const mensagem = `🚨 *NOVO PEDIDO PDD*

📝 *Mensagem:*
"${msg.body.substring(0, 100)}"

🏷️ *Grupo:* ${chat.name}
⏰ *${new Date().toLocaleString('pt-BR')}*`;
    
    console.log('\n📤 TENTANDO ENVIAR NOTIFICAÇÕES...');
    
    // Enviar para cada número
    let enviados = 0;
    for (const numero of numeros) {
      const sucesso = await enviarMensagemSegura(numero, mensagem);
      if (sucesso) {
        console.log('✅ ' + numero.replace('@c.us', ''));
        enviados++;
      } else {
        console.log('❌ ' + numero.replace('@c.us', ''));
      }
    }
    
    console.log(`🎯 ${enviados}/${numeros.length} notificações enviadas`);
    console.log('-'.repeat(50));
  }
});

// Iniciar
client.initialize();

// Manter aberto
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando...');
  process.exit(0);
});