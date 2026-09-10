/**
 * Funções administrativas (roles) do Microsoft Entra que a tela de nova conta oferece —
 * o mesmo conjunto que o centro de administração do Microsoft 365 mostra em
 * "Funções" ao adicionar um usuário.
 *
 * `id` é o roleTemplateId da função interna; nas funções internas ele coincide com o
 * roleDefinitionId usado em POST /roleManagement/directory/roleAssignments.
 */
export type PapelAdmin = {
  id: string
  nome: string
  descricao: string
  categoria: CategoriaPapel
  /** Função com acesso total ou quase: a tela pede um cuidado extra. */
  sensivel?: boolean
}

export type CategoriaPapel =
  | 'Mais usadas'
  | 'Colaboração'
  | 'Identidade'
  | 'Dispositivos'
  | 'Segurança e conformidade'
  | 'Somente leitura'
  | 'Outras'

export const CATEGORIAS_PAPEIS: CategoriaPapel[] = [
  'Mais usadas',
  'Colaboração',
  'Identidade',
  'Dispositivos',
  'Segurança e conformidade',
  'Somente leitura',
  'Outras',
]

export const PAPEIS_ADMIN: PapelAdmin[] = [
  // ---- Mais usadas (a lista curta do centro de administração) ----
  {
    id: '62e90394-69f5-4237-9190-012177145e10',
    nome: 'Administrador global',
    descricao: 'Acesso total a todos os recursos do Microsoft 365 e do Entra. Use só quando for realmente necessário.',
    categoria: 'Mais usadas',
    sensivel: true,
  },
  {
    id: 'f2ef992c-3afb-46b9-b7cf-a126ee74c451',
    nome: 'Leitor global',
    descricao: 'Vê tudo o que o administrador global vê, sem poder alterar nada.',
    categoria: 'Mais usadas',
  },
  {
    id: 'fe930be7-5e62-47db-91af-98c3a49a38b1',
    nome: 'Administrador de usuários',
    descricao: 'Cria e gerencia usuários e grupos, redefine senhas de não administradores e atribui licenças.',
    categoria: 'Mais usadas',
  },
  {
    id: '29232cdf-9323-42fd-ade2-1d097af3e4de',
    nome: 'Administrador do Exchange',
    descricao: 'Gerencia caixas de correio, caixas compartilhadas e políticas do Exchange Online.',
    categoria: 'Mais usadas',
  },
  {
    id: 'f28a1f50-f6e7-4571-818b-6a12f2af6b6c',
    nome: 'Administrador do SharePoint',
    descricao: 'Gerencia sites do SharePoint e do OneDrive.',
    categoria: 'Mais usadas',
  },
  {
    id: '69091246-20e8-4a56-aa4d-066075b2a7a8',
    nome: 'Administrador do Teams',
    descricao: 'Gerencia o Microsoft Teams: equipes, políticas, reuniões e chamadas.',
    categoria: 'Mais usadas',
  },
  {
    id: '729827e3-9c14-49f7-bb1b-9608f156bbb8',
    nome: 'Administrador de suporte técnico',
    descricao: 'Redefine senhas de não administradores, invalida tokens e abre chamados com a Microsoft.',
    categoria: 'Mais usadas',
  },
  {
    id: 'f023fd81-a637-4b56-95fd-791ac0226033',
    nome: 'Administrador de suporte de serviço',
    descricao: 'Abre chamados de suporte com a Microsoft e acompanha a integridade dos serviços.',
    categoria: 'Mais usadas',
  },

  // ---- Colaboração ----
  {
    id: 'fdd7a751-b60b-444a-984c-02652fe8fa1c',
    nome: 'Administrador de grupos',
    descricao: 'Cria e gerencia grupos, incluindo políticas de nomenclatura e expiração.',
    categoria: 'Colaboração',
  },
  {
    id: '31392ffb-586c-42d1-9346-e59415a2cc4e',
    nome: 'Administrador de destinatários do Exchange',
    descricao: 'Gerencia destinatários (caixas, contatos, listas) sem acesso à configuração do Exchange.',
    categoria: 'Colaboração',
  },
  {
    id: 'baf37b3a-610e-45da-9e62-d9d1e5e8914b',
    nome: 'Administrador de comunicações do Teams',
    descricao: 'Gerencia chamadas, reuniões e telefonia no Teams.',
    categoria: 'Colaboração',
  },
  {
    id: 'a9ea8996-122f-4c74-9520-8edcd192826c',
    nome: 'Administrador do Fabric / Power BI',
    descricao: 'Gerencia o Power BI e o Microsoft Fabric.',
    categoria: 'Colaboração',
  },
  {
    id: '11648597-926c-4cf3-9c36-bcebb0ba8dcc',
    nome: 'Administrador da Power Platform',
    descricao: 'Gerencia Power Apps, Power Automate e ambientes da Power Platform.',
    categoria: 'Colaboração',
  },

  // ---- Identidade ----
  {
    id: '4d6ac14f-3453-41d0-bef9-a3e0c569773a',
    nome: 'Administrador de licenças',
    descricao: 'Atribui e remove licenças de usuários e grupos, sem alterar outras propriedades.',
    categoria: 'Identidade',
  },
  {
    id: '966707d0-3269-4727-9be2-8c3a10f19b9d',
    nome: 'Administrador de senhas',
    descricao: 'Redefine senhas de usuários que não são administradores.',
    categoria: 'Identidade',
  },
  {
    id: 'c4e39bd9-1100-46d3-8c65-fb160da0071f',
    nome: 'Administrador de autenticação',
    descricao: 'Redefine métodos de autenticação (MFA, senha) de usuários que não são administradores.',
    categoria: 'Identidade',
  },
  {
    id: '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3',
    nome: 'Administrador de aplicativos',
    descricao: 'Cria e gerencia registros de aplicativos e aplicativos empresariais.',
    categoria: 'Identidade',
  },
  {
    id: 'e8611ab8-c189-46e8-94e1-60213ab1f814',
    nome: 'Administrador de funções com privilégios',
    descricao: 'Atribui funções administrativas a outras pessoas. Tão sensível quanto o administrador global.',
    categoria: 'Identidade',
    sensivel: true,
  },

  // ---- Dispositivos ----
  {
    id: '3a2c62db-5318-420d-8d74-23affee5d9d5',
    nome: 'Administrador do Intune',
    descricao: 'Gerencia dispositivos, políticas e aplicativos no Intune.',
    categoria: 'Dispositivos',
  },
  {
    id: '7698a772-787b-4ac8-901f-60d6b08affd2',
    nome: 'Administrador de dispositivos na nuvem',
    descricao: 'Habilita, desabilita e exclui dispositivos no Entra.',
    categoria: 'Dispositivos',
  },

  // ---- Segurança e conformidade ----
  {
    id: '194ae4cb-b126-40b2-bd5b-6091b380977d',
    nome: 'Administrador de segurança',
    descricao: 'Gerencia configurações de segurança no Defender, Entra e Purview.',
    categoria: 'Segurança e conformidade',
  },
  {
    id: '17315797-102d-40b4-93e0-432062caca18',
    nome: 'Administrador de conformidade',
    descricao: 'Gerencia políticas de conformidade, retenção e descoberta eletrônica no Purview.',
    categoria: 'Segurança e conformidade',
  },
  {
    id: 'b1be1c3e-b65d-4f19-8427-f6fa0d97feb9',
    nome: 'Administrador de acesso condicional',
    descricao: 'Cria e gerencia políticas de acesso condicional.',
    categoria: 'Segurança e conformidade',
  },

  // ---- Somente leitura ----
  {
    id: '5d6b6bb7-de71-4623-b4af-96380a352509',
    nome: 'Leitor de segurança',
    descricao: 'Vê alertas e configurações de segurança, sem alterar.',
    categoria: 'Somente leitura',
  },
  {
    id: '4a5d8f65-41da-4de4-8968-e035b65339cf',
    nome: 'Leitor de relatórios',
    descricao: 'Acessa os relatórios de uso do Microsoft 365 e do Entra.',
    categoria: 'Somente leitura',
  },
  {
    id: '790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b',
    nome: 'Leitor do centro de mensagens',
    descricao: 'Lê os avisos do centro de mensagens da Microsoft.',
    categoria: 'Somente leitura',
  },

  // ---- Outras ----
  {
    id: 'b0f54661-2d74-4c50-afa3-1ec803f12efe',
    nome: 'Administrador de cobrança',
    descricao: 'Gerencia assinaturas, compras, faturas e pagamentos.',
    categoria: 'Outras',
  },
  {
    id: '44367163-eba1-44c3-98af-f5787879f96a',
    nome: 'Administrador do Dynamics 365',
    descricao: 'Gerencia os aplicativos do Dynamics 365.',
    categoria: 'Outras',
  },
]

export const papelPorId = (id: string): PapelAdmin | undefined => PAPEIS_ADMIN.find((papel) => papel.id === id)
