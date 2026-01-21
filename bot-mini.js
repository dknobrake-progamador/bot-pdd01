// BOT PDD MINI - SEM BUGS
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🤖 BOT PDD MINI - INICIANDO...\n');

// Cliente MUITO SIMPLES
const client = new Client({
  authStrategy: new LocalAuth({ 
    clientId: 'PDD-MINI-V2'
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

// QR Code
client.on('qr', qr => {
  console.log('QR Code:');
  qrcode.generate(qr, { small: true });
});

// Conectado
client.on('ready', () => {
  console.log('\n✅ BOT CONECTADO AO WHATSAPP!');
  console.log('✅ Agora ele monitora grupos.');
  console.log('✅ Quando alguém pedir CRLV/ATPV:');
  console.log('✅ Vai mostrar aqui no console.');
  console.log('\n⚠️  PARA TESTAR:');
  console.log('1. Em outro celular, no grupo');
  console.log('2. Envie: "teste crlv"');
  console.log('3. Veja se aparece aqui ↓');
});

// DETECTAR MENSAGENS (SÓ MOSTRA NO CONSOLE)
client.on('message', async msg => {
  // Ignorar próprias mensagens
  if (msg.fromMe) return;
  
  // Verificar se é grupo
  const chat = await msg.getChat();
  if (!chat.isGroup) return;
  
  // Verificar se tem palavras-chave
  const texto = msg.body.toLowerCase();
  
  if (texto.includes('crlv') || 
      texto.includes('atpv') || 
      texto.includes('tpv') || 
      texto.includes('gravame')) {
    
    console.log('\n' + '='.repeat(50));
    console.log('🚨🚨🚨 PEDIDO IDENTIFICADO! 🚨🚨🚨');
    console.log('📱 GRUPO: ' + chat.name);
    console.log('💬 MENSAGEM: ' + msg.body.substring(0, 80));
    console.log('⏰ HORA: ' + new Date().toLocaleTimeString());
    console.log('='.repeat(50));
    
    // AGORA VOCÊ FAZ MANUALMENTE:
    console.log('\n📱 MANUALMENTE ENVIE PARA:');
    console.log('1. ADM01: 5521978818116');
    console.log('2. Adão: 5521997724345');
    console.log('3. Arthur: 5521971532697');
    console.log('\n💬 MENSAGEM SUGERIDA:');
    console.log('🚨 Novo pedido no ' + chat.name + ': ' + msg.body.substring(0, 60));
    console.log('-'.repeat(50));
  }
});

// Iniciar
client.initialize();

// Fechar
process.on('SIGINT', () => {
  console.log('\n👋 Fechando bot...');
  process.exit(0);
});