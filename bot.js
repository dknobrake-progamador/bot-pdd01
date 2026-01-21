// BOT PDD SIMPLES - FUNCIONA
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

console.log('🤖 BOT PDD INICIANDO...\n');

// Carregar configuração
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

// Criar cliente
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'BOT-PDD-01' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR Code
client.on('qr', qr => {
  console.log('📱 ESCANEIE ESTE QR CODE NO WHATSAPP:\n');
  qrcode.generate(qr, { small: false });
  console.log('\n⏰ QR válido por 60 segundos');
});

// Conectado
client.on('ready', () => {
  console.log('\n✅✅✅ BOT CONECTADO! ✅✅✅');
  console.log('📅 ' + new Date().toLocaleString('pt-BR'));
  console.log('\n🎯 MONITORANDO GRUPOS...');
  console.log('🎯 QUANDO ALGUÉM PEDIR CRLV/ATPV:');
  console.log('🎯 VOCÊ RECEBE NOTIFICAÇÃO!');
});

// Mensagens
client.on('message', async msg => {
  if (msg.fromMe) return;
  
  const chat = await msg.getChat();
  if (!chat.isGroup) return;
  
  const texto = (msg.body || '').toLowerCase();
  if (!texto) return;
  
  // Verificar se tem CRLV, ATPV, etc
  const palavras = ['crlv', 'atpv', 'tpv', 'gravame', 'leilao'];
  const encontrou = palavras.some(p => texto.includes(p));
  
  if (encontrou) {
    console.log('\n🚨 PEDIDO: ' + texto.substring(0, 70));
    
    // Enviar para seus números
    const numeros = config.notifyPrivatesE164 || [];
    
    for (const numero of numeros) {
      try {
        const numeroWhats = numero.replace('+', '') + '@c.us';
        await client.sendMessage(numeroWhats, 
          `🚨 Novo pedido no ${chat.name}:\n${msg.body.substring(0, 100)}`
        );
        console.log('✅ Enviado para: ' + numero);
      } catch (erro) {
        console.log('❌ Erro para: ' + numero);
      }
    }
  }
});

// Iniciar
client.initialize();

// Fechar
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando...');
  process.exit(0);
});