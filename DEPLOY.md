# Deploy na Hostinger KVM2

Este projeto deve rodar como aplicacao Node.js em uma VPS, porque a rota
`/api/prophet` executa Python para recalcular o forecast.

Arquitetura recomendada:

```txt
internet
  -> Nginx com HTTPS
    -> Docker Compose em 127.0.0.1:3000
      -> Next.js
        -> Python/Prophet
```

## 1. Antes de enviar para o GitHub

A pasta `.venv` nao deve ser versionada. Se ela ja estiver rastreada pelo Git,
remova apenas do indice:

```bash
git rm -r --cached .venv
git add .gitignore eslint.config.mjs app/api/prophet/route.ts compose.yaml DEPLOY.md
git commit -m "Prepare deploy with Docker"
git push
```

Isso nao apaga a `.venv` do seu computador; apenas impede que ela va para o
repositorio.

## 2. Preparar a VPS

Entre na VPS:

```bash
ssh root@IP_DA_SUA_VPS
```

Atualize o servidor:

```bash
apt update
apt upgrade -y
apt install -y git curl ca-certificates nginx
```

Instale Docker e Docker Compose pelo metodo que voce preferir na Hostinger. Se
usar uma imagem/template Docker da propria Hostinger, essa parte pode ja estar
pronta.

## 3. Baixar e subir o projeto

```bash
mkdir -p /opt/apps
cd /opt/apps
git clone URL_DO_SEU_REPOSITORIO ibov-momentum
cd ibov-momentum
docker compose up -d --build
docker compose ps
curl -I http://127.0.0.1:3000
```

Se o `curl` retornar `200`, o app esta rodando internamente na VPS.

## 4. Configurar Nginx

Crie a configuracao:

```bash
nano /etc/nginx/sites-available/ibov-momentum
```

Use este modelo, trocando o dominio:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative:

```bash
ln -s /etc/nginx/sites-available/ibov-momentum /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 5. Ativar HTTPS

Depois que o DNS do dominio estiver apontando para a VPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com
```

## 6. Atualizar uma nova versao

```bash
cd /opt/apps/ibov-momentum
git pull
docker compose up -d --build
docker compose logs -f app
```

## 7. Comandos uteis

```bash
docker compose ps
docker compose logs -f app
docker compose restart app
docker compose down
```

## Observacoes de producao

- O container fica preso em `127.0.0.1:3000`; a internet acessa pelo Nginx.
- O Python usado pelo Prophet fica dentro da imagem Docker em `/opt/venv`.
- Os dados atuais sao didaticos e usam `yfinance`; para produto comercial,
  considere uma API financeira com termos de uso claros.
- Antes de vender assinatura, adicione login, banco de dados, auditoria dos
  sinais e avisos legais mais robustos.
