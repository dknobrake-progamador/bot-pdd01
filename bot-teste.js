// BOT TESTE - ENVIA SÓ PARA VOCÊ
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🤖 BOT TESTE - INICIANDO...\n');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'TESTE' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  console.log('📱 QR Code:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('\n✅ BOT CONECTADO!');
  
  // TESTE: Enviar mensagem para você mesmo
  console.log('\n🔧 TESTANDO ENVIO DE MENSAGEM...');
  
  // Tente este formato
  const seuNumero = '5521978818116@c.us';  // SEM o +
  
  client.sendMessage(seuNumero, '✅ BOT PDD TESTE: Estou funcionando!')
    .then(() => {
      console.log('✅ Mensagem de teste ENVIADA com sucesso!');
      console.log('✅ O bot está funcionando!');
      console.log('\n🎯 Agora testando detecção de pedidos...');
    })
    .catch(err => {
      console.log('❌ ERRO ao enviar mensagem de teste:');
      console.log('   Erro:', err.message);
      console.log('\n🔧 Solução: Use o formato correto: 5521978818116@c.us');
    });
});

// Detectar mensagens
client.on('message', async msg => {
  if (msg.fromMe) return;
  
  const chat = await msg.getChat();
  if (!chat.isGroup) return;
  
  const texto = (msg.body || '').toLowerCase();
  if (texto.includes('crlv') || texto.includes('atpv')) {
    console.log('\n🚨 Pedido detectado:', texto.substring(0, 60));
    
    // Testar envio com formato correto
    const seuNumero = '5521978818116@c.us';
    
    try {
      await client.sendMessage(seuNumero, 
        `🚨 Pedido detectado no ${chat.name}:\n${msg.body.substring(0, 100)}`
      );
      console.log('✅ Notificação ENVIADA para ADM01!');
    } catch (erro) {
      console.log('❌ ERRO detalhado:', erro.message);
    }
  }
});

client.initialize();