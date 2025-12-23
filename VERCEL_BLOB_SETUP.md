# Configuração do Vercel Blob Storage

Este guia explica como configurar o Vercel Blob Storage para armazenamento de arquivos no Caleidoscópio Educacional.

## 📋 Pré-requisitos

- Conta na Vercel
- Projeto deployado ou conectado na Vercel

## 🚀 Configuração

### 1. Criar Blob Store na Vercel

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Clique em **Create Database**
5. Selecione **Blob** e clique em **Continue**
6. Dê um nome (ex: `caleidoscopio-files`) e clique em **Create**

### 2. Obter o Token de Acesso

Após criar o Blob Store:

1. Na página do Blob Store criado, vá em **Settings**
2. Copie o valor de `BLOB_READ_WRITE_TOKEN`
3. O token será algo como: `vercel_blob_rw_XXXXXXXXXX_YYYYYYYYYYYY`

### 3. Configurar Variáveis de Ambiente

#### Desenvolvimento Local (.env)

Edite o arquivo `.env` na raiz do projeto:

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXX_YYYYYYYYYYYY"
```

#### Produção (Vercel Dashboard)

1. No dashboard da Vercel, vá em **Settings** → **Environment Variables**
2. Adicione a variável:
   - **Name:** `BLOB_READ_WRITE_TOKEN`
   - **Value:** `vercel_blob_rw_XXXXXXXXXX_YYYYYYYYYYYY`
   - **Environment:** Production, Preview, Development (selecione todos)
3. Clique em **Save**

### 4. Redeploy (se necessário)

Se o projeto já estava em produção, faça um redeploy para aplicar as novas variáveis:

```bash
git commit --allow-empty -m "chore: trigger redeploy for blob storage"
git push
```

## 📁 Estrutura de Armazenamento

Os arquivos são organizados por tenant:

```
{tenantId}/
  ├── {timestamp}-{filename}.pdf
  ├── {timestamp}-{filename}.jpg
  └── ...
```

Exemplo:
```
550e8400-e29b-41d4-a716-446655440000/
  ├── 1703001234567-exame_sangue.pdf
  ├── 1703001345678-raio_x.jpg
  └── 1703001456789-laudo_medico.pdf
```

## 🔒 Segurança

- ✅ Validação de tipo de arquivo no backend
- ✅ Limite de tamanho: 10MB por arquivo
- ✅ Isolamento por tenant (multi-tenancy)
- ✅ Autenticação obrigatória para upload
- ✅ Arquivos públicos (acesso via URL direta)

### Tipos de Arquivo Permitidos

**Documentos:**
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- Excel (`.xls`, `.xlsx`)

**Imagens:**
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)

**Vídeos:**
- MP4 (`.mp4`)
- MPEG (`.mpeg`)
- QuickTime (`.mov`)
- WebM (`.webm`)

**Áudios:**
- MP3 (`.mp3`)
- WAV (`.wav`)
- OGG (`.ogg`)
- WebM Audio (`.webm`)

## 💰 Custos (Vercel Blob)

- **Armazenamento:** $0.15/GB por mês
- **Transferência:** $0.30/GB
- **Operações:** Incluídas no plano

**Estimativa para clínica pequena (exemplo):**
- 1000 arquivos de 2MB cada = 2GB armazenados
- Custo mensal: ~$0.30 + transferência

## 🔄 Migração Futura (Opcional)

Se os custos aumentarem, é possível migrar para:

### AWS S3
- Mais barato: ~$0.023/GB
- Código compatível (API similar)
- Requer configuração adicional

### Cloudflare R2
- Sem custo de egress (transferência)
- $0.015/GB armazenado
- API compatível com S3

## 📝 API de Upload

### Endpoint
```
POST /api/upload
```

### Headers
```
X-User-Data: {base64 encoded user data}
X-Auth-Token: {user token}
```

### Body
```
FormData {
  file: File
}
```

### Response
```json
{
  "success": true,
  "data": {
    "url": "https://xxxxx.public.blob.vercel-storage.com/...",
    "fileName": "exame.pdf",
    "fileType": "application/pdf",
    "fileSize": 1234567,
    "downloadUrl": "https://xxxxx.public.blob.vercel-storage.com/..."
  }
}
```

## 🧪 Testando

1. Faça upload de um arquivo de teste:
   - Navegue até **Prontuário** → **Anexos**
   - Clique em **Novo Anexo**
   - Selecione um arquivo (máx 10MB)
   - Preencha os campos e salve

2. Verifique no Dashboard da Vercel:
   - Vá em **Storage** → seu Blob Store
   - Você deve ver o arquivo listado

## ❓ Troubleshooting

### Erro: "BLOB_READ_WRITE_TOKEN is not defined"
- Verifique se a variável está no `.env`
- Reinicie o servidor de desenvolvimento: `npm run dev`

### Erro: "Unauthorized"
- Verifique se o token está correto
- Certifique-se de que não há espaços extras no token

### Erro: "File too large"
- O limite é 10MB por arquivo
- Para arquivos maiores, ajuste em `/api/upload/route.ts`

### Upload lento
- Vercel Blob usa CDN global
- Velocidade depende da localização do servidor
- Primeira vez pode ser mais lenta (cache frio)

## 📚 Documentação Oficial

- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [@vercel/blob Package](https://www.npmjs.com/package/@vercel/blob)
