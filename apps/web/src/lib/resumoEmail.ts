/**
 * Monta os e-mails do envio automático a partir dos dados reais do Microsoft 365:
 *
 *  - resumo mensal: licenças, contas por situação, economia possível e as contas de
 *    "redução certa", com os CSVs em anexo;
 *  - alerta de conta inativa: quem passou da janela de análise sem acesso na última semana.
 *
 * Só funções puras (sem React, MSAL ou fetch): a tela Relatórios usa para o "Enviar agora"
 * e o script agendado (scripts/envio-automatico.ts) usa para o disparo no GitHub Actions.
 * O HTML é de e-mail: tabelas e estilo inline, que é o que Outlook e Gmail entendem.
 */
import { linhasParaCsv } from './csv'
import type { AnexoEmail } from './email'
import { calcularEconomia, MOTIVO, type ResumoEconomia } from './economia'
import type { LicencaReal, RegistroMfa, UsuarioReal } from './graphModelos'
import type { Precos } from './precosPadrao'
import { diasParaStatus, type StatusReal } from './status'

export type EntradaResumo = {
  licencas: LicencaReal[]
  usuarios: UsuarioReal[]
  /** null quando o relatório de MFA não pôde ser lido: o e-mail sai sem essa linha. */
  mfa: RegistroMfa[] | null
  precos: Precos
  limiarOcioso: number
  limiarInativo: number
  /** Momento de referência (padrão: agora). */
  agora?: Date
  /** Link do console no rodapé do e-mail. */
  linkConsole?: string
}

export type EmailPronto = { assunto: string; html: string; anexos: AnexoEmail[] }

const LINK_CONSOLE_PADRAO = 'https://lcresende00.github.io/nefro-m365-console/'
const MAXIMO_CONTAS_NO_CORPO = 20

const COR_MARCA = '#e8412a'
const COR_TEXTO = '#1a1d24'
const COR_MUTED = '#6b7180'
const COR_LINHA = '#e1e2e8'
const COR_FUNDO = '#f3f3f6'

const money = (valor: number) =>
  'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (valor: number) => 'R$ ' + valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const numero = (valor: number) => valor.toLocaleString('pt-BR')

const dataCurta = (data: Date) =>
  data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })

const dataLonga = (data: Date) =>
  data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })

/** Sufixo dos nomes de arquivo, no mesmo formato das exportações da tela (dd-mm-aaaa). */
export function dataArquivo(data: Date): string {
  return dataCurta(data).replace(/\//g, '-')
}

export const quando = (dias: number | null) => {
  if (dias === null) return 'nunca acessou'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${numero(dias)} dias`
}

const ROTULO_STATUS: Record<StatusReal, string> = {
  ativo: 'Ativa',
  ocioso: 'Ociosa',
  inativo: 'Inativa',
  nunca: 'Nunca acessou',
}

/** "Microsoft 365 Business Basic" vira "Business Basic" nas tabelas, para não quebrar em várias linhas. */
export function nomeCurtoLicenca(nome: string): string {
  return nome.replace(/^(Microsoft|Office) 365 /, '')
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Contas de pessoas (não convidados) com pelo menos uma licença: o que o console acompanha. */
export function contasAcompanhadas(usuarios: UsuarioReal[]): UsuarioReal[] {
  return usuarios.filter((u) => !u.externo && u.totalLicencas > 0)
}

type ContagemStatus = Record<StatusReal, number> & { desativadas: number; total: number }

export function contarPorStatus(contas: UsuarioReal[], limiarOcioso: number, limiarInativo: number): ContagemStatus {
  const contagem: ContagemStatus = { ativo: 0, ocioso: 0, inativo: 0, nunca: 0, desativadas: 0, total: contas.length }
  for (const conta of contas) {
    if (!conta.habilitada) {
      contagem.desativadas++
      continue
    }
    contagem[diasParaStatus(conta.diasUltimoAcesso, limiarOcioso, limiarInativo)]++
  }
  return contagem
}

/** Contas habilitadas e licenciadas sem nenhum método de MFA registrado; null sem o relatório. */
export function contarSemMfa(contas: UsuarioReal[], mfa: RegistroMfa[] | null): number | null {
  if (!mfa) return null
  const registrado = new Map(mfa.map((m) => [m.upn.toLowerCase(), m.mfaRegistrado]))
  return contas.filter((c) => c.habilitada && registrado.get(c.upn.toLowerCase()) === false).length
}

// ---------- blocos de HTML ----------

function moldura(titulo: string, subtitulo: string, corpo: string, linkConsole: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escaparHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:${COR_FUNDO};font-family:Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:${COR_TEXTO};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR_FUNDO};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid ${COR_LINHA};border-radius:12px;">
<tr><td style="padding:22px 28px 16px;border-bottom:3px solid ${COR_MARCA};">
  <div style="font-size:20px;font-weight:700;letter-spacing:-0.2px;"><span style="color:${COR_MARCA};">Nefro</span><span style="color:${COR_TEXTO};">Control</span></div>
  <div style="font-size:15px;font-weight:600;margin-top:10px;">${escaparHtml(titulo)}</div>
  <div style="font-size:12.5px;color:${COR_MUTED};margin-top:3px;">${escaparHtml(subtitulo)}</div>
</td></tr>
<tr><td style="padding:8px 28px 24px;">
${corpo}
</td></tr>
<tr><td style="padding:14px 28px 18px;border-top:1px solid ${COR_LINHA};font-size:11.5px;color:${COR_MUTED};">
  Enviado automaticamente pelo NefroControl · <a href="${escaparHtml(linkConsole)}" style="color:${COR_MARCA};text-decoration:none;">abrir o console</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function secao(titulo: string): string {
  return `<div style="font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:${COR_MUTED};margin:22px 0 8px;">${escaparHtml(titulo)}</div>`
}

function paragrafo(texto: string): string {
  return `<p style="font-size:13.5px;line-height:1.5;margin:8px 0;">${texto}</p>`
}

function indicadores(itens: Array<{ rotulo: string; valor: string; destaque?: boolean }>): string {
  const celulas = itens
    .map(
      (item) => `<td valign="top" style="padding:0 6px 8px 0;">
  <div style="border:1px solid ${COR_LINHA};border-radius:10px;padding:10px 12px;">
    <div style="font-size:11px;color:${COR_MUTED};">${escaparHtml(item.rotulo)}</div>
    <div style="font-size:18px;font-weight:700;margin-top:2px;color:${item.destaque ? COR_MARCA : COR_TEXTO};">${escaparHtml(item.valor)}</div>
  </div>
</td>`,
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:6px;"><tr>${celulas}</tr></table>`
}

type Celula = string | { principal: string; secundario: string }

function celulaHtml(celula: Celula): string {
  if (typeof celula === 'string') return escaparHtml(celula)
  return `${escaparHtml(celula.principal)}<br><span style="color:${COR_MUTED};font-size:11.5px;">${escaparHtml(celula.secundario)}</span>`
}

function tabela(cabecalho: string[], linhas: Celula[][], alinharDireita: number[] = []): string {
  const th = cabecalho
    .map(
      (c, i) =>
        `<th align="${alinharDireita.includes(i) ? 'right' : 'left'}" style="font-size:11px;font-weight:600;color:${COR_MUTED};text-transform:uppercase;letter-spacing:0.4px;padding:6px 8px;border-bottom:1px solid ${COR_LINHA};white-space:nowrap;">${escaparHtml(c)}</th>`,
    )
    .join('')
  const tr = linhas
    .map(
      (linha) =>
        '<tr>' +
        linha
          .map(
            (celula, i) =>
              `<td align="${alinharDireita.includes(i) ? 'right' : 'left'}" style="font-size:12.5px;padding:7px 8px;border-bottom:1px solid ${COR_LINHA};vertical-align:top;${alinharDireita.includes(i) ? 'white-space:nowrap;' : ''}">${celulaHtml(celula)}</td>`,
          )
          .join('') +
        '</tr>',
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}

// ---------- CSVs ----------

function csvContasSemAcesso(contas: UsuarioReal[], nomesLicencas: (u: UsuarioReal) => string, limiares: EntradaResumo): string {
  const ordenadas = [...contas].sort(
    (a, b) => (b.diasUltimoAcesso ?? 999999) - (a.diasUltimoAcesso ?? 999999) || a.nome.localeCompare(b.nome, 'pt-BR'),
  )
  const linhas: (string | number)[][] = [
    ['Nome', 'E-mail', 'Unidade', 'Situação', 'Conta habilitada', 'Dias sem acesso', 'Último acesso', 'Licenças'],
  ]
  for (const c of ordenadas) {
    linhas.push([
      c.nome,
      c.upn,
      c.departamento ?? '',
      c.habilitada ? ROTULO_STATUS[diasParaStatus(c.diasUltimoAcesso, limiares.limiarOcioso, limiares.limiarInativo)] : 'Desativada',
      c.habilitada ? 'sim' : 'não',
      c.diasUltimoAcesso ?? '',
      c.ultimoAcessoIso ? dataCurta(new Date(c.ultimoAcessoIso)) : 'nunca',
      nomesLicencas(c),
    ])
  }
  return '\uFEFF' + linhasParaCsv(linhas)
}

function csvLicencas(licencas: LicencaReal[], precos: Precos): string {
  const linhas: (string | number)[][] = [
    ['Licença', 'Código técnico', 'Contratadas', 'Em uso', 'Livres', 'Valor unitário (R$/mês)', 'Valor mensal (R$)', 'Valor anual (R$)'],
  ]
  for (const l of licencas.filter((l) => !l.provavelAutosservico)) {
    const preco = precos[l.skuPartNumber]
    linhas.push([
      l.nome,
      l.skuPartNumber,
      l.comprados,
      l.emUso,
      l.livres,
      preco === undefined ? '' : preco.toFixed(2),
      preco === undefined ? '' : (preco * l.comprados).toFixed(2),
      preco === undefined ? '' : (preco * l.comprados * 12).toFixed(2),
    ])
  }
  return '\uFEFF' + linhasParaCsv(linhas)
}

function csvEconomia(resumo: ResumoEconomia): string {
  const linhas: (string | number)[][] = []
  linhas.push(['ECONOMIA POR TIPO DE LICENÇA'])
  linhas.push([
    'Licença',
    'Código técnico',
    'Valor unitário (R$/mês)',
    'Contratadas',
    'Em uso',
    'Livres',
    'Em contas desativadas',
    'Em contas que nunca acessaram',
    'Em contas inativas',
    'Recuperáveis',
    'Economia mensal (R$)',
    'Economia anual (R$)',
    'Em contas ociosas (a revisar)',
    'Potencial adicional (R$/mês)',
  ])
  for (const p of resumo.planos) {
    linhas.push([
      p.nome,
      p.skuPartNumber,
      p.preco === null ? '' : p.preco.toFixed(2),
      p.comprados,
      p.emUso,
      p.livres,
      p.desativadas,
      p.nunca,
      p.inativas,
      p.recuperaveis,
      p.economiaMensal.toFixed(2),
      (p.economiaMensal * 12).toFixed(2),
      p.ociosas,
      p.potencialOciosas.toFixed(2),
    ])
  }
  linhas.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    resumo.totalLivres,
    '',
    '',
    '',
    resumo.totalRecuperaveis,
    resumo.economiaMensal.toFixed(2),
    resumo.economiaAnual.toFixed(2),
    '',
    resumo.potencialOciosas.toFixed(2),
  ])
  linhas.push([])
  linhas.push(['CONTAS COM LICENÇA PARADA'])
  linhas.push(['Nome', 'E-mail', 'Unidade', 'Motivo', 'Redução certa', 'Dias sem acesso', 'Licenças', 'Valor mensal (R$)'])
  for (const c of resumo.contas) {
    linhas.push([
      c.usuario.nome,
      c.usuario.upn,
      c.usuario.departamento ?? '',
      MOTIVO[c.motivo].rotulo,
      MOTIVO[c.motivo].certa ? 'sim' : 'revisar',
      c.usuario.diasUltimoAcesso ?? '',
      c.licencas.map((l) => l.nome).join(' + '),
      c.valorMensal.toFixed(2),
    ])
  }
  return '\uFEFF' + linhasParaCsv(linhas)
}

// ---------- e-mails ----------

export function montarResumoMensal(entrada: EntradaResumo): EmailPronto {
  const agora = entrada.agora ?? new Date()
  const linkConsole = entrada.linkConsole ?? LINK_CONSOLE_PADRAO
  const limiares = { limiarOcioso: entrada.limiarOcioso, limiarInativo: entrada.limiarInativo }
  const contas = contasAcompanhadas(entrada.usuarios)
  const contagem = contarPorStatus(contas, entrada.limiarOcioso, entrada.limiarInativo)
  const resumo = calcularEconomia(entrada.licencas, entrada.usuarios, entrada.precos, limiares)
  const semMfa = contarSemMfa(contas, entrada.mfa)
  const nomesPorSkuId = new Map(entrada.licencas.map((l) => [l.skuId, l.nome]))
  const nomesLicencas = (u: UsuarioReal) => u.skuIds.map((id) => nomesPorSkuId.get(id) ?? id).join(' + ')
  const pagas = entrada.licencas.filter((l) => !l.provavelAutosservico)
  const contratadas = pagas.reduce((s, l) => s + l.comprados, 0)
  const emUso = pagas.reduce((s, l) => s + l.emUso, 0)
  const livres = pagas.reduce((s, l) => s + Math.max(0, l.livres), 0)
  const certas = resumo.contas.filter((c) => MOTIVO[c.motivo].certa)

  const partes: string[] = []

  partes.push(
    paragrafo(
      `Situação do Microsoft 365 da Nefroclínicas em <b>${escaparHtml(dataLonga(agora))}</b>: ` +
        `${numero(contagem.total)} contas licenciadas em ${numero(pagas.length)} planos pagos. ` +
        (resumo.totalRecuperaveis > 0
          ? `Há <b>${numero(resumo.totalRecuperaveis)} licenças paradas</b>, que custam <b>${money(resumo.economiaMensal)} por mês</b> (${money0(resumo.economiaAnual)} por ano).`
          : 'Nenhuma licença parada neste momento.'),
    ),
  )

  partes.push(secao('Licenças'))
  partes.push(
    indicadores([
      { rotulo: 'Contratadas', valor: numero(contratadas) },
      { rotulo: 'Em uso', valor: numero(emUso) },
      { rotulo: 'Livres (sem dono)', valor: numero(livres), destaque: livres > 0 },
    ]),
  )
  partes.push(
    tabela(
      ['Plano', 'Contratadas', 'Em uso', 'Livres', 'R$/mês por licença'],
      pagas.map((l) => [
        l.nome,
        numero(l.comprados),
        numero(l.emUso),
        numero(Math.max(0, l.livres)),
        entrada.precos[l.skuPartNumber] === undefined ? 'não informado' : money(entrada.precos[l.skuPartNumber]),
      ]),
      [1, 2, 3, 4],
    ),
  )

  partes.push(secao('Contas por situação'))
  partes.push(
    indicadores([
      { rotulo: `Ativas (até ${entrada.limiarOcioso} dias)`, valor: numero(contagem.ativo) },
      { rotulo: `Ociosas (${entrada.limiarOcioso + 1}–${entrada.limiarInativo} dias)`, valor: numero(contagem.ocioso) },
      { rotulo: `Inativas (+${entrada.limiarInativo} dias)`, valor: numero(contagem.inativo), destaque: contagem.inativo > 0 },
      { rotulo: 'Nunca acessaram', valor: numero(contagem.nunca), destaque: contagem.nunca > 0 },
      { rotulo: 'Desativadas com licença', valor: numero(contagem.desativadas), destaque: contagem.desativadas > 0 },
    ]),
  )
  if (semMfa !== null) {
    partes.push(
      paragrafo(
        semMfa === 0
          ? 'Todas as contas ativas têm MFA registrado.'
          : `<b>${numero(semMfa)}</b> ${semMfa === 1 ? 'conta ativa ainda não registrou' : 'contas ativas ainda não registraram'} MFA.`,
      ),
    )
  }

  partes.push(secao('Economia possível'))
  partes.push(
    indicadores([
      { rotulo: 'Licenças paradas', valor: numero(resumo.totalRecuperaveis), destaque: resumo.totalRecuperaveis > 0 },
      { rotulo: 'Por mês', valor: money(resumo.economiaMensal), destaque: resumo.economiaMensal > 0 },
      { rotulo: 'Por ano', valor: money0(resumo.economiaAnual), destaque: resumo.economiaAnual > 0 },
      { rotulo: 'A revisar (ociosas)', valor: money(resumo.potencialOciosas) },
    ]),
  )
  partes.push(
    tabela(
      ['Plano', 'Livres', 'Desativadas', 'Nunca acessaram', 'Inativas', 'Economia/mês'],
      resumo.planos.map((p) => [
        p.nome,
        numero(p.livres),
        numero(p.desativadas),
        numero(p.nunca),
        numero(p.inativas),
        p.preco === null ? 'sem valor' : money(p.economiaMensal),
      ]),
      [1, 2, 3, 4, 5],
    ),
  )
  if (resumo.planosSemValor > 0) {
    partes.push(
      paragrafo(
        `<span style="color:${COR_MUTED};">${numero(resumo.planosSemValor)} ${resumo.planosSemValor === 1 ? 'plano está' : 'planos estão'} sem valor unitário informado e ${resumo.planosSemValor === 1 ? 'conta' : 'contam'} zero na economia. O valor pode ser informado na tela Economia do console.</span>`,
      ),
    )
  }

  partes.push(secao(`Redução certa (${numero(certas.length)} ${certas.length === 1 ? 'conta' : 'contas'})`))
  if (certas.length === 0) {
    partes.push(paragrafo(`<span style="color:${COR_MUTED};">Nenhuma conta desativada, inativa ou que nunca acessou está com licença paga.</span>`))
  } else {
    partes.push(
      tabela(
        ['Conta', 'Unidade', 'Situação', 'Último acesso', 'Licenças', 'R$/mês'],
        certas.slice(0, MAXIMO_CONTAS_NO_CORPO).map((c) => [
          { principal: c.usuario.nome, secundario: c.usuario.upn },
          c.usuario.departamento ?? '—',
          MOTIVO[c.motivo].rotulo,
          quando(c.usuario.diasUltimoAcesso),
          c.licencas.map((l) => nomeCurtoLicenca(l.nome)).join(' + '),
          c.semValor && c.valorMensal === 0 ? '—' : money(c.valorMensal),
        ]),
        [5],
      ),
    )
    if (certas.length > MAXIMO_CONTAS_NO_CORPO) {
      partes.push(
        paragrafo(
          `<span style="color:${COR_MUTED};">Mostrando as ${MAXIMO_CONTAS_NO_CORPO} de maior valor. A lista completa, com as ${numero(resumo.contasOciosas)} ociosas a revisar, está no anexo economia-${dataArquivo(agora)}.csv.</span>`,
        ),
      )
    } else if (resumo.contasOciosas > 0) {
      partes.push(
        paragrafo(
          `<span style="color:${COR_MUTED};">Mais ${numero(resumo.contasOciosas)} ${resumo.contasOciosas === 1 ? 'conta ociosa' : 'contas ociosas'} a revisar antes de qualquer corte — lista no anexo economia-${dataArquivo(agora)}.csv.</span>`,
        ),
      )
    }
  }

  partes.push(secao('Anexos'))
  partes.push(
    paragrafo(
      `<span style="color:${COR_MUTED};">contas-sem-acesso-${dataArquivo(agora)}.csv (todas as contas licenciadas, da mais parada para a mais ativa) · licencas-${dataArquivo(agora)}.csv (inventário por plano) · economia-${dataArquivo(agora)}.csv (economia por plano e por conta).</span>`,
    ),
  )

  const titulo = 'Resumo mensal de licenças e contas'
  const subtitulo = `Microsoft 365 · Nefroclínicas · ${dataCurta(agora)}`
  return {
    assunto: `NefroControl · Resumo mensal · ${dataCurta(agora)}`,
    html: moldura(titulo, subtitulo, partes.join('\n'), linkConsole),
    anexos: [
      { nome: `contas-sem-acesso-${dataArquivo(agora)}.csv`, conteudo: csvContasSemAcesso(contas, nomesLicencas, entrada) },
      { nome: `licencas-${dataArquivo(agora)}.csv`, conteudo: csvLicencas(entrada.licencas, entrada.precos) },
      { nome: `economia-${dataArquivo(agora)}.csv`, conteudo: csvEconomia(resumo) },
    ],
  }
}

/**
 * Contas que passaram da janela de análise (limiarInativo) nos últimos `janelaDias` dias.
 * Devolve null quando não há nenhuma: nesse caso nada é enviado.
 */
export function montarAlertaInativas(entrada: EntradaResumo & { janelaDias?: number }): EmailPronto | null {
  const agora = entrada.agora ?? new Date()
  const janela = entrada.janelaDias ?? 7
  const linkConsole = entrada.linkConsole ?? LINK_CONSOLE_PADRAO
  const contas = contasAcompanhadas(entrada.usuarios).filter((c) => c.habilitada)
  const nomesPorSkuId = new Map(entrada.licencas.map((l) => [l.skuId, l.nome]))

  const recemInativas = contas
    .filter(
      (c) =>
        c.diasUltimoAcesso !== null &&
        c.diasUltimoAcesso > entrada.limiarInativo &&
        c.diasUltimoAcesso <= entrada.limiarInativo + janela,
    )
    .sort((a, b) => (b.diasUltimoAcesso ?? 0) - (a.diasUltimoAcesso ?? 0) || a.nome.localeCompare(b.nome, 'pt-BR'))

  if (recemInativas.length === 0) return null

  const totalInativas = contas.filter((c) => c.diasUltimoAcesso !== null && c.diasUltimoAcesso > entrada.limiarInativo).length
  const precoDaConta = (c: UsuarioReal) => c.skuIds.reduce((s, id) => {
    const licenca = entrada.licencas.find((l) => l.skuId === id)
    return s + (licenca ? entrada.precos[licenca.skuPartNumber] ?? 0 : 0)
  }, 0)
  const valorMensal = recemInativas.reduce((s, c) => s + precoDaConta(c), 0)

  const partes: string[] = []
  partes.push(
    paragrafo(
      `<b>${numero(recemInativas.length)}</b> ${recemInativas.length === 1 ? 'conta passou' : 'contas passaram'} de <b>${entrada.limiarInativo} dias sem acesso</b> nos últimos ${janela} dias` +
        (valorMensal > 0 ? `, somando <b>${money(valorMensal)} por mês</b> em licenças.` : '.') +
        ` No total, ${numero(totalInativas)} ${totalInativas === 1 ? 'conta habilitada está inativa' : 'contas habilitadas estão inativas'}.`,
    ),
  )
  partes.push(secao('Contas que passaram da janela'))
  partes.push(
    tabela(
      ['Conta', 'Unidade', 'Último acesso', 'Licenças', 'R$/mês'],
      recemInativas.map((c) => [
        { principal: c.nome, secundario: c.upn },
        c.departamento ?? '—',
        `${quando(c.diasUltimoAcesso)}${c.ultimoAcessoIso ? ' (' + dataCurta(new Date(c.ultimoAcessoIso)) + ')' : ''}`,
        c.skuIds.map((id) => nomeCurtoLicenca(nomesPorSkuId.get(id) ?? id)).join(' + '),
        precoDaConta(c) > 0 ? money(precoDaConta(c)) : '—',
      ]),
      [4],
    ),
  )
  partes.push(
    paragrafo(
      `<span style="color:${COR_MUTED};">Vale confirmar com o gestor se a pessoa ainda está na clínica antes de remover a licença. A tela Economia do console mostra todas as contas paradas.</span>`,
    ),
  )

  const titulo = `${numero(recemInativas.length)} ${recemInativas.length === 1 ? 'conta passou' : 'contas passaram'} de ${entrada.limiarInativo} dias sem acesso`
  return {
    assunto: `NefroControl · ${titulo}`,
    html: moldura(titulo, `Alerta semanal · ${dataCurta(agora)}`, partes.join('\n'), linkConsole),
    anexos: [],
  }
}
