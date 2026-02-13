async function assinarPlano(dadosDoFormulario) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch('https://seu-projeto.supabase.co/functions/v1/asaas-subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}` // Importante enviar o token!
    },
    body: JSON.stringify({
      planId: 1, // ID do plano na tabela asaas_plans
      billingType: 'PIX', // ou 'BOLETO' ou 'CREDIT_CARD'
      cpfCnpj: '12345678900',
      mobilePhone: '11999999999',
      // Se for cartao, adicionar: creditCard: { ... }, creditCardHolderInfo: { ... }
    })
  });

  const result = await response.json();
  
  if (result.success) {
     if (result.paymentData?.pixQrCode) {
        // Mostrar QR Code na tela
        console.log("Cola e Copia:", result.paymentData.pixQrCode.payload);
        console.log("Imagem Base64:", result.paymentData.pixQrCode.encodedImage);
     } else {
        // Redirecionar para fatura
        window.open(result.paymentData.invoiceUrl);
     }
  } else {
     alert('Erro: ' + result.error);
  }
}