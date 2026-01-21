// BOT PDD - QR CODE PEQUENO
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

console.log('🤖 BOT PDD INICIANDO...\n');

// Configuração
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

// Cliente
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'PDD-MINI' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR Code PEQUENO
client.on('qr', qr => {
  console.clear();
  console.log('='.repeat(40));
  console.log('📱 QR CODE (PEQUENO):');
  console.log('='.repeat(40));
  
  // PEQUENO e cabe na tela
  qrcode.generate(qr, { small: true });
  
  console.log('\nNo celular:');
  console.log('1. WhatsApp → 3 pontinhos');
  console.log('2. Aparelhos conectados');
  console.log('3. Conectar um aparelho');
  console.log('4. ESCANEIE ↑');
  console.log('='.repeat(40));
});

// Conectado
client.on('ready', () => {
  console.log('\n✅ BOT CONECTADO!');
  console.log('✅ Monitorando grupos...');
});

// Mensagens
client.on('message', async msg => {
  if (msg.fromMe) return;
  
  const chat = await msg.getChat();
  if (!chat.isGroup) return;
  
  const texto = (msg.body || '').toLowerCase();
  const palavras = ['crlv', 'atpv', 'tpv', 'gravame'];
  
  if (palavras.some(p => texto.includes(p))) {
    console.log('\n🚨 Pedido: ' + texto.substring(0, 60));
    
    // Enviar notificações
    const numeros = config.notifyPrivatesE164 || [];
    for (const num of numeros) {
      try {
        await client.sendMessage(num.replace('+', '') + '@c.us', 
          `🚨 Pedido: ${texto.substring(0, 80)}`
        );
        console.log('✅ Enviado para: ' + num);
      } catch (e) {
        console.log('❌ Erro para: ' + num);
      }
    }
  }
});

// Iniciar
client.initialize();