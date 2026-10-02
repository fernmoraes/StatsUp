# Releases

Coloque aqui o APK gerado pelo EAS (ex.: `StatsUp-beta2.apk`). Os arquivos
`.apk`/`.aab` desta pasta **não vão para o git** (ver `.gitignore`): são grandes
demais para o histórico. O download público é feito pelo **GitHub Releases**.

## Publicar uma versão nova

1. Em `app.json`, aumente `version` (ex.: `1.0.2-beta`), `android.versionCode` e
   `ios.buildNumber` (sempre +1). Faça o mesmo `version` no `package.json`.
2. Gere o APK: `eas build -p android --profile preview` e salve nesta pasta.
3. No GitHub → **Releases** → **Draft a new release** → tag `v<versão>`
   (ex.: `v1.0.2-beta`) → anexe o APK → marque **Set as a pre-release** →
   **Publish release**.
4. Em [`site/version.json`](../site/version.json), atualize `latestVersionCode` e
   `latestVersion`. Commit + push (o site publica sozinho).

## Desativar uma versão antiga (atualização obrigatória)

Em `site/version.json`, aumente `minVersionCode` para o número da versão mínima
aceita. Quem estiver abaixo dele vê a tela **"Atualize o StatsUp"** e não consegue
usar o app até instalar a versão nova. Quem estiver só abaixo de
`latestVersionCode` vê um aviso dispensável de "Nova versão".

Faça isso **depois** de publicar a versão nova no Releases, senão o botão de
download não terá para onde levar.

| Versão | versionCode | Verificação de versão |
|---|---|---|
| 1.0.0-beta | 1 | não tem (não pode ser bloqueada) |
| 1.0.1-beta | 2 | tem |
