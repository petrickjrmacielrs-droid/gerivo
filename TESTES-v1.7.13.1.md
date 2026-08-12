# Testes — Gerivo v1.7.13.1

## Usuários

1. Abrir Gestão > Usuários e acessos.
2. Confirmar que a lista carrega sem o alerta genérico.
3. Desligar temporariamente a conexão e confirmar a presença do botão **Tentar novamente**.
4. Criar usuário com nome, usuário, e-mail, senha temporária, função e unidade.
5. Confirmar a criação em Authentication > Users e nas tabelas `profiles`, `company_members` e `store_members`.
6. Tentar usuário duplicado e confirmar mensagem clara.
7. Confirmar que uma falha de vínculo não deixa credencial órfã no Auth.

## Importador

1. Enviar PDF original do Mobato.
2. Enviar PDF original do NBS.
3. Confirmar leitura local sem chave de reconhecimento visual.
4. Revisar quantidades 0,8; 1,1; 1,6 e 4,3.
5. Confirmar que o botão de adicionar permanece bloqueado sem itens selecionados.
6. Enviar imagem sem reconhecimento visual configurado e confirmar mensagem operacional, sem exposição de variável técnica.
