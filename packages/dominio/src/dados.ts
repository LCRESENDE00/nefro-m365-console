/**
 * Tenant de demonstracao.
 *
 * Fonte unica dos dados ficticios: o seed do Prisma grava isto no banco, e a
 * demo estatica publicada no GitHub Pages le exatamente o mesmo conteudo sem
 * backend nenhum. Nomes, cargos e o dominio `nefroclinicas.exemplo` sao
 * inventados e nao correspondem a pessoas ou contas reais.
 */

export const DOMINIO_EMAIL = 'nefroclinicas.exemplo'

export type SkuSeed = {
  codigo: string
  nome: string
  curto: string
  preco: number
  comprados: number
  cor: string
  ordem: number
}

export const SKUS: SkuSeed[] = [
  { codigo: 'bizprem', nome: 'Microsoft 365 Business Premium', curto: 'Business Premium', preco: 106.5, comprados: 18, cor: '#5B8CFF', ordem: 1 },
  { codigo: 'bizstd', nome: 'Microsoft 365 Business Standard', curto: 'Business Standard', preco: 74.9, comprados: 14, cor: '#3FBFA8', ordem: 2 },
  { codigo: 'exo1', nome: 'Exchange Online (Plano 1)', curto: 'Exchange P1', preco: 22.9, comprados: 10, cor: '#E0A44A', ordem: 3 },
  { codigo: 'teams', nome: 'Teams Essentials', curto: 'Teams Essentials', preco: 22.5, comprados: 6, cor: '#B784F0', ordem: 4 },
]

export type UsuarioSeed = {
  nome: string
  upn: string
  cargo: string
  depto: string
  skuCodigo: string
  diasUltimoAcesso: number | null
  mfa: boolean
  oneDriveGb: number
  arquivos: number
  ehRecurso: boolean
}

const u = (
  nome: string,
  local: string,
  cargo: string,
  depto: string,
  skuCodigo: string,
  diasUltimoAcesso: number | null,
  mfa: boolean,
  oneDriveGb: number,
  arquivos: number,
): UsuarioSeed => ({
  nome,
  upn: `${local}@${DOMINIO_EMAIL}`,
  cargo,
  depto,
  skuCodigo,
  diasUltimoAcesso,
  mfa,
  oneDriveGb,
  arquivos,
  // Salas e caixas compartilhadas nunca registram login.
  ehRecurso: diasUltimoAcesso === null,
})

export const USUARIOS: UsuarioSeed[] = [
  u('Ana Beatriz Moraes', 'ana.moraes', 'Nefrologista', 'Nefrologia', 'bizprem', 1, true, 12.4, 890),
  u('Carlos Eduardo Lima', 'carlos.lima', 'Diretor Clínico', 'Diretoria', 'bizprem', 0, true, 28.9, 1640),
  u('Mariana Castro', 'mariana.castro', 'Enfermeira Chefe', 'Enfermagem', 'bizprem', 2, true, 7.8, 512),
  u('Rafael Nogueira', 'rafael.nogueira', 'Analista de TI', 'TI', 'bizprem', 0, true, 41.2, 3120),
  u('Juliana Prado', 'juliana.prado', 'Recepcionista', 'Recepção', 'bizstd', 3, false, 2.1, 180),
  u('Fernanda Alves', 'fernanda.alves', 'Faturamento', 'Faturamento', 'bizstd', 1, true, 5.6, 940),
  u('Bruno Siqueira', 'bruno.siqueira', 'Nefrologista', 'Nefrologia', 'bizprem', 4, true, 9.3, 610),
  u('Patrícia Rezende', 'patricia.rezende', 'Técnica de Enfermagem', 'Enfermagem', 'bizstd', 6, false, 1.4, 96),
  u('Gustavo Teixeira', 'gustavo.teixeira', 'Analista Financeiro', 'Faturamento', 'bizstd', 2, true, 6.9, 720),
  u('Luana Ferreira', 'luana.ferreira', 'Recepcionista', 'Recepção', 'exo1', 5, false, 0.8, 54),
  u('Diego Marques', 'diego.marques', 'Biomédico', 'Laboratório', 'bizstd', 8, true, 4.2, 388),
  u('Camila Souza', 'camila.souza', 'Enfermeira', 'Enfermagem', 'bizstd', 12, true, 3.1, 240),
  u('Roberto Duarte', 'roberto.duarte', 'Nefrologista', 'Nefrologia', 'bizprem', 9, true, 11.7, 830),
  u('Isabela Cunha', 'isabela.cunha', 'Assistente Administrativa', 'Administrativo', 'bizstd', 14, false, 2.9, 310),
  u('Marcelo Pinto', 'marcelo.pinto', 'Técnico de Manutenção', 'Manutenção', 'exo1', 21, false, 0.4, 28),
  u('Larissa Barbosa', 'larissa.barbosa', 'Nutricionista', 'Nutrição', 'bizstd', 7, true, 3.8, 402),
  u('Thiago Ramos', 'thiago.ramos', 'Psicólogo', 'Psicologia', 'bizstd', 18, false, 1.9, 150),
  u('Renata Vieira', 'renata.vieira', 'Farmacêutica', 'Farmácia', 'bizprem', 11, true, 8.4, 690),
  u('Vinícius Costa', 'vinicius.costa', 'Auxiliar de Laboratório', 'Laboratório', 'exo1', 26, false, 0.6, 41),
  u('Amanda Pereira', 'amanda.pereira', 'Recepcionista', 'Recepção', 'bizstd', 22, false, 2.3, 205),
  u('Felipe Andrade', 'felipe.andrade', 'Coordenador de Enfermagem', 'Enfermagem', 'bizprem', 16, true, 10.1, 740),
  u('Beatriz Rocha', 'beatriz.rocha', 'Assistente Social', 'Serviço Social', 'bizstd', 29, false, 1.6, 128),
  u('Leonardo Dias', 'leonardo.dias', 'Analista de RH', 'RH', 'bizprem', 13, true, 7.2, 560),
  u('Sofia Martins', 'sofia.martins', 'Auxiliar Administrativo', 'Administrativo', 'exo1', 34, false, 0.9, 72),
  u('Rodrigo Freitas', 'rodrigo.freitas', 'Nefrologista', 'Nefrologia', 'bizprem', 42, true, 6.5, 470),
  u('Natália Gomes', 'natalia.gomes', 'Enfermeira', 'Enfermagem', 'bizstd', 47, false, 2.7, 214),
  u('Eduardo Batista', 'eduardo.batista', 'Técnico de Enfermagem', 'Enfermagem', 'bizstd', 55, false, 1.1, 88),
  u('Priscila Mendes', 'priscila.mendes', 'Recepcionista', 'Recepção', 'exo1', 63, false, 0.5, 36),
  u('André Carvalho', 'andre.carvalho', 'Consultor Externo', 'Diretoria', 'bizprem', 71, false, 3.4, 190),
  u('Tatiana Lopes', 'tatiana.lopes', 'Faturamento', 'Faturamento', 'bizstd', 78, false, 4.9, 520),
  u('Márcio Aguiar', 'marcio.aguiar', 'Técnico de TI', 'TI', 'bizprem', 86, true, 5.2, 410),
  u('Vanessa Ribeiro', 'vanessa.ribeiro', 'Nutricionista', 'Nutrição', 'bizstd', 94, false, 2.2, 176),
  u('Henrique Braga', 'henrique.braga', 'Auxiliar de Laboratório', 'Laboratório', 'exo1', 112, false, 0.3, 19),
  u('Cristiane Nunes', 'cristiane.nunes', 'Recepcionista', 'Recepção', 'bizstd', 138, false, 1.8, 142),
  u('Paulo Sérgio Matos', 'paulo.matos', 'Ex-colaborador', 'Manutenção', 'bizprem', 186, false, 4.1, 268),
  u('Débora Antunes', 'debora.antunes', 'Estagiária', 'Administrativo', 'teams', 204, false, 0.2, 11),
  u('Sala Reunião 1', 'sala.reuniao1', 'Recurso', 'Infraestrutura', 'teams', null, false, 0, 0),
  u('Recepção Geral', 'recepcao.geral', 'Caixa compartilhada', 'Recepção', 'exo1', null, false, 0, 0),
]

/** Serie agregada do tenant: usuarios com acesso semanal nas ultimas 20 semanas. */
export const SERIE_TENANT = [26, 25, 27, 24, 26, 23, 25, 22, 24, 21, 23, 20, 22, 21, 19, 20, 18, 19, 17, 18]

/**
 * Serie individual de 12 semanas, deterministica a partir do ultimo acesso:
 * quem esta ativo oscila em torno de 6 acessos, quem parou decai ate zero.
 */
export function serieDoUsuario(diasUltimoAcesso: number | null): number[] {
  if (diasUltimoAcesso === null) return Array.from({ length: 12 }, () => 0)
  const ativo = diasUltimoAcesso <= 30
  return Array.from({ length: 12 }, (_, i) =>
    ativo ? 4 + Math.round(Math.sin(i) * 2 + 2) : Math.max(0, 4 - Math.floor(i / 2)),
  )
}

export const CONFIGURACOES_PADRAO: Array<{ chave: string; valor: string }> = [
  { chave: 'limiarOcioso', valor: '30' },
  { chave: 'limiarInativo', valor: '90' },
  { chave: 'atualizarAoAbrir', valor: 'true' },
  { chave: 'incluirRecursos', valor: 'true' },
  { chave: 'modoDemo', valor: 'true' },
  { chave: 'resumoMensal', valor: 'true' },
  { chave: 'alertaContaInativa', valor: 'true' },
  { chave: 'copiaPastaTI', valor: 'false' },
  { chave: 'tenantId', valor: '00000000-0000-4000-8000-000000000001' },
  { chave: 'clientId', valor: '00000000-0000-4000-8000-000000000002' },
  { chave: 'contaConectada', valor: `rafael.nogueira@${DOMINIO_EMAIL}` },
  { chave: 'quotaTenantGb', valor: '1024' },
]

export const EXPORTACOES_INICIAIS = [
  { arquivo: 'usuarios-inativos-01-07-2026.xlsx', geradoPor: 'Rafael Nogueira', linhas: 38, criadoEm: '2026-07-01T08:00:00.000Z' },
  { arquivo: 'licencas-01-07-2026.xlsx', geradoPor: 'Rafael Nogueira', linhas: 4, criadoEm: '2026-07-01T08:00:00.000Z' },
  { arquivo: 'onedrive-14-06-2026.csv', geradoPor: 'Rafael Nogueira', linhas: 38, criadoEm: '2026-06-14T16:20:00.000Z' },
]
