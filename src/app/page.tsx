"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Page = "dashboard" | "management" | "catalog" | "checklist" | "orders" | "quotes";
type SettingsTab = "IDENTITY" | "MODULES" | "CHECKLIST" | "QUOTES";
type IconName = "home" | "clipboard" | "wrench" | "file" | "settings" | "layers" | "menu" | "store" | "user" | "logout" | "chevron" | "eye" | "eyeOff" | "car" | "users" | "modules" | "trash" | "camera";
type CompanyModule = "CATALOG" | "CHECKLIST" | "ORDERS" | "QUOTES";
type CompanyProfile = "FULL" | "QUOTE_ONLY" | "CUSTOM";
type QuoteDeliveryMode = "LINK" | "MESSAGE" | "BOTH";
type ReportMode = "SUMMARY" | "FULL";
type StageId = "checkin" | "checkup" | "quality" | "checkout";
type CheckupType = "REVISAO" | "DIAGNOSTICO";
type StartTarget = "CHECKLIST" | "ORDER" | "QUOTE";
type StageStatus = "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO";
type AttendanceStatus =
  | "CHECKIN"
  | "AGUARDANDO_CHECKUP"
  | "CHECKUP"
  | "AGUARDANDO_QUALITY"
  | "QUALITY"
  | "AGUARDANDO_CHECKOUT"
  | "CHECKOUT"
  | "CONCLUIDO";
type ResponseMode = "CONDITION" | "PRESENCE" | "YES_NO" | "WASH";
type ItemValue =
  | "PENDENTE"
  | "BOM"
  | "REGULAR"
  | "RUIM"
  | "NAO_SE_APLICA"
  | "SIM"
  | "NAO"
  | "AVARIADO"
  | "EXPRESSA"
  | "OUTRO";
type CatalogKind = "SERVICO" | "PRODUTO" | "PECA";
type ServiceOrderStatus = "ABERTA" | "FECHADA" | "PENDENTE" | "INCOMPLETA";
type QuoteStatus =
  | "ABERTO"
  | "FECHADO"
  | "AGUARDANDO_APROVACAO"
  | "AGUARDANDO_COTACAO"
  | "AGUARDANDO_DIGITACAO"
  | "INCOMPLETO"
  | "AGUARDANDO_RETORNO_CLIENTE"
  | "AGUARDANDO_DESCONTO";
type ChecklistListStatus = "TODOS" | "ABERTO" | "CONCLUIDO" | "INCOMPLETO" | "EM_ANDAMENTO";
type OrderListStatus = "TODOS" | ServiceOrderStatus;
type QuoteListStatus = "TODOS" | QuoteStatus;
type PaymentMethod = "PIX" | "DEBITO" | "CREDITO" | "DINHEIRO" | "OUTRO";
type QuoteMessageTemplate = "PROFISSIONAL" | "DIRETA" | "CONSULTIVA" | "PREVENTIVA";

type Store = { id: string; name: string };
type ServiceType = { id: string; name: string; active: boolean };
type CompanyIdentity = {
  displayName: string;
  logo: string;
  sidebarColor: string;
};
type DocumentLine = {
  id: string;
  catalogItemId: string | null;
  name: string;
  description: string;
  kind: CatalogKind;
  quantity: number;
  unitPrice: number;
};
type Customer = {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};
type Vehicle = {
  id: string;
  storeId: string;
  customerId: string;
  plate: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};
type TechnicalReport = {
  complaint: string;
  diagnosis: string;
  tests: string;
  recommendation: string;
  conclusion: string;
};
type StartFlowState = { open: boolean; target: StartTarget };
type UserProfile = { preferredName: string; phone: string; email: string; photo: string };
type Photo = { id: string; name: string; dataUrl: string; createdAt: string };
type CatalogItem = {
  id: string;
  name: string;
  category: string;
  kind: CatalogKind;
  price: number;
  active: boolean;
  standard: boolean;
  serviceTypeId?: string;
};
type TemplateItem = {
  key: string;
  label: string;
  mode: ResponseMode;
  photoRecommended?: boolean;
  carZone?: boolean;
};
type TemplateGroup = {
  key: string;
  label: string;
  items: TemplateItem[];
};
type StageTemplate = {
  id: StageId;
  label: string;
  description: string;
  groups: TemplateGroup[];
};
type CheckItem = TemplateItem & {
  id: string;
  categoryKey: string;
  category: string;
  value: ItemValue;
  note: string;
  photos: Photo[];
};
type Stage = {
  id: StageId;
  label: string;
  description: string;
  status: StageStatus;
  completedAt?: string;
  completedBy?: string;
  photos: Photo[];
  items: CheckItem[];
};
type Reception = {
  customer: string;
  phone: string;
  email: string;
  vehicle: string;
  plate: string;
  mileage: string;
  fuel: string;
  responsible: string;
  osNumber: string;
  technician: string;
};
type Attendance = {
  id: string;
  storeId: string;
  customerId: string;
  vehicleId: string;
  checkupType: CheckupType;
  technicalReport: TechnicalReport;
  code: string;
  createdAt: string;
  updatedAt: string;
  status: AttendanceStatus;
  reception: Reception;
  stages: Stage[];
};
type ChecklistSettings = {
  name: string;
  enabledItemKeys: Record<StageId, string[]>;
};
type CompanySettings = {
  profile: CompanyProfile;
  modules: Record<CompanyModule, boolean>;
  quoteDeliveryMode: QuoteDeliveryMode;
  quoteMessageTemplate: QuoteMessageTemplate;
};
type ServiceOrder = {
  id: string;
  storeId: string;
  customerId: string;
  vehicleId: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  status: ServiceOrderStatus;
  attendanceId: string | null;
  customer: string;
  vehicle: string;
  plate: string;
  responsible: string;
  total: number;
  complaint: string;
  diagnosis: string;
  internalNotes: string;
  technician: string;
  expectedDelivery: string;
  items: DocumentLine[];
};
type Quote = {
  id: string;
  storeId: string;
  customerId: string;
  vehicleId: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  status: QuoteStatus;
  attendanceId: string | null;
  customer: string;
  vehicle: string;
  plate: string;
  responsible: string;
  total: number;
  notes: string;
  paymentMethod: PaymentMethod;
  installments: number;
  validityDays: number;
  discountAmount: number;
  discountPercent: number;
  messageTemplate: QuoteMessageTemplate;
  items: DocumentLine[];
};
type StoreData = {
  customers: Customer[];
  vehicles: Vehicle[];
  catalog: CatalogItem[];
  serviceTypes: ServiceType[];
  checklistSettings: ChecklistSettings;
  companySettings: CompanySettings;
  companyIdentity: CompanyIdentity;
  attendances: Attendance[];
  orders: ServiceOrder[];
  quotes: Quote[];
};

const STORES: Store[] = [
  { id: "rs-performance", name: "RS Performance" },
  { id: "iesa-nissan", name: "IESA Nissan" },
  { id: "demo", name: "Oficina Demonstração" },
];

const NAV: Array<{ id: Page; label: string; icon: IconName; module?: CompanyModule; hidden?: boolean }> = [
  { id: "dashboard", label: "Tela inicial", icon: "home" },
  { id: "checklist", label: "Checklist", icon: "clipboard", module: "CHECKLIST" },
  { id: "orders", label: "Ordens de serviço", icon: "wrench", module: "ORDERS" },
  { id: "quotes", label: "Orçamentos", icon: "file", module: "QUOTES" },
  { id: "management", label: "Gestão", icon: "settings" },
  { id: "catalog", label: "Itens e serviços", icon: "layers", module: "CATALOG", hidden: true },
];

const MODULE_INFO: Record<CompanyModule, { label: string; description: string }> = {
  CATALOG: { label: "Itens e serviços", description: "Catálogo, preços e serviços padrão da empresa." },
  CHECKLIST: { label: "Checklist", description: "Check-in, Check-up, Check-out, fotos e relatórios." },
  ORDERS: { label: "Ordens de serviço", description: "Execução, responsáveis, andamento e entrega." },
  QUOTES: { label: "Orçamentos", description: "Criação, mensagem comercial e aprovação pelo cliente." },
};

const STANDARD_SERVICE_LIBRARY: Array<Omit<CatalogItem, "id" | "active">> = [
  { name: "Troca de óleo do motor", category: "Manutenção", kind: "SERVICO", price: 180, standard: true, serviceTypeId: "manutencao" },
  { name: "Alinhamento", category: "Pneus e geometria", kind: "SERVICO", price: 120, standard: true, serviceTypeId: "pneus-geometria" },
  { name: "Balanceamento", category: "Pneus e geometria", kind: "SERVICO", price: 35, standard: true, serviceTypeId: "pneus-geometria" },
  { name: "Diagnóstico eletrônico", category: "Diagnóstico", kind: "SERVICO", price: 150, standard: true, serviceTypeId: "diagnostico" },
  { name: "Revisão preventiva", category: "Revisão", kind: "SERVICO", price: 250, standard: true, serviceTypeId: "revisao" },
];

const CHECKLIST_TEMPLATE: StageTemplate[] = [
  {
    id: "checkin",
    label: "Check-in",
    description: "Inspeção interna e volta externa 360° organizada por regiões do veículo.",
    groups: [
      {
        key: "interior",
        label: "1. Interior e pertences",
        items: [
          { key: "interior-dashboard", label: "Painel e console", mode: "CONDITION", photoRecommended: true },
          { key: "front-seats", label: "Bancos dianteiros", mode: "CONDITION", photoRecommended: true },
          { key: "rear-seats", label: "Bancos traseiros", mode: "CONDITION", photoRecommended: true },
          { key: "mats", label: "Tapetes", mode: "PRESENCE" },
          { key: "interior-trim", label: "Forros e acabamentos internos", mode: "CONDITION", photoRecommended: true },
          { key: "sound", label: "Som / multimídia", mode: "CONDITION" },
          { key: "air-conditioning", label: "Ar-condicionado", mode: "CONDITION" },
          { key: "belongings", label: "Pertences dentro do veículo?", mode: "YES_NO", photoRecommended: true },
        ],
      },
      {
        key: "left-side",
        label: "2. Lateral esquerda",
        items: [
          { key: "wheel-fl", label: "01 · Roda dianteira esquerda", mode: "CONDITION", photoRecommended: true },
          { key: "body-front-left", label: "02 · Para-lama dianteiro esquerdo", mode: "CONDITION", photoRecommended: true },
          { key: "door-front-left", label: "03 · Porta dianteira esquerda", mode: "CONDITION", photoRecommended: true },
          { key: "door-rear-left", label: "04 · Porta traseira esquerda", mode: "CONDITION", photoRecommended: true },
          { key: "body-rear-left", label: "05 · Lateral traseira esquerda", mode: "CONDITION", photoRecommended: true },
          { key: "wheel-rl", label: "06 · Roda traseira esquerda", mode: "CONDITION", photoRecommended: true },
        ],
      },
      {
        key: "rear-trunk",
        label: "3. Traseira e porta-malas",
        items: [
          { key: "body-rear", label: "07 · Para-choque traseiro", mode: "CONDITION", photoRecommended: true },
          { key: "body-trunk", label: "08 · Tampa traseira / porta-malas", mode: "CONDITION", photoRecommended: true },
          { key: "taillights", label: "09 · Lanternas traseiras", mode: "CONDITION" },
          { key: "triangle", label: "Triângulo", mode: "PRESENCE" },
          { key: "jack", label: "Macaco", mode: "PRESENCE" },
          { key: "wheel-wrench", label: "Chave de roda", mode: "PRESENCE" },
        ],
      },
      {
        key: "right-side",
        label: "4. Lateral direita",
        items: [
          { key: "wheel-rr", label: "10 · Roda traseira direita", mode: "CONDITION", photoRecommended: true },
          { key: "body-rear-right", label: "11 · Lateral traseira direita", mode: "CONDITION", photoRecommended: true },
          { key: "door-rear-right", label: "12 · Porta traseira direita", mode: "CONDITION", photoRecommended: true },
          { key: "door-front-right", label: "13 · Porta dianteira direita", mode: "CONDITION", photoRecommended: true },
          { key: "body-front-right", label: "14 · Para-lama dianteiro direito", mode: "CONDITION", photoRecommended: true },
          { key: "wheel-fr", label: "15 · Roda dianteira direita", mode: "CONDITION", photoRecommended: true },
        ],
      },
      {
        key: "front",
        label: "5. Dianteira",
        items: [
          { key: "body-front", label: "16 · Para-choque dianteiro", mode: "CONDITION", photoRecommended: true },
          { key: "body-hood", label: "17 · Capô", mode: "CONDITION", photoRecommended: true },
          { key: "headlights", label: "18 · Faróis", mode: "CONDITION" },
          { key: "fog-lights", label: "19 · Faróis de neblina", mode: "CONDITION" },
          { key: "windshield", label: "20 · Para-brisa", mode: "CONDITION", photoRecommended: true },
          { key: "wipers", label: "21 · Palhetas do para-brisa", mode: "CONDITION" },
        ],
      },
      {
        key: "upper",
        label: "6. Vidros, retrovisores e teto",
        items: [
          { key: "side-windows", label: "Vidros laterais", mode: "CONDITION", photoRecommended: true },
          { key: "mirrors", label: "Retrovisores", mode: "CONDITION", photoRecommended: true },
          { key: "body-roof", label: "Teto", mode: "CONDITION", photoRecommended: true },
        ],
      },
      {
        key: "information",
        label: "7. Informações finais",
        items: [
          { key: "vehicle-doc", label: "Documento do veículo", mode: "PRESENCE" },
          { key: "owner-manual", label: "Manual do proprietário", mode: "PRESENCE" },
          { key: "wash-request", label: "Realizar lavagem?", mode: "WASH" },
          { key: "road-test-in", label: "Teste de rodagem inicial realizado?", mode: "YES_NO" },
        ],
      },
    ],
  },
  {
    id: "checkup",
    label: "Check-up",
    description: "Inspeção técnica executada pelo consultor ou mecânico.",
    groups: [
      {
        key: "fluidos",
        label: "Fluidos e níveis",
        items: [
          { key: "engine-oil", label: "Óleo do motor", mode: "CONDITION", photoRecommended: true },
          { key: "brake-fluid", label: "Fluido de freio", mode: "CONDITION" },
          { key: "steering-fluid", label: "Fluido de direção", mode: "CONDITION" },
          { key: "coolant", label: "Fluido de arrefecimento", mode: "CONDITION", photoRecommended: true },
          { key: "washer-fluid", label: "Líquido do limpador", mode: "CONDITION" },
          { key: "transmission-oil", label: "Óleo da transmissão", mode: "CONDITION" },
        ],
      },
      {
        key: "motor",
        label: "Motor e transmissão",
        items: [
          { key: "engine", label: "Motor", mode: "CONDITION", photoRecommended: true },
          { key: "belts", label: "Correias: tensão e estado", mode: "CONDITION", photoRecommended: true },
          { key: "exhaust", label: "Sistema de escapamento", mode: "CONDITION", photoRecommended: true },
          { key: "transmission", label: "Transmissão", mode: "CONDITION" },
          { key: "leaks", label: "Vazamentos", mode: "CONDITION", photoRecommended: true },
        ],
      },
      {
        key: "filtros",
        label: "Filtros e climatização",
        items: [
          { key: "oil-filter", label: "Filtro de óleo", mode: "CONDITION" },
          { key: "fuel-filter", label: "Filtro de combustível", mode: "CONDITION" },
          { key: "air-filter", label: "Filtro de ar", mode: "CONDITION", photoRecommended: true },
          { key: "cabin-filter", label: "Filtro do ar-condicionado", mode: "CONDITION", photoRecommended: true },
          { key: "ac-system", label: "Sistema de ar-condicionado", mode: "CONDITION" },
        ],
      },
      {
        key: "freios",
        label: "Freios e direção",
        items: [
          { key: "front-brakes", label: "Pastilhas e discos dianteiros", mode: "CONDITION", photoRecommended: true },
          { key: "rear-brakes", label: "Pastilhas e discos traseiros", mode: "CONDITION", photoRecommended: true },
          { key: "brake-calipers", label: "Cáliper / cilindro", mode: "CONDITION", photoRecommended: true },
          { key: "brake-lines", label: "Tubos de freio", mode: "CONDITION", photoRecommended: true },
          { key: "abs", label: "Sensores ABS", mode: "CONDITION" },
          { key: "steering", label: "Sistema de direção", mode: "CONDITION", photoRecommended: true },
        ],
      },
      {
        key: "suspensao",
        label: "Suspensão, rodas e pneus",
        items: [
          { key: "front-suspension", label: "Suspensão dianteira", mode: "CONDITION", photoRecommended: true },
          { key: "rear-suspension", label: "Suspensão traseira", mode: "CONDITION", photoRecommended: true },
          { key: "shocks", label: "Amortecedores", mode: "CONDITION", photoRecommended: true },
          { key: "wheels", label: "Rodas", mode: "CONDITION", photoRecommended: true },
          { key: "tire-wear", label: "Desgaste dos pneus", mode: "CONDITION", photoRecommended: true },
          { key: "tire-depth", label: "Profundidade dos sulcos", mode: "CONDITION" },
          { key: "tire-pressure", label: "Calibragem", mode: "CONDITION" },
        ],
      },
      {
        key: "eletrica",
        label: "Elétrica e segurança",
        items: [
          { key: "battery", label: "Bateria", mode: "CONDITION", photoRecommended: true },
          { key: "electrical", label: "Sistema elétrico e painel", mode: "CONDITION" },
          { key: "lights", label: "Luzes internas e externas", mode: "CONDITION" },
          { key: "seat-belts", label: "Cintos de segurança", mode: "CONDITION" },
          { key: "glass-electric", label: "Vidros, retrovisores e limpadores", mode: "CONDITION" },
        ],
      },
      {
        key: "road-test-2",
        label: "Teste de rodagem 2",
        items: [
          { key: "road-test-after", label: "Teste de rodagem após o check-up realizado", mode: "YES_NO" },
        ],
      },
    ],
  },
  {
    id: "quality",
    label: "Qualidade",
    description: "Controle de qualidade após a execução, antes da entrega do veículo.",
    groups: [
      {
        key: "quality-execution",
        label: "Conferência dos serviços",
        items: [
          { key: "quality-services", label: "Serviços executados conforme a O.S.", mode: "YES_NO", photoRecommended: true },
          { key: "quality-parts", label: "Peças e componentes conferidos", mode: "YES_NO", photoRecommended: true },
          { key: "quality-torque", label: "Torques e reapertos conferidos", mode: "YES_NO" },
          { key: "quality-tools", label: "Ferramentas e proteções removidas", mode: "YES_NO" },
        ],
      },
      {
        key: "quality-tests",
        label: "Testes e validação",
        items: [
          { key: "quality-leaks", label: "Ausência de vazamentos após o serviço", mode: "YES_NO", photoRecommended: true },
          { key: "quality-panel", label: "Painel sem alertas relacionados ao serviço", mode: "YES_NO", photoRecommended: true },
          { key: "quality-road-test", label: "Teste de rodagem de qualidade realizado", mode: "YES_NO" },
          { key: "quality-clean", label: "Área de trabalho e veículo conferidos", mode: "YES_NO", photoRecommended: true },
        ],
      },
    ],
  },
  {
    id: "checkout",
    label: "Check-out",
    description: "Conferência final, entrega e confirmação do cliente.",
    groups: [
      {
        key: "road-test-3",
        label: "Teste de rodagem 3",
        items: [
          { key: "road-test-final", label: "Teste final de rodagem realizado", mode: "YES_NO" },
        ],
      },
      {
        key: "servicos-pecas",
        label: "Serviços e peças",
        items: [
          { key: "parts-shown", label: "Peças substituídas mostradas e disponibilizadas", mode: "YES_NO" },
          { key: "services-explained", label: "Serviços realizados explicados ao cliente", mode: "YES_NO" },
          { key: "warranty-explained", label: "Garantia dos serviços e peças explicada", mode: "YES_NO" },
          { key: "values-explained", label: "Valores cobrados explicados", mode: "YES_NO" },
          { key: "documents-delivered", label: "Ordem de serviço e próximos serviços entregues", mode: "YES_NO" },
        ],
      },
      {
        key: "entrega",
        label: "Documentação e entrega",
        items: [
          { key: "manual-stamped", label: "Manual carimbado quando aplicável", mode: "YES_NO" },
          { key: "vehicle-final", label: "Veículo entregue em perfeitas condições", mode: "YES_NO", photoRecommended: true },
          { key: "objects-returned", label: "Objetos e acessórios devolvidos", mode: "YES_NO" },
          { key: "out-mileage", label: "Quilometragem de saída registrada", mode: "YES_NO" },
          { key: "out-fuel", label: "Nível de combustível conferido", mode: "YES_NO" },
          { key: "customer-acceptance", label: "Aceite ou assinatura do cliente coletado", mode: "YES_NO", photoRecommended: true },
        ],
      },
      {
        key: "limpeza-final",
        label: "Limpeza e satisfação",
        items: [
          { key: "cleaning-done", label: "Limpeza executada conforme combinado", mode: "YES_NO", photoRecommended: true },
          { key: "survey-explained", label: "Pesquisa de satisfação explicada", mode: "YES_NO" },
          { key: "post-service", label: "Cliente orientado sobre o pós-serviço", mode: "YES_NO" },
        ],
      },
    ],
  },
];

const CONDITION_OPTIONS: Array<{ value: ItemValue; label: string; symbol: string }> = [
  { value: "BOM", label: "Bom", symbol: "✓" },
  { value: "REGULAR", label: "Regular", symbol: "!" },
  { value: "RUIM", label: "Ruim", symbol: "×" },
  { value: "NAO_SE_APLICA", label: "Não se aplica", symbol: "—" },
];

const PRESENCE_OPTIONS: Array<{ value: ItemValue; label: string; symbol: string }> = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "AVARIADO", label: "Avariado", symbol: "!" },
];

const YES_NO_OPTIONS: Array<{ value: ItemValue; label: string; symbol: string }> = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
];

const WASH_OPTIONS: Array<{ value: ItemValue; label: string; symbol: string }> = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "EXPRESSA", label: "Expressa", symbol: "⚡" },
  { value: "OUTRO", label: "Outro", symbol: "+" },
];

const CHECKIN_FLOW_STEPS = [
  { number: "01", groupKey: "interior", label: "Interior", detail: "Cabine e pertences", icon: "interior" },
  { number: "02", groupKey: "left-side", label: "Lateral esquerda", detail: "Início na roda dianteira", icon: "side-left" },
  { number: "03", groupKey: "rear-trunk", label: "Traseira", detail: "Porta-malas e equipamentos", icon: "rear" },
  { number: "04", groupKey: "right-side", label: "Lateral direita", detail: "Da traseira para a dianteira", icon: "side-right" },
  { number: "05", groupKey: "front", label: "Dianteira", detail: "Frente, faróis e para-brisa", icon: "front" },
  { number: "06", groupKey: "upper", label: "Vidros e teto", detail: "Partes superiores", icon: "top" },
  { number: "07", groupKey: "information", label: "Informações", detail: "Documentos e finalização", icon: "info" },
];

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedServiceTypes(): ServiceType[] {
  return [
    { id: "manutencao", name: "Manutenção", active: true },
    { id: "revisao", name: "Revisão", active: true },
    { id: "diagnostico", name: "Diagnóstico", active: true },
    { id: "freios", name: "Freios", active: true },
    { id: "suspensao", name: "Suspensão", active: true },
    { id: "pneus-geometria", name: "Pneus e geometria", active: true },
    { id: "eletrica", name: "Elétrica e eletrônica", active: true },
    { id: "ar-condicionado", name: "Ar-condicionado", active: true },
  ];
}

function sidebarIsLight(hex: string) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#0d1b28";
  const red = parseInt(safe.slice(1, 3), 16) / 255;
  const green = parseInt(safe.slice(3, 5), 16) / 255;
  const blue = parseInt(safe.slice(5, 7), 16) / 255;
  const linear = (value: number) => value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  return luminance > 0.48;
}

function sidebarThemeVariables(hex: string) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#0d1b28";
  const isLight = sidebarIsLight(safe);
  return {
    "--company-sidebar": safe,
    "--sidebar-text": isLight ? "#10212d" : "#ffffff",
    "--sidebar-muted": isLight ? "rgba(16,33,45,.70)" : "rgba(255,255,255,.72)",
    "--sidebar-border": isLight ? "rgba(16,33,45,.16)" : "rgba(255,255,255,.13)",
    "--sidebar-panel": isLight ? "rgba(16,33,45,.09)" : "rgba(255,255,255,.09)",
    "--sidebar-hover": isLight ? "rgba(16,33,45,.12)" : "rgba(255,255,255,.09)",
    "--sidebar-active": isLight ? "rgba(16,33,45,.20)" : "rgba(0,0,0,.22)",
  };
}

function quoteMessageTemplateLabel(template: QuoteMessageTemplate) {
  return ({
    PROFISSIONAL: "Profissional",
    DIRETA: "Direta e objetiva",
    CONSULTIVA: "Consultiva",
    PREVENTIVA: "Preventiva",
  } as const)[template];
}

function seedCatalog(): CatalogItem[] {
  return [
    { id: uid(), name: "Troca de óleo do motor", category: "Manutenção", kind: "SERVICO", price: 180, active: true, standard: true, serviceTypeId: "manutencao" },
    { id: uid(), name: "Óleo 5W30", category: "Motor", kind: "PRODUTO", price: 58, active: true, standard: false },
    { id: uid(), name: "Filtro de óleo", category: "Filtros", kind: "PECA", price: 42, active: true, standard: false },
    { id: uid(), name: "Alinhamento", category: "Pneus e geometria", kind: "SERVICO", price: 120, active: true, standard: true, serviceTypeId: "pneus-geometria" },
  ];
}

function seedCompanyIdentity(storeId: string): CompanyIdentity {
  const store = STORES.find((item) => item.id === storeId);
  return {
    displayName: store?.name ?? "Minha empresa",
    logo: "",
    sidebarColor: "#0d1b28",
  };
}

function seedCompanySettings(): CompanySettings {
  return {
    profile: "FULL",
    modules: {
      CATALOG: true,
      CHECKLIST: true,
      ORDERS: true,
      QUOTES: true,
    },
    quoteDeliveryMode: "BOTH",
    quoteMessageTemplate: "PROFISSIONAL",
  };
}

function quoteDeliveryLabel(mode: QuoteDeliveryMode) {
  if (mode === "LINK") return "Link para aprovação";
  if (mode === "MESSAGE") return "Mensagem comercial";
  return "Link e mensagem";
}

function allTemplateKeys(): Record<StageId, string[]> {
  return {
    checkin: CHECKLIST_TEMPLATE[0].groups.flatMap((group) => group.items.map((item) => item.key)),
    checkup: CHECKLIST_TEMPLATE[1].groups.flatMap((group) => group.items.map((item) => item.key)),
    quality: CHECKLIST_TEMPLATE[2].groups.flatMap((group) => group.items.map((item) => item.key)),
    checkout: CHECKLIST_TEMPLATE[3].groups.flatMap((group) => group.items.map((item) => item.key)),
  };
}

function essentialTemplateKeys(): Record<StageId, string[]> {
  return {
    checkin: [
      "interior-dashboard",
      "front-seats",
      "rear-seats",
      "mats",
      "belongings",
      "wash-request",
      "triangle",
      "jack",
      "wheel-wrench",
      "vehicle-doc",
      "wheel-fl",
      "body-front-left",
      "door-front-left",
      "door-rear-left",
      "wheel-rl",
      "body-rear",
      "body-trunk",
      "body-rear-right",
      "wheel-rr",
      "door-rear-right",
      "door-front-right",
      "body-front-right",
      "wheel-fr",
      "body-front",
      "body-hood",
      "windshield",
      "side-windows",
      "mirrors",
      "body-roof",
      "headlights",
      "taillights",
      "road-test-in",
    ],
    checkup: [
      "engine-oil",
      "brake-fluid",
      "coolant",
      "engine",
      "belts",
      "leaks",
      "front-brakes",
      "rear-brakes",
      "steering",
      "front-suspension",
      "rear-suspension",
      "shocks",
      "tire-wear",
      "battery",
      "road-test-after",
    ],
    quality: [
      "quality-services",
      "quality-parts",
      "quality-leaks",
      "quality-panel",
      "quality-road-test",
    ],
    checkout: [
      "road-test-final",
      "parts-shown",
      "services-explained",
      "warranty-explained",
      "values-explained",
      "vehicle-final",
      "objects-returned",
      "out-mileage",
      "customer-acceptance",
      "cleaning-done",
    ],
  };
}

function seedSettings(): ChecklistSettings {
  return { name: "Checklist oficina completo", enabledItemKeys: allTemplateKeys() };
}

function createStages(settings: ChecklistSettings): Stage[] {
  return CHECKLIST_TEMPLATE.map((template, index) => ({
    id: template.id,
    label: template.label,
    description: template.description,
    status: index === 0 ? "EM_ANDAMENTO" : "NAO_INICIADO",
    photos: [],
    items: template.groups.flatMap((group) =>
      group.items
        .filter((item) => settings.enabledItemKeys[template.id].includes(item.key))
        .map((item) => ({
          ...item,
          id: uid(),
          categoryKey: group.key,
          category: group.label,
          value: "PENDENTE" as ItemValue,
          note: "",
          photos: [],
        })),
    ),
  }));
}

function createAttendance(settings: ChecklistSettings, sequence: number, storeId: string): Attendance {
  const now = new Date().toISOString();
  return {
    id: uid(),
    storeId,
    customerId: "",
    vehicleId: "",
    checkupType: "REVISAO",
    technicalReport: { complaint: "", diagnosis: "", tests: "", recommendation: "", conclusion: "" },
    code: `ATD-${String(sequence).padStart(4, "0")}`,
    createdAt: now,
    updatedAt: now,
    status: "CHECKIN",
    reception: {
      customer: "",
      phone: "",
      email: "",
      vehicle: "",
      plate: "",
      mileage: "",
      fuel: "1/2",
      responsible: "Petrick",
      osNumber: "",
      technician: "",
    },
    stages: createStages(settings),
  };
}

function seedStoreData(storeId: string): StoreData {
  return {
    customers: [],
    vehicles: [],
    catalog: seedCatalog(),
    serviceTypes: seedServiceTypes(),
    checklistSettings: seedSettings(),
    companySettings: seedCompanySettings(),
    companyIdentity: seedCompanyIdentity(storeId),
    attendances: [],
    orders: [],
    quotes: [],
  };
}

function lineTotal(item: DocumentLine) {
  return Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0);
}

function itemsSubtotal(items: DocumentLine[]) {
  return items.reduce((total, item) => total + lineTotal(item), 0);
}

function normalizeDocumentLine(item: Partial<DocumentLine>): DocumentLine {
  return {
    id: item.id || uid(),
    catalogItemId: item.catalogItemId ?? null,
    name: item.name ?? "",
    description: item.description ?? "",
    kind: item.kind ?? "SERVICO",
    quantity: Math.max(0, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
  };
}

function nextDocumentSequence(codes: string[], prefix: string) {
  const highest = codes.reduce((max, code) => {
    const numeric = Number(code.replace(`${prefix}-`, ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return highest + 1;
}

type LinkedIdentity = {
  customerId: string;
  vehicleId: string;
  customer: string;
  vehicle: string;
  plate: string;
  responsible: string;
};

function identityFromAttendance(attendance: Attendance): LinkedIdentity {
  return {
    customerId: attendance.customerId,
    vehicleId: attendance.vehicleId,
    customer: attendance.reception.customer,
    vehicle: attendance.reception.vehicle,
    plate: attendance.reception.plate,
    responsible: attendance.reception.responsible || "Petrick",
  };
}

function createServiceOrder(orders: ServiceOrder[], identity: LinkedIdentity, storeId: string, attendance?: Attendance | null): ServiceOrder {
  const now = new Date().toISOString();
  const sequence = nextDocumentSequence(orders.map((item) => item.code), "OS");
  return {
    id: uid(),
    storeId,
    customerId: identity.customerId,
    vehicleId: identity.vehicleId,
    code: `OS-${String(sequence).padStart(4, "0")}`,
    createdAt: now,
    updatedAt: now,
    status: attendance ? "PENDENTE" : "ABERTA",
    attendanceId: attendance?.id ?? null,
    customer: identity.customer,
    vehicle: identity.vehicle,
    plate: identity.plate,
    responsible: identity.responsible,
    total: 0,
    complaint: "",
    diagnosis: "",
    internalNotes: "",
    technician: "",
    expectedDelivery: "",
    items: [],
  };
}

function createQuote(quotes: Quote[], identity: LinkedIdentity, storeId: string, attendance?: Attendance | null, messageTemplate: QuoteMessageTemplate = "PROFISSIONAL"): Quote {
  const now = new Date().toISOString();
  const sequence = nextDocumentSequence(quotes.map((item) => item.code), "ORC");
  return {
    id: uid(),
    storeId,
    customerId: identity.customerId,
    vehicleId: identity.vehicleId,
    code: `ORC-${String(sequence).padStart(4, "0")}`,
    createdAt: now,
    updatedAt: now,
    status: "AGUARDANDO_DIGITACAO",
    attendanceId: attendance?.id ?? null,
    customer: identity.customer,
    vehicle: identity.vehicle,
    plate: identity.plate,
    responsible: identity.responsible,
    total: 0,
    notes: "",
    paymentMethod: "PIX",
    installments: 1,
    validityDays: 10,
    discountAmount: 0,
    discountPercent: 0,
    messageTemplate,
    items: [],
  };
}

function keyFor(storeId: string) {
  return `gerivo:prototype:v16:store:${storeId}`;
}

function legacyKeysFor(storeId: string) {
  return [
    `gerivo:prototype:v15:store:${storeId}`,
    `gerivo:prototype:v12:${storeId}`,
    `gerivo:prototype:v11:${storeId}`,
  ];
}

function normalizeStageStatus(attendanceStatus: AttendanceStatus, stageId: StageId): StageStatus {
  const checkinDone = ["AGUARDANDO_CHECKUP", "CHECKUP", "AGUARDANDO_QUALITY", "QUALITY", "AGUARDANDO_CHECKOUT", "CHECKOUT", "CONCLUIDO"].includes(attendanceStatus);
  const checkupDone = ["AGUARDANDO_QUALITY", "QUALITY", "AGUARDANDO_CHECKOUT", "CHECKOUT", "CONCLUIDO"].includes(attendanceStatus);
  const qualityDone = ["AGUARDANDO_CHECKOUT", "CHECKOUT", "CONCLUIDO"].includes(attendanceStatus);
  const checkoutDone = attendanceStatus === "CONCLUIDO";
  if (stageId === "checkin") return checkinDone ? "CONCLUIDO" : "EM_ANDAMENTO";
  if (stageId === "checkup") return checkupDone ? "CONCLUIDO" : attendanceStatus === "CHECKUP" ? "EM_ANDAMENTO" : "NAO_INICIADO";
  if (stageId === "quality") return qualityDone ? "CONCLUIDO" : attendanceStatus === "QUALITY" ? "EM_ANDAMENTO" : "NAO_INICIADO";
  if (checkoutDone) return "CONCLUIDO";
  return attendanceStatus === "CHECKOUT" ? "EM_ANDAMENTO" : "NAO_INICIADO";
}

function normalizeStoreData(parsed: Partial<StoreData>, storeId: string): StoreData {
  const defaultSettings = seedSettings();
  const settings = !parsed.checklistSettings
    ? defaultSettings
    : {
        name: parsed.checklistSettings.name || defaultSettings.name,
        enabledItemKeys: {
          checkin: (parsed.checklistSettings.enabledItemKeys?.checkin ?? defaultSettings.enabledItemKeys.checkin).filter((key) => defaultSettings.enabledItemKeys.checkin.includes(key)),
          checkup: (parsed.checklistSettings.enabledItemKeys?.checkup ?? defaultSettings.enabledItemKeys.checkup).filter((key) => defaultSettings.enabledItemKeys.checkup.includes(key)),
          quality: (parsed.checklistSettings.enabledItemKeys?.quality ?? defaultSettings.enabledItemKeys.quality).filter((key) => defaultSettings.enabledItemKeys.quality.includes(key)),
          checkout: (parsed.checklistSettings.enabledItemKeys?.checkout ?? defaultSettings.enabledItemKeys.checkout).filter((key) => defaultSettings.enabledItemKeys.checkout.includes(key)),
        },
      };
  const defaultCompanySettings = seedCompanySettings();
  const companySettings: CompanySettings = parsed.companySettings
    ? {
        profile: parsed.companySettings.profile ?? "CUSTOM",
        modules: {
          CATALOG: parsed.companySettings.modules?.CATALOG ?? true,
          CHECKLIST: parsed.companySettings.modules?.CHECKLIST ?? true,
          ORDERS: parsed.companySettings.modules?.ORDERS ?? true,
          QUOTES: parsed.companySettings.modules?.QUOTES ?? true,
        },
        quoteDeliveryMode: parsed.companySettings.quoteDeliveryMode ?? "BOTH",
        quoteMessageTemplate: parsed.companySettings.quoteMessageTemplate ?? "PROFISSIONAL",
      }
    : defaultCompanySettings;
  const defaultIdentity = seedCompanyIdentity(storeId);
  const companyIdentity: CompanyIdentity = {
    displayName: parsed.companyIdentity?.displayName?.trim() || defaultIdentity.displayName,
    logo: parsed.companyIdentity?.logo ?? "",
    sidebarColor: /^#[0-9a-f]{6}$/i.test(parsed.companyIdentity?.sidebarColor ?? "")
      ? String(parsed.companyIdentity?.sidebarColor)
      : defaultIdentity.sidebarColor,
  };
  const serviceTypes = (parsed.serviceTypes ?? seedServiceTypes()).map((item) => ({
    id: item.id || uid(),
    name: item.name?.trim() || "Tipo de serviço",
    active: item.active ?? true,
  }));
  const catalog = (parsed.catalog ?? seedCatalog()).map((item) => ({
    ...item,
    standard: item.standard ?? item.kind === "SERVICO",
    serviceTypeId: item.serviceTypeId ?? (item.kind === "SERVICO" ? serviceTypes.find((type) => type.name.toLowerCase() === item.category.toLowerCase())?.id : undefined),
  }));
  const attendances = (parsed.attendances ?? []).filter((attendance) => attendance.storeId === storeId).map((attendance) => {
    const freshStages = createStages(settings);
    const legacyItems = new Map(
      attendance.stages.flatMap((stage) => stage.items).map((item) => [item.key, item]),
    );
    const aliases: Record<string, string> = {
      belongings: "valuables",
    };
    const stages = freshStages.map((freshStage) => {
      const oldStage = attendance.stages.find((stage) => stage.id === freshStage.id);
      return {
        ...freshStage,
        status: normalizeStageStatus(attendance.status, freshStage.id),
        completedAt: oldStage?.completedAt,
        completedBy: oldStage?.completedBy,
        photos: oldStage?.photos ?? [],
        items: freshStage.items.map((freshItem) => {
          const oldItem = legacyItems.get(freshItem.key) ?? legacyItems.get(aliases[freshItem.key] ?? "");
          return oldItem
            ? { ...freshItem, value: oldItem.value, note: oldItem.note, photos: oldItem.photos }
            : freshItem;
        }),
      };
    });
    return {
      ...attendance,
      storeId,
      customerId: attendance.customerId ?? "",
      vehicleId: attendance.vehicleId ?? "",
      checkupType: attendance.checkupType ?? "REVISAO",
      technicalReport: attendance.technicalReport ?? { complaint: "", diagnosis: "", tests: "", recommendation: "", conclusion: "" },
      stages,
    };
  });
  const customers: Customer[] = (parsed.customers ?? []).filter((customer) => customer.storeId === storeId).map((customer) => ({
    ...customer,
    storeId,
    createdAt: customer.createdAt ?? new Date().toISOString(),
    updatedAt: customer.updatedAt ?? customer.createdAt ?? new Date().toISOString(),
  }));
  const vehicles: Vehicle[] = (parsed.vehicles ?? []).filter((vehicle) => vehicle.storeId === storeId).map((vehicle) => ({
    ...vehicle,
    storeId,
    plate: vehicle.plate.replace(/[^A-Z0-9]/g, "").toUpperCase(),
    createdAt: vehicle.createdAt ?? new Date().toISOString(),
    updatedAt: vehicle.updatedAt ?? vehicle.createdAt ?? new Date().toISOString(),
  }));
  const orders = (parsed.orders ?? []).filter((order) => order.storeId === storeId).map((order) => {
    const items = Array.isArray(order.items) ? order.items.map(normalizeDocumentLine) : [];
    return {
      ...order,
      storeId,
      customerId: order.customerId ?? "",
      vehicleId: order.vehicleId ?? "",
      attendanceId: order.attendanceId ?? null,
      complaint: order.complaint ?? "",
      diagnosis: order.diagnosis ?? "",
      internalNotes: order.internalNotes ?? "",
      technician: order.technician ?? "",
      expectedDelivery: order.expectedDelivery ?? "",
      items,
      total: itemsSubtotal(items),
      updatedAt: order.updatedAt ?? order.createdAt ?? new Date().toISOString(),
    };
  });
  const quotes = (parsed.quotes ?? []).filter((quote) => quote.storeId === storeId).map((quote) => {
    const items = Array.isArray(quote.items) ? quote.items.map(normalizeDocumentLine) : [];
    const subtotal = itemsSubtotal(items);
    const discountAmount = Math.max(0, Number(quote.discountAmount) || 0);
    const discountPercent = Math.max(0, Math.min(100, Number(quote.discountPercent) || 0));
    const total = Math.max(0, subtotal - discountAmount - subtotal * discountPercent / 100);
    return {
      ...quote,
      storeId,
      customerId: quote.customerId ?? "",
      vehicleId: quote.vehicleId ?? "",
      attendanceId: quote.attendanceId ?? null,
      notes: quote.notes ?? "",
      paymentMethod: quote.paymentMethod ?? "PIX",
      installments: Math.max(1, Number(quote.installments) || 1),
      validityDays: Math.max(0, Number(quote.validityDays) || 0),
      discountAmount,
      discountPercent,
      messageTemplate: quote.messageTemplate ?? companySettings.quoteMessageTemplate ?? "PROFISSIONAL",
      items,
      total,
      updatedAt: quote.updatedAt ?? quote.createdAt ?? new Date().toISOString(),
    };
  });

  const linkedCustomers = [...customers];
  const linkedVehicles = [...vehicles];
  const linkedAttendances = attendances.map((attendance) => {
    if (attendance.customerId && attendance.vehicleId) return attendance;
    const customerName = attendance.reception.customer.trim();
    const plate = attendance.reception.plate.replace(/[^A-Z0-9]/g, "").toUpperCase();
    if (!customerName || !plate) return attendance;
    let customer = linkedCustomers.find((item) => item.name.toLowerCase() === customerName.toLowerCase() && item.phone === attendance.reception.phone);
    if (!customer) {
      customer = { id: uid(), storeId, name: customerName, phone: attendance.reception.phone, email: attendance.reception.email, createdAt: attendance.createdAt, updatedAt: attendance.updatedAt };
      linkedCustomers.push(customer);
    }
    let vehicle = linkedVehicles.find((item) => item.plate === plate);
    if (!vehicle) {
      vehicle = { id: uid(), storeId, customerId: customer.id, plate, description: attendance.reception.vehicle, createdAt: attendance.createdAt, updatedAt: attendance.updatedAt };
      linkedVehicles.push(vehicle);
    }
    return { ...attendance, customerId: customer.id, vehicleId: vehicle.id };
  });

  return { customers: linkedCustomers, vehicles: linkedVehicles, catalog, serviceTypes, checklistSettings: settings, companySettings, companyIdentity, attendances: linkedAttendances, orders, quotes };
}

function isolateStoreData(storeId: string, data: StoreData): StoreData {
  return {
    ...data,
    customers: data.customers.filter((item) => item.storeId === storeId),
    vehicles: data.vehicles.filter((item) => item.storeId === storeId),
    attendances: data.attendances.filter((item) => item.storeId === storeId),
    orders: data.orders.filter((item) => item.storeId === storeId),
    quotes: data.quotes.filter((item) => item.storeId === storeId),
  };
}

function loadStore(storeId: string): StoreData {
  try {
    const currentRaw = localStorage.getItem(keyFor(storeId));
    if (currentRaw) {
      const normalized = isolateStoreData(
        storeId,
        normalizeStoreData(JSON.parse(currentRaw) as Partial<StoreData>, storeId),
      );
      localStorage.setItem(keyFor(storeId), JSON.stringify(normalized));
      return normalized;
    }

    const previousRaw = localStorage.getItem(`gerivo:prototype:v14:store:${storeId}`) ?? localStorage.getItem(`gerivo:prototype:v13:store:${storeId}`);
    if (previousRaw) {
      const migrated = isolateStoreData(storeId, normalizeStoreData(JSON.parse(previousRaw) as Partial<StoreData>, storeId));
      localStorage.setItem(keyFor(storeId), JSON.stringify(migrated));
      return migrated;
    }

    // Segurança LGPD: versões anteriores à v1.3 migram apenas configurações e catálogo.
    // Clientes, veículos, atendimentos, O.S. e orçamentos não são importados,
    // pois podem ter sido gravados na chave de outra empresa durante os testes.
    for (const legacyKey of legacyKeysFor(storeId)) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const legacyParsed = JSON.parse(legacyRaw) as Partial<StoreData>;
      const safeConfiguration = normalizeStoreData(
        {
          catalog: legacyParsed.catalog,
          serviceTypes: legacyParsed.serviceTypes,
          checklistSettings: legacyParsed.checklistSettings,
          companySettings: legacyParsed.companySettings,
          companyIdentity: legacyParsed.companyIdentity,
          customers: [],
          vehicles: [],
          attendances: [],
          orders: [],
          quotes: [],
        },
        storeId,
      );
      const isolated = isolateStoreData(storeId, safeConfiguration);
      localStorage.setItem(keyFor(storeId), JSON.stringify(isolated));
      return isolated;
    }

    const seeded = isolateStoreData(storeId, seedStoreData(storeId));
    localStorage.setItem(keyFor(storeId), JSON.stringify(seeded));
    return seeded;
  } catch {
    return isolateStoreData(storeId, seedStoreData(storeId));
  }
}

function saveStore(storeId: string, data: StoreData) {
  try {
    localStorage.setItem(keyFor(storeId), JSON.stringify(isolateStoreData(storeId, data)));
  } catch {
    // Fotos grandes podem ultrapassar o limite local deste protótipo.
  }
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function serviceOrderStatusLabel(status: ServiceOrderStatus) {
  return ({ ABERTA: "Aberta", FECHADA: "Fechada", PENDENTE: "Pendente", INCOMPLETA: "Incompleta" } as const)[status];
}

function quoteStatusLabel(status: QuoteStatus) {
  return ({
    ABERTO: "Aberto",
    FECHADO: "Fechado",
    AGUARDANDO_APROVACAO: "Aguardando aprovação",
    AGUARDANDO_COTACAO: "Aguardando cotação",
    AGUARDANDO_DIGITACAO: "Aguardando digitação",
    INCOMPLETO: "Incompleto",
    AGUARDANDO_RETORNO_CLIENTE: "Aguardando retorno do cliente",
    AGUARDANDO_DESCONTO: "Aguardando desconto",
  } as const)[status];
}

function checklistListStatus(attendance: Attendance): Exclude<ChecklistListStatus, "TODOS"> {
  if (attendance.status === "CONCLUIDO") return "CONCLUIDO";
  const missingCoreData = !attendance.reception.customer.trim() || !attendance.reception.vehicle.trim() || !attendance.reception.plate.trim();
  if (missingCoreData) return "INCOMPLETO";
  if (["CHECKIN", "CHECKUP", "QUALITY", "CHECKOUT"].includes(attendance.status)) return "EM_ANDAMENTO";
  return "ABERTO";
}

function checklistListStatusLabel(status: Exclude<ChecklistListStatus, "TODOS">) {
  return ({ ABERTO: "Aberto", CONCLUIDO: "Concluído", INCOMPLETO: "Incompleto", EM_ANDAMENTO: "Em andamento" } as const)[status];
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao processar a imagem."));
    image.src = src;
  });
}

async function preparePhoto(file: File): Promise<Photo> {
  const original = await fileToDataUrl(file);
  const image = await loadImage(original);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Falha ao preparar a foto.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    id: uid(),
    name: file.name,
    dataUrl: canvas.toDataURL("image/jpeg", 0.7),
    createdAt: new Date().toISOString(),
  };
}

function itemValueLabel(value: ItemValue) {
  const labels: Record<ItemValue, string> = {
    PENDENTE: "Pendente",
    BOM: "Bom",
    REGULAR: "Regular",
    RUIM: "Ruim",
    NAO_SE_APLICA: "Não se aplica",
    SIM: "Sim",
    NAO: "Não",
    AVARIADO: "Avariado",
    EXPRESSA: "Expressa",
    OUTRO: "Outro",
  };
  return labels[value];
}

function attendanceStatusLabel(status: AttendanceStatus) {
  const labels: Record<AttendanceStatus, string> = {
    CHECKIN: "Check-in em andamento",
    AGUARDANDO_CHECKUP: "Aguardando check-up",
    CHECKUP: "Check-up em andamento",
    AGUARDANDO_QUALITY: "Aguardando qualidade",
    QUALITY: "Qualidade em andamento",
    AGUARDANDO_CHECKOUT: "Aguardando check-out",
    CHECKOUT: "Check-out em andamento",
    CONCLUIDO: "Atendimento concluído",
  };
  return labels[status];
}

function stageForStatus(status: AttendanceStatus): StageId {
  if (status === "CHECKUP" || status === "AGUARDANDO_QUALITY") return "checkup";
  if (status === "QUALITY" || status === "AGUARDANDO_CHECKOUT") return "quality";
  if (status === "CHECKOUT" || status === "CONCLUIDO") return "checkout";
  return "checkin";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function reportStatusClass(value: ItemValue) {
  if (["BOM", "SIM"].includes(value)) return "good";
  if (["REGULAR", "AVARIADO", "EXPRESSA", "OUTRO"].includes(value)) return "attention";
  if (["RUIM", "NAO"].includes(value)) return "bad";
  if (value === "NAO_SE_APLICA") return "neutral";
  return "pending";
}

function createReportHtml(store: Store, attendance: Attendance, mode: ReportMode = "FULL") {
  const completedStages = attendance.stages.filter((stage) => stage.status === "CONCLUIDO");
  const stagesToRender = completedStages.length
    ? completedStages
    : attendance.stages.filter((stage) => stage.items.some((item) => item.value !== "PENDENTE"));

  const answeredItems = stagesToRender.flatMap((stage) =>
    stage.items.filter((item) => item.value !== "PENDENTE"),
  );
  const goodCount = answeredItems.filter((item) => ["BOM", "SIM"].includes(item.value)).length;
  const attentionCount = answeredItems.filter((item) => ["REGULAR", "AVARIADO", "EXPRESSA", "OUTRO"].includes(item.value)).length;
  const badCount = answeredItems.filter((item) => ["RUIM", "NAO"].includes(item.value)).length;
  const photoCount =
    stagesToRender.reduce((total, stage) => total + stage.photos.length, 0) +
    answeredItems.reduce((total, item) => total + item.photos.length, 0);

  const renderPhotoGallery = (photos: Photo[], title: string) => {
    if (!photos.length) return "";
    return `<div class="photo-section"><h4>${escapeHtml(title)}</h4><div class="photo-grid">${photos
      .map(
        (photo) =>
          `<figure><img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}"><figcaption>${escapeHtml(photo.name)}</figcaption></figure>`,
      )
      .join("")}</div></div>`;
  };

  const technicalReportHtml = attendance.technicalReport && (attendance.technicalReport.diagnosis || attendance.technicalReport.conclusion)
    ? `<section class="technical-report-print"><h2>Laudo técnico · ${attendance.checkupType === "DIAGNOSTICO" ? "Diagnóstico" : "Revisão"}</h2>${attendance.technicalReport.complaint ? `<p><strong>Relato do cliente:</strong> ${escapeHtml(attendance.technicalReport.complaint)}</p>` : ""}<p><strong>Diagnóstico:</strong> ${escapeHtml(attendance.technicalReport.diagnosis || "—")}</p>${attendance.technicalReport.tests ? `<p><strong>Testes e medições:</strong> ${escapeHtml(attendance.technicalReport.tests)}</p>` : ""}${attendance.technicalReport.recommendation ? `<p><strong>Recomendação:</strong> ${escapeHtml(attendance.technicalReport.recommendation)}</p>` : ""}<p><strong>Conclusão:</strong> ${escapeHtml(attendance.technicalReport.conclusion || "—")}</p></section>`
    : "";

  const stageSections = stagesToRender
    .map((stage) => {
      const answered = stage.items.filter((item) => item.value !== "PENDENTE");
      const visibleItems =
        mode === "SUMMARY"
          ? answered.filter(
              (item) =>
                !["BOM", "SIM", "NAO_SE_APLICA"].includes(item.value) ||
                Boolean(item.note) ||
                item.photos.length > 0,
            )
          : answered;

      const groups = Array.from(new Set(visibleItems.map((item) => item.category)));
      const groupHtml = groups
        .map((category) => {
          const items = visibleItems.filter((item) => item.category === category);
          return `<article class="group">
            <h3>${escapeHtml(category)}</h3>
            <div class="item-list">
              ${items
                .map(
                  (item) => `<div class="report-item">
                    <div class="report-item-main">
                      <strong>${escapeHtml(item.label)}</strong>
                      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
                    </div>
                    <span class="status-chip ${reportStatusClass(item.value)}">${escapeHtml(itemValueLabel(item.value))}</span>
                  </div>
                  ${mode === "FULL" ? renderPhotoGallery(item.photos, `Fotos · ${item.label}`) : ""}`,
                )
                .join("")}
            </div>
          </article>`;
        })
        .join("");

      const emptySummary =
        mode === "SUMMARY" && visibleItems.length === 0
          ? `<div class="all-good">Nenhuma avaria, reprovação ou observação relevante registrada nesta etapa.</div>`
          : "";

      return `<section class="stage-report">
        <div class="stage-title">
          <div><small>ETAPA</small><h2>${escapeHtml(stage.label)}</h2></div>
          <span>${stage.completedAt ? `Concluído em ${escapeHtml(formatDate(stage.completedAt))}` : "Em andamento"}</span>
        </div>
        ${emptySummary}
        ${groupHtml}
        ${mode === "FULL" ? renderPhotoGallery(stage.photos, `Fotos gerais · ${stage.label}`) : ""}
      </section>`;
    })
    .join("");

  const title = mode === "SUMMARY" ? "Resumo do checklist" : "Relatório completo do checklist";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(attendance.code)} · Gerivo</title><style>
  @page{size:A4;margin:12mm}
  *{box-sizing:border-box}
  body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#17202b;margin:0;background:#fff;font-size:11px}
  .document{max-width:190mm;margin:0 auto}
  .brand-header{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;padding:0 0 15px;border-bottom:4px solid #176b5a}
  .gerivo{display:flex;align-items:center;gap:11px}.mark{width:43px;height:43px;display:grid;place-items:center;border-radius:12px;color:#fff;background:#176b5a;font-size:25px;font-weight:900}
  .gerivo h1,.company h2{margin:0}.gerivo h1{font-size:23px;letter-spacing:.04em}.gerivo p,.company p{margin:3px 0 0;color:#667382}
  .company{text-align:right}.company h2{font-size:17px}.company strong{display:block;margin-top:5px;color:#176b5a}
  .title-row{display:flex;justify-content:space-between;gap:16px;align-items:end;margin:18px 0 11px}.title-row h2{margin:0;font-size:21px}.title-row span{color:#667382;font-size:9px}
  .vehicle-card{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-bottom:12px;border:1px solid #d9e2e6;border-radius:10px;overflow:hidden}
  .vehicle-card div{min-height:54px;padding:10px;border-right:1px solid #e1e7ea}.vehicle-card div:nth-child(4n){border-right:0}.vehicle-card small,.summary-card small{display:block;color:#667382;font-size:8px;font-weight:800;text-transform:uppercase}.vehicle-card strong{display:block;margin-top:5px;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 17px}.summary-card{padding:10px;border:1px solid #dce4e8;border-radius:9px;background:#f7faf9}.summary-card strong{display:block;margin-top:5px;font-size:16px}.summary-card.good strong{color:#168252}.summary-card.attention strong{color:#b66a13}.summary-card.bad strong{color:#bd2c3a}
  .stage-report{break-inside:avoid;margin:0 0 18px}.stage-title{display:flex;align-items:end;justify-content:space-between;gap:14px;padding:9px 11px;border-radius:9px 9px 0 0;color:#fff;background:#162631}.stage-title small{font-size:7px;letter-spacing:.14em}.stage-title h2{margin:2px 0 0;font-size:16px}.stage-title>span{font-size:8px;opacity:.8}
  .group{break-inside:avoid;border:1px solid #dce4e8;border-top:0}.group h3{margin:0;padding:8px 10px;color:#155d50;background:#eef6f3;font-size:10px}
  .report-item{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;min-height:36px;padding:7px 10px;border-top:1px solid #e6ebee}.report-item:first-child{border-top:0}.report-item strong{font-size:10px}.report-item p{margin:4px 0 0;color:#5e6a75;font-size:9px;line-height:1.45}
  .status-chip{min-width:70px;padding:5px 7px;border-radius:999px;text-align:center;font-size:8px;font-weight:900}.status-chip.good{color:#126b45;background:#e6f5ed}.status-chip.attention{color:#89520a;background:#fff0d3}.status-chip.bad{color:#9c1f2c;background:#fee9ec}.status-chip.neutral{color:#53616d;background:#edf1f3}
  .all-good{padding:13px;border:1px solid #badbcf;border-top:0;color:#126b45;background:#eef9f5;font-weight:700}
  .photo-section{break-inside:avoid;padding:10px;border:1px solid #dce4e8;border-top:0}.photo-section h4{margin:0 0 8px;font-size:9px}.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.photo-grid figure{margin:0;border:1px solid #dce4e8;border-radius:7px;overflow:hidden}.photo-grid img{width:100%;height:105px;display:block;object-fit:cover}.photo-grid figcaption{padding:5px;color:#667382;font-size:7px}
  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:30px}.signature{padding-top:23px;border-top:1px solid #6e7880;text-align:center;color:#667382;font-size:9px}
  .footer{display:flex;justify-content:space-between;gap:20px;margin-top:22px;padding-top:9px;border-top:1px solid #ccd5dc;color:#667382;font-size:8px}
  @media print{.document{max-width:none}.stage-report,.group,.photo-section{break-inside:avoid}}
  @media(max-width:680px){.brand-header,.vehicle-card,.summary{grid-template-columns:1fr}.company{text-align:left}.vehicle-card div{border-right:0;border-bottom:1px solid #e1e7ea}.photo-grid{grid-template-columns:1fr 1fr}}
  </style></head><body><main class="document">
    <header class="brand-header">
      <div class="gerivo"><div class="mark">G</div><div><h1>GERIVO</h1><p>Sistema desenvolvido com Gerivo.</p></div></div>
      <div class="company"><h2>${escapeHtml(store.name)}</h2><p>${escapeHtml(title)}</p><strong>${escapeHtml(attendance.code)}</strong></div>
    </header>
    <div class="title-row"><h2>${escapeHtml(title)}</h2><span>Gerado em ${new Date().toLocaleString("pt-BR")}</span></div>
    <section class="vehicle-card">
      <div><small>Cliente</small><strong>${escapeHtml(attendance.reception.customer || "Não informado")}</strong></div>
      <div><small>Veículo</small><strong>${escapeHtml(attendance.reception.vehicle || "Não informado")}</strong></div>
      <div><small>Placa</small><strong>${escapeHtml(attendance.reception.plate || "Não informada")}</strong></div>
      <div><small>Responsável</small><strong>${escapeHtml(attendance.reception.responsible || "Não informado")}</strong></div>
      <div><small>Quilometragem</small><strong>${escapeHtml(attendance.reception.mileage || "—")}</strong></div>
      <div><small>Combustível</small><strong>${escapeHtml(attendance.reception.fuel || "—")}</strong></div>
      <div><small>O.S.</small><strong>${escapeHtml(attendance.reception.osNumber || "—")}</strong></div>
      <div><small>Técnico</small><strong>${escapeHtml(attendance.reception.technician || "—")}</strong></div>
    </section>
    <section class="summary">
      <div class="summary-card"><small>Itens avaliados</small><strong>${answeredItems.length}</strong></div>
      <div class="summary-card good"><small>Conformes</small><strong>${goodCount}</strong></div>
      <div class="summary-card attention"><small>Atenção</small><strong>${attentionCount}</strong></div>
      <div class="summary-card bad"><small>Reprovados</small><strong>${badCount}</strong></div>
    </section>
    ${stageSections || '<div class="all-good">Nenhuma etapa concluída ou preenchida para gerar o relatório.</div>'}
    <section class="signatures"><div class="signature">Responsável pela inspeção</div><div class="signature">Cliente / responsável pelo veículo</div></section>
    <footer class="footer"><span>${photoCount} foto(s) vinculada(s)</span><span>Sistema desenvolvido com Gerivo.</span></footer>
  </main></body></html>`;
}
function buildShareText(store: Store, attendance: Attendance) {
  const summary = attendance.stages
    .map((stage) => {
      const regular = stage.items.filter((item) => item.value === "REGULAR").length;
      const bad = stage.items.filter((item) => item.value === "RUIM" || item.value === "AVARIADO").length;
      return `${stage.label}: ${stage.status === "CONCLUIDO" ? "concluído" : "em andamento"} · ${regular} regular · ${bad} atenção`;
    })
    .join("\n");
  return `Olá! Segue o resumo do atendimento ${attendance.code}.\n\nEmpresa: ${store.name}\nCliente: ${attendance.reception.customer || "Não informado"}\nVeículo: ${attendance.reception.vehicle || "Não informado"}\nPlaca: ${attendance.reception.plate || "Não informada"}\n\n${summary}\n\nSistema desenvolvido com Gerivo.`;
}


function PremiumIcon({ name, size = 19 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") return <svg {...common}><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.6V21h13V9.6"/><path d="M9.2 21v-6.2h5.6V21"/></svg>;
  if (name === "clipboard") return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.2V3h6v1.2"/><path d="m8.5 12 2 2 4.5-4.5"/><path d="M8.5 17h7"/></svg>;
  if (name === "wrench") return <svg {...common}><path d="M14.8 6.2a4.2 4.2 0 0 0-5.6 5.6L4 17l3 3 5.2-5.2a4.2 4.2 0 0 0 5.6-5.6l-2.5 2.5-3-3 2.5-2.5Z"/></svg>;
  if (name === "file") return <svg {...common}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>;
  if (name === "layers") return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>;
  if (name === "menu") return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
  if (name === "store") return <svg {...common}><path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6"/><path d="M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M9 20v-5h6v5"/></svg>;
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 3.5-6.5 8-6.5s7.2 2.3 8 6.5"/></svg>;
  if (name === "logout") return <svg {...common}><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/></svg>;
  if (name === "chevron") return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
  if (name === "eye") return <svg {...common}><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>;
  if (name === "eyeOff") return <svg {...common}><path d="m3 3 18 18"/><path d="M10.6 6.2A11 11 0 0 1 12 6c6.2 0 9.5 6 9.5 6a15 15 0 0 1-2.3 3.1M6.5 6.5C3.9 8.1 2.5 12 2.5 12s3.3 6 9.5 6a10.8 10.8 0 0 0 4-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>;
  if (name === "car") return <svg {...common}><path d="m5 11 2-5h10l2 5"/><path d="M4 11h16v7H4z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M7 11h10"/></svg>;
  if (name === "users") return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.6-4 2.7-6 6-6s5.4 2 6 6"/><path d="M15 14.5c3.3.2 5 2 5.5 5.5"/></svg>;
  if (name === "modules") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 14h8l1-14"/><path d="M10 11v6M14 11v6"/></svg>;
  if (name === "camera") return <svg {...common}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3"/></svg>;
  return null;
}

export default function Home() {
  const [logged, setLogged] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [storeId, setStoreId] = useState(STORES[0].id);
  const [data, setData] = useState<StoreData>(() => seedStoreData(STORES[0].id));
  const [ready, setReady] = useState(false);
  const [activeAttendanceId, setActiveAttendanceId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<StageId>("checkin");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("MODULES");
  const [storeSwitcherOpen, setStoreSwitcherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [startFlow, setStartFlow] = useState<StartFlowState>({ open: false, target: "CHECKLIST" });
  const [userProfile, setUserProfile] = useState<UserProfile>({ preferredName: "Petrick", phone: "", email: "", photo: "" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const saveToastTimer = useRef<number | null>(null);
  const pendingSaveTimer = useRef<number | null>(null);
  const loadedStoreIdRef = useRef(STORES[0].id);
  const hasSavedOnce = useRef(false);
  const canManageCompany = true;

  useEffect(() => {
    if (sessionStorage.getItem("gerivo:session")) setLogged(true);
    const isMobile = window.matchMedia("(max-width: 800px)").matches;
    setSidebarCollapsed(isMobile || localStorage.getItem("gerivo:sidebar-collapsed") === "1");
    loadedStoreIdRef.current = STORES[0].id;
    setData(loadStore(loadedStoreIdRef.current));
    try {
      const savedProfile = localStorage.getItem("gerivo:user-profile");
      if (savedProfile) setUserProfile({ ...userProfile, ...JSON.parse(savedProfile) });
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const dataStoreId = loadedStoreIdRef.current;
    if (pendingSaveTimer.current) window.clearTimeout(pendingSaveTimer.current);
    pendingSaveTimer.current = window.setTimeout(() => {
      saveStore(dataStoreId, data);
      if (hasSavedOnce.current) {
        setToast("Alterações salvas automaticamente");
        if (saveToastTimer.current) window.clearTimeout(saveToastTimer.current);
        saveToastTimer.current = window.setTimeout(() => setToast(""), 2300);
      } else {
        hasSavedOnce.current = true;
      }
    }, 520);
    return () => {
      if (pendingSaveTimer.current) window.clearTimeout(pendingSaveTimer.current);
    };
  }, [data, ready]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const currentStore = STORES.find((store) => store.id === storeId) ?? STORES[0];
  const brandedStore: Store = { ...currentStore, name: data.companyIdentity.displayName || currentStore.name };
  const activeAttendance = data.attendances.find((item) => item.id === activeAttendanceId) ?? null;
  const activeOrder = data.orders.find((item) => item.id === activeOrderId) ?? null;
  const activeQuote = data.quotes.find((item) => item.id === activeQuoteId) ?? null;
  const visibleNav = NAV.filter(
    (item) =>
      !item.hidden &&
      (item.id !== "management" || canManageCompany) &&
      (!item.module || data.companySettings.modules[item.module]),
  );

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sessionStorage.setItem("gerivo:session", "master");
    setLogged(true);
  }

  function changeStore(nextId: string) {
    if (nextId === loadedStoreIdRef.current) {
      setStoreSwitcherOpen(false);
      setMobileMenuOpen(false);
      return;
    }

    if (pendingSaveTimer.current) window.clearTimeout(pendingSaveTimer.current);
    saveStore(loadedStoreIdRef.current, data);
    const nextData = loadStore(nextId);
    loadedStoreIdRef.current = nextId;
    hasSavedOnce.current = false;
    setStoreId(nextId);
    setData(nextData);
    setActiveAttendanceId(null);
    setActiveOrderId(null);
    setActiveQuoteId(null);
    setStoreSwitcherOpen(false);
    setMobileMenuOpen(false);
    setPage("dashboard");
    setToast(`Empresa alterada para ${STORES.find((item) => item.id === nextId)?.name ?? "loja selecionada"}`);
  }

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 800px)").matches) {
      setMobileMenuOpen((current) => !current);
      return;
    }

    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("gerivo:sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  function navigate(target: Page) {
    setMobileMenuOpen(false);
    const navItem = NAV.find((item) => item.id === target);
    if (navItem?.module && !data.companySettings.modules[navItem.module]) {
      window.alert("Este módulo está desativado para a empresa atual.");
      return;
    }
    if (target === "checklist" || target === "orders" || target === "quotes" || target === "dashboard") {
      setActiveAttendanceId(null);
    }
    if (target !== "orders") setActiveOrderId(null);
    if (target !== "quotes") setActiveQuoteId(null);
    setPage(target);
  }

  function openStartFlow(target: StartTarget) {
    const moduleMap: Record<StartTarget, CompanyModule> = { CHECKLIST: "CHECKLIST", ORDER: "ORDERS", QUOTE: "QUOTES" };
    if (!data.companySettings.modules[moduleMap[target]]) {
      window.alert("Este módulo está desativado para a empresa atual.");
      return;
    }
    setStartFlow({ open: true, target });
  }

  function completeStartFlow(payload: {
    target: StartTarget;
    customer: Customer;
    vehicle: Vehicle;
    responsible: string;
  }) {
    const now = new Date().toISOString();
    const customers = data.customers.some((item) => item.id === payload.customer.id)
      ? data.customers.map((item) => item.id === payload.customer.id ? { ...payload.customer, storeId, updatedAt: now } : item)
      : [{ ...payload.customer, storeId, createdAt: now, updatedAt: now }, ...data.customers];
    const vehicles = data.vehicles.some((item) => item.id === payload.vehicle.id)
      ? data.vehicles.map((item) => item.id === payload.vehicle.id ? { ...payload.vehicle, storeId, updatedAt: now } : item)
      : [{ ...payload.vehicle, storeId, createdAt: now, updatedAt: now }, ...data.vehicles];
    const identity: LinkedIdentity = {
      customerId: payload.customer.id,
      vehicleId: payload.vehicle.id,
      customer: payload.customer.name,
      vehicle: payload.vehicle.description,
      plate: payload.vehicle.plate,
      responsible: payload.responsible || userProfile.preferredName || "Petrick",
    };

    if (payload.target === "CHECKLIST") {
      const attendance = createAttendance(data.checklistSettings, data.attendances.length + 1, storeId);
      const prepared: Attendance = {
        ...attendance,
        customerId: payload.customer.id,
        vehicleId: payload.vehicle.id,
        reception: {
          ...attendance.reception,
          customer: payload.customer.name,
          phone: payload.customer.phone,
          email: payload.customer.email,
          vehicle: payload.vehicle.description,
          plate: payload.vehicle.plate,
          responsible: identity.responsible,
        },
      };
      setData({ ...data, customers, vehicles, attendances: [prepared, ...data.attendances] });
      setActiveAttendanceId(prepared.id);
      setActiveStageId("checkin");
      setPage("checklist");
      setToast(`${prepared.code} iniciado para ${payload.customer.name}`);
    } else if (payload.target === "ORDER") {
      const order = createServiceOrder(data.orders, identity, storeId);
      setData({ ...data, customers, vehicles, orders: [order, ...data.orders] });
      setActiveOrderId(order.id);
      setPage("orders");
      setToast(`${order.code} aberta para ${payload.customer.name}`);
    } else {
      const quote = createQuote(data.quotes, identity, storeId, null, data.companySettings.quoteMessageTemplate);
      setData({ ...data, customers, vehicles, quotes: [quote, ...data.quotes] });
      setActiveQuoteId(quote.id);
      setPage("quotes");
      setToast(`${quote.code} criado para ${payload.customer.name}`);
    }
    setStartFlow({ open: false, target: payload.target });
  }

  function updateAttendance(updated: Attendance) {
    setData({
      ...data,
      attendances: data.attendances.map((item) =>
        item.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : item,
      ),
    });
  }

  function deleteAttendance(attendance: Attendance) {
    const vehicle = attendance.reception.vehicle || "veículo não informado";
    const confirmed = window.confirm(`Excluir definitivamente o atendimento ${attendance.code} (${vehicle})? Esta ação não poderá ser desfeita.`);
    if (!confirmed) return;
    setData({ ...data, attendances: data.attendances.filter((item) => item.id !== attendance.id) });
    if (activeAttendanceId === attendance.id) setActiveAttendanceId(null);
    setToast(`Atendimento ${attendance.code} excluído`);
    if (saveToastTimer.current) window.clearTimeout(saveToastTimer.current);
    saveToastTimer.current = window.setTimeout(() => setToast(""), 2500);
  }

  function openAttendance(attendance: Attendance, stageId?: StageId) {
    setActiveAttendanceId(attendance.id);
    setActiveStageId(stageId ?? stageForStatus(attendance.status));
    setPage("checklist");
  }

  function startStage(attendance: Attendance, stageId: StageId) {
    if (stageId === "checkup") {
      const requiresDocument = data.companySettings.modules.ORDERS || data.companySettings.modules.QUOTES;
      const hasLinkedOrder = data.orders.some((item) => item.attendanceId === attendance.id && item.status !== "FECHADA");
      const hasLinkedQuote = data.quotes.some((item) => item.attendanceId === attendance.id && item.status !== "FECHADO");
      if (requiresDocument && !hasLinkedOrder && !hasLinkedQuote) {
        window.alert("Antes de iniciar o Check-up, escolha se o atendimento seguirá por O.S. ou orçamento.");
        return;
      }
    }
    const nextStatus: AttendanceStatus = stageId === "checkup" ? "CHECKUP" : stageId === "quality" ? "QUALITY" : "CHECKOUT";
    const updated: Attendance = {
      ...attendance,
      status: nextStatus,
      stages: attendance.stages.map((stage) =>
        stage.id === stageId && stage.status === "NAO_INICIADO"
          ? { ...stage, status: "EM_ANDAMENTO" }
          : stage,
      ),
    };
    updateAttendance(updated);
    setActiveAttendanceId(updated.id);
    setActiveStageId(stageId);
    setPage("checklist");
  }

  function createStandaloneOrder() {
    openStartFlow("ORDER");
  }

  function createStandaloneQuote() {
    openStartFlow("QUOTE");
  }

  function openModuleFromAttendance(attendance: Attendance, target: "orders" | "quotes") {
    if (target === "orders") {
      const existing = data.orders.find((item) => item.attendanceId === attendance.id && item.status !== "FECHADA");
      if (existing) {
        setActiveOrderId(existing.id);
      } else {
        const order = createServiceOrder(data.orders, identityFromAttendance(attendance), storeId, attendance);
        setData({ ...data, orders: [order, ...data.orders] });
        setActiveOrderId(order.id);
        setToast(`${order.code} vinculada ao atendimento ${attendance.code}`);
      }
      setActiveQuoteId(null);
    } else {
      const existing = data.quotes.find((item) => item.attendanceId === attendance.id && item.status !== "FECHADO");
      if (existing) {
        setActiveQuoteId(existing.id);
      } else {
        const quote = createQuote(data.quotes, identityFromAttendance(attendance), storeId, attendance, data.companySettings.quoteMessageTemplate);
        setData({ ...data, quotes: [quote, ...data.quotes] });
        setActiveQuoteId(quote.id);
        setToast(`${quote.code} vinculado ao atendimento ${attendance.code}`);
      }
      setActiveOrderId(null);
    }
    setActiveAttendanceId(null);
    setPage(target);
  }


  function closeOrderForAttendance(attendance: Attendance) {
    const linked = data.orders.find((item) => item.attendanceId === attendance.id && item.status !== "FECHADA");
    if (!linked) {
      window.alert("Nenhuma O.S. aberta está vinculada a este atendimento.");
      return;
    }
    if (!window.confirm(`Encerrar definitivamente a ${linked.code}?`)) return;
    setData({
      ...data,
      orders: data.orders.map((item) => item.id === linked.id ? { ...item, status: "FECHADA", updatedAt: new Date().toISOString() } : item),
    });
    setToast(`${linked.code} encerrada com sucesso`);
  }

  const sidebarTheme = sidebarThemeVariables(data.companyIdentity.sidebarColor);
  const sidebarUsesDarkAssets = sidebarIsLight(data.companyIdentity.sidebarColor);

  if (!logged) return <Login onSubmit={login} />;

  return (
    <main style={sidebarTheme as any} className={`${sidebarCollapsed ? "shell sidebar-collapsed" : "shell"} ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
      <button
        type="button"
        className="sidebar-overlay"
        aria-label="Fechar menu"
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
        <div className={data.companyIdentity.logo ? "brand company-brand" : "brand"}>
          {data.companyIdentity.logo ? (
            <>
              <div className="company-brand-full"><img src={data.companyIdentity.logo} alt={data.companyIdentity.displayName} /><strong>{data.companyIdentity.displayName}</strong></div>
              <img className="company-brand-mark" src={data.companyIdentity.logo} alt={data.companyIdentity.displayName} />
            </>
          ) : (
            <>
              <img className="brand-full" src={sidebarUsesDarkAssets ? "/gerivo-logo.png" : "/gerivo-logo-light.png"} alt="Gerivo" />
              <img className="brand-mark-only" src={sidebarUsesDarkAssets ? "/gerivo-mark.png" : "/gerivo-mark-light.png"} alt="Gerivo" />
            </>
          )}
          <button
            className="sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Minimizar menu"}
          >
            <PremiumIcon name="menu" size={20} />
          </button>
        </div>

        <nav>
          <small className="nav-section-title">OPERAÇÃO</small>
          {visibleNav
            .filter((item) => item.id !== "management")
            .map((item) => (
              <button
                key={item.id}
                title={sidebarCollapsed ? item.label : undefined}
                className={page === item.id ? "nav active" : "nav"}
                onClick={() => navigate(item.id)}
              >
                <i><PremiumIcon name={item.icon} size={17} /></i>
                <span>{item.label}</span>
              </button>
            ))}

          {visibleNav.some((item) => item.id === "management") && (
            <>
              <small className="nav-section-title management-title">ADMINISTRAÇÃO</small>
              {visibleNav
                .filter((item) => item.id === "management")
                .map((item) => (
                  <button
                    key={item.id}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={page === item.id || page === "catalog" ? "nav active" : "nav"}
                    onClick={() => navigate(item.id)}
                  >
                    <i><PremiumIcon name={item.icon} size={17} /></i>
                    <span>{item.label}</span>
                  </button>
                ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {data.companyIdentity.logo && <div className="gerivo-technology"><img src={sidebarUsesDarkAssets ? "/gerivo-mark.png" : "/gerivo-mark-light.png"} alt="" /><span>Tecnologia Gerivo</span></div>}
          <button type="button" className="current-store" title={sidebarCollapsed ? `Loja: ${brandedStore.name}` : undefined} onClick={() => setStoreSwitcherOpen(true)}>
            <PremiumIcon name="store" size={17} />
            <div>
              <small>EMPRESA / LOJA ATUAL</small>
              <strong>{brandedStore.name}</strong>
              <span>Trocar empresa ou loja</span>
            </div>
            <PremiumIcon name="chevron" size={15} />
          </button>

          <button type="button" className="user user-profile-button" title={sidebarCollapsed ? `Perfil: ${userProfile.preferredName || "Petrick"}` : undefined} onClick={() => setProfileOpen(true)}>
            <b>{userProfile.photo ? <img src={userProfile.photo} alt="Foto do perfil" /> : <PremiumIcon name="user" size={17} />}</b>
            <div>
              <strong>{userProfile.preferredName || "Petrick"}</strong>
              <small>MASTER GERIVO · Editar perfil</small>
            </div>
            <PremiumIcon name="chevron" size={14} />
          </button>

          <button
            className="logout"
            title={sidebarCollapsed ? "Sair" : undefined}
            onClick={() => {
              sessionStorage.removeItem("gerivo:session");
              setLogged(false);
            }}
          >
            <PremiumIcon name="logout" size={17} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu-trigger"
              type="button"
              onClick={toggleSidebar}
              aria-label="Abrir menu"
            >
              <PremiumIcon name="menu" size={22} />
            </button>
            <div>
              <small>PLATAFORMA GERIVO</small>
              <h1>{NAV.find((item) => item.id === page)?.label ?? "Gerivo"}</h1>
            </div>
          </div>

          <div className="top-actions">
            {page === "dashboard" && data.companySettings.modules.CHECKLIST ? (
              <button className="primary" onClick={() => openStartFlow("CHECKLIST")}>+ Nova recepção</button>
            ) : page === "dashboard" && data.companySettings.modules.QUOTES ? (
              <button className="primary" onClick={createStandaloneQuote}>+ Novo orçamento</button>
            ) : page === "checklist" ? (
              <button className="primary" onClick={() => openStartFlow("CHECKLIST")}>+ Nova recepção</button>
            ) : page === "orders" && !activeOrder ? (
              <button className="primary" onClick={createStandaloneOrder}>+ Nova O.S.</button>
            ) : page === "quotes" && !activeQuote ? (
              <button className="primary" onClick={createStandaloneQuote}>+ Novo orçamento</button>
            ) : null}
          </div>
        </header>

        <div className="content">
          {page === "dashboard" && (
            <Dashboard
              store={brandedStore}
              data={data}
              onCreate={() => openStartFlow("CHECKLIST")}
              onOpen={openAttendance}
              onStartStage={startStage}
              onOpenModule={openModuleFromAttendance}
              onDelete={deleteAttendance}
              onOpenOrders={() => { setActiveAttendanceId(null); setPage("orders"); }}
              onOpenQuotes={() => { setActiveAttendanceId(null); setPage("quotes"); }}
              companySettings={data.companySettings}
            />
          )}

          {page === "management" && (
            <ManagementHub
              store={brandedStore}
              data={data}
              onOpenCatalog={() => setPage("catalog")}
              onOpenIdentity={() => { setSettingsTab("IDENTITY"); setSettingsOpen(true); }}
              onOpenModules={() => { setSettingsTab("MODULES"); setSettingsOpen(true); }}
              onOpenChecklist={() => { setSettingsTab("CHECKLIST"); setSettingsOpen(true); }}
            />
          )}

          {page === "catalog" && (
            <Catalog
              store={brandedStore}
              items={data.catalog}
              serviceTypes={data.serviceTypes}
              onChange={(catalog) => setData({ ...data, catalog })}
              onServiceTypesChange={(serviceTypes) => setData({ ...data, serviceTypes })}
            />
          )}

          {page === "checklist" && (
            activeAttendance ? (
              <Checklist
                store={brandedStore}
                attendance={activeAttendance}
                stageId={activeStageId}
                onStageChange={setActiveStageId}
                onChange={updateAttendance}
                onExit={() => { setActiveAttendanceId(null); setPage("checklist"); }}
                onOpenModule={(target) => openModuleFromAttendance(activeAttendance, target)}
                knownAttendances={data.attendances}
                linkedOrder={data.orders.find((item) => item.attendanceId === activeAttendance.id) ?? null}
                onCloseOrder={() => closeOrderForAttendance(activeAttendance)}
              />
            ) : (
              <ChecklistIndex
                attendances={data.attendances}
                onCreate={() => openStartFlow("CHECKLIST")}
                onOpen={openAttendance}
                onStartStage={startStage}
                onOpenModule={openModuleFromAttendance}
                onDelete={deleteAttendance}
                companySettings={data.companySettings}
              />
            )
          )}

          {page === "orders" && (
            activeOrder ? (
              <ServiceOrderEditor
                order={activeOrder}
                catalog={data.catalog}
                companyName={data.companyIdentity.displayName}
                onChange={(updated) => setData({ ...data, orders: data.orders.map((item) => item.id === updated.id ? updated : item) })}
                onBack={() => setActiveOrderId(null)}
                onSaved={() => { setToast(`${activeOrder.code} salva`); if (saveToastTimer.current) window.clearTimeout(saveToastTimer.current); saveToastTimer.current = window.setTimeout(() => setToast(""), 2200); }}
              />
            ) : (
              <OrdersPage
                orders={data.orders}
                attendances={data.attendances}
                onChange={(orders) => setData({ ...data, orders })}
                onCreate={createStandaloneOrder}
                onOpen={setActiveOrderId}
              />
            )
          )}

          {page === "quotes" && (
            activeQuote ? (
              <QuoteEditor
                quote={activeQuote}
                catalog={data.catalog}
                companyName={data.companyIdentity.displayName}
                companyIdentity={data.companyIdentity}
                customer={data.customers.find((item) => item.id === activeQuote.customerId) ?? null}
                deliveryMode={data.companySettings.quoteDeliveryMode}
                onChange={(updated) => setData({ ...data, quotes: data.quotes.map((item) => item.id === updated.id ? updated : item) })}
                onBack={() => setActiveQuoteId(null)}
                onSaved={() => { setToast(`${activeQuote.code} salvo`); if (saveToastTimer.current) window.clearTimeout(saveToastTimer.current); saveToastTimer.current = window.setTimeout(() => setToast(""), 2200); }}
              />
            ) : (
              <QuotesPage
                quotes={data.quotes}
                attendances={data.attendances}
                deliveryMode={data.companySettings.quoteDeliveryMode}
                onChange={(quotes) => setData({ ...data, quotes })}
                onCreate={createStandaloneQuote}
                onOpen={setActiveQuoteId}
              />
            )
          )}
        </div>
      </section>

      {toast && (
        <div className="save-toast" role="status">
          <span>✓</span>
          <div>
            <strong>{toast}</strong>
            <small>Seus dados permanecem protegidos nesta sessão.</small>
          </div>
        </div>
      )}

      {startFlow.open && (
        <StartFlowWizard
          target={startFlow.target}
          customers={data.customers}
          vehicles={data.vehicles}
          attendances={data.attendances}
          currentStoreId={storeId}
          defaultResponsible={userProfile.preferredName || "Petrick"}
          onClose={() => setStartFlow({ ...startFlow, open: false })}
          onComplete={completeStartFlow}
        />
      )}

      {storeSwitcherOpen && (
        <StoreSwitcherModal
          stores={STORES}
          currentStoreId={storeId}
          onClose={() => setStoreSwitcherOpen(false)}
          onSelect={changeStore}
        />
      )}

      {profileOpen && (
        <UserProfileModal
          profile={userProfile}
          onClose={() => setProfileOpen(false)}
          onSave={(profile) => {
            setUserProfile(profile);
            localStorage.setItem("gerivo:user-profile", JSON.stringify(profile));
            setProfileOpen(false);
            setToast("Perfil atualizado");
            if (saveToastTimer.current) window.clearTimeout(saveToastTimer.current);
            saveToastTimer.current = window.setTimeout(() => setToast(""), 2200);
          }}
        />
      )}

      {settingsOpen && (
        <CompanySettingsModal
          companySettings={data.companySettings}
          companyIdentity={data.companyIdentity}
          checklistSettings={data.checklistSettings}
          initialTab={settingsTab}
          onClose={() => setSettingsOpen(false)}
          onSave={(companySettings, checklistSettings, companyIdentity) => {
            setData({ ...data, companySettings, checklistSettings, companyIdentity });
            const currentNav = NAV.find((item) => item.id === page);
            if (currentNav?.module && !companySettings.modules[currentNav.module]) {
              setPage("dashboard");
            }
            setSettingsOpen(false);
          }}
        />
      )}
    </main>
  );
}

function Login({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [show, setShow] = useState(false);

  return (
    <main className="login-page">
      <section className="login-card">
        <aside className="login-showcase">
          <div className="login-brand-lockup">
            <img src="/gerivo-logo-light.png" alt="Gerivo" />
            <span>Gerir para Evoluir</span>
          </div>

          <div className="login-message">
            <small>GERIVO</small>
            <h1>Seu negócio.<br />Seu sistema.</h1>
          </div>

          <div className="login-showcase-mark">
            <img src="/gerivo-mark-light.png" alt="" aria-hidden="true" />
          </div>
        </aside>

        <form onSubmit={onSubmit}>
          <div className="login-form-brand">
            <img src="/gerivo-logo.png" alt="Gerivo" />
            <span>Gerir para Evoluir</span>
          </div>

          <small>ACESSO AO SISTEMA</small>
          <h2>Bem-vindo</h2>
          <p>Entre com seu usuário e senha.</p>

          <label>
            Usuário
            <input required autoComplete="username" placeholder="Digite seu usuário" />
          </label>

          <label>
            Senha
            <div className="password">
              <input
                required
                autoComplete="current-password"
                type={show ? "text" : "password"}
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                title={show ? "Ocultar senha" : "Mostrar senha"}
              >
                <PremiumIcon name={show ? "eyeOff" : "eye"} size={19} />
              </button>
            </div>
          </label>

          <button className="primary login-button">Entrar no Gerivo</button>

          <footer className="login-footer">
            <span>Gerivo v1.5</span>
            <span>© Gerivo — Sistema desenvolvido por Petrick Maciel</span>
          </footer>
        </form>
      </section>
    </main>
  );
}

function Dashboard({
  store,
  data,
  onCreate,
  onOpen,
  onStartStage,
  onOpenModule,
  onDelete,
  onOpenOrders,
  onOpenQuotes,
  companySettings,
}: {
  store: Store;
  data: StoreData;
  onCreate: () => void;
  onOpen: (attendance: Attendance, stageId?: StageId) => void;
  onStartStage: (attendance: Attendance, stageId: StageId) => void;
  onOpenModule: (attendance: Attendance, target: "orders" | "quotes") => void;
  onDelete: (attendance: Attendance) => void;
  onOpenOrders: () => void;
  onOpenQuotes: () => void;
  companySettings: CompanySettings;
}) {
  const openAttendances = data.attendances.filter((item) => item.status !== "CONCLUIDO");
  const closedOrders = data.orders.filter((item) => item.status === "FECHADA");
  const closedQuotes = data.quotes.filter((item) => item.status === "FECHADO");
  const openOrders = data.orders.filter((item) => item.status !== "FECHADA");
  const approvalQuotes = data.quotes.filter((item) => item.status === "AGUARDANDO_APROVACAO");
  const revenue = companySettings.modules.ORDERS
    ? closedOrders.reduce((total, item) => total + item.total, 0)
    : closedQuotes.reduce((total, item) => total + item.total, 0);

  const metrics: Array<{ label: string; value: string; detail: string }> = [];
  if (companySettings.modules.CHECKLIST) {
    metrics.push({ label: "Atendimentos ativos", value: String(openAttendances.length), detail: "Recepções em qualquer etapa" });
  }
  metrics.push({ label: "Faturamento registrado", value: money(revenue), detail: companySettings.modules.ORDERS ? "O.S. fechadas" : "Orçamentos fechados" });
  if (companySettings.modules.ORDERS) {
    metrics.push({ label: "Ordens de serviço abertas", value: String(openOrders.length), detail: "Abertas, pendentes ou incompletas" });
  }
  if (companySettings.modules.QUOTES) {
    metrics.push({ label: "Aguardando aprovação", value: String(approvalQuotes.length), detail: "Orçamentos enviados ao cliente" });
  }
  if (metrics.length < 4 && companySettings.modules.QUOTES) {
    metrics.push({ label: "Orçamentos em andamento", value: String(data.quotes.filter((item) => item.status !== "FECHADO").length), detail: "Operação comercial" });
  }

  return (
    <>
      <section className="dashboard-heading dashboard-heading-clean">
        <small>RESUMO OPERACIONAL · {store.name.toUpperCase()}</small>
      </section>

      <section className={`metrics dashboard-metrics metrics-${Math.min(metrics.length, 4)}`}>
        {metrics.slice(0, 4).map((metric) => (
          <Metric key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
        ))}
      </section>

      {(companySettings.modules.ORDERS || companySettings.modules.QUOTES) && (
        <section className="dashboard-operation-grid">
          {companySettings.modules.ORDERS && (
            <DashboardDocumentPanel
              eyebrow="ORDENS DE SERVIÇO"
              title="O.S. abertas"
              empty="Nenhuma ordem de serviço aberta."
              records={openOrders.slice(0, 5).map((order) => ({
                code: order.code,
                primary: order.vehicle || order.customer || "Cadastro incompleto",
                secondary: order.plate || "Sem placa",
                status: serviceOrderStatusLabel(order.status),
                statusClass: order.status.toLowerCase(),
                value: money(order.total),
              }))}
              onOpen={onOpenOrders}
            />
          )}

          {companySettings.modules.QUOTES && (
            <DashboardDocumentPanel
              eyebrow="ORÇAMENTOS"
              title="Pendentes de aprovação"
              empty="Nenhum orçamento aguardando aprovação."
              records={approvalQuotes.slice(0, 5).map((quote) => ({
                code: quote.code,
                primary: quote.vehicle || quote.customer || "Cadastro incompleto",
                secondary: quote.plate || "Sem placa",
                status: quoteStatusLabel(quote.status),
                statusClass: quote.status.toLowerCase(),
                value: money(quote.total),
              }))}
              onOpen={onOpenQuotes}
            />
          )}
        </section>
      )}

      {companySettings.modules.CHECKLIST && (
        <section className="panel attendance-panel">
          <header><div><small>ATENDIMENTOS</small><h3>Atendimentos recentes</h3></div><span className="count">{data.attendances.length} registros</span></header>
          {data.attendances.length === 0 ? (
            <div className="empty-attendance"><div className="garage-icon"><PremiumIcon name="car" size={27} /></div><h3>Nenhum atendimento aberto</h3><p>Inicie uma nova recepção para registrar o veículo e começar o atendimento.</p><button className="primary" onClick={onCreate}>Criar primeira recepção</button></div>
          ) : (
            <div className="attendance-list">
              {data.attendances.slice(0, 6).map((attendance) => (
                <AttendanceCard
                  key={attendance.id}
                  attendance={attendance}
                  onOpen={onOpen}
                  onStartStage={onStartStage}
                  onOpenModule={onOpenModule}
                  onDelete={onDelete}
                  companySettings={companySettings}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function DashboardDocumentPanel({
  eyebrow,
  title,
  empty,
  records,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  empty: string;
  records: Array<{ code: string; primary: string; secondary: string; status: string; statusClass: string; value: string }>;
  onOpen: () => void;
}) {
  return (
    <article className="panel dashboard-document-panel">
      <header><div><small>{eyebrow}</small><h3>{title}</h3></div><button className="text-action" onClick={onOpen}>Ver todos</button></header>
      {records.length === 0 ? (
        <div className="dashboard-document-empty">{empty}</div>
      ) : (
        <div className="dashboard-document-list">
          {records.map((record) => (
            <div key={record.code} className="dashboard-document-row">
              <strong>{record.code}</strong>
              <div><b>{record.primary}</b><small>{record.secondary}</small></div>
              <span className={`document-status status-${record.statusClass}`}>{record.status}</span>
              <em>{record.value}</em>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ManagementHub({
  store,
  data,
  onOpenCatalog,
  onOpenIdentity,
  onOpenModules,
  onOpenChecklist,
}: {
  store: Store;
  data: StoreData;
  onOpenCatalog: () => void;
  onOpenIdentity: () => void;
  onOpenModules: () => void;
  onOpenChecklist: () => void;
}) {
  const activeServices = data.catalog.filter((item) => item.active).length;

  return (
    <div className="management-page">
      <section className="management-heading">
        <div>
          <small>ADMINISTRAÇÃO DA EMPRESA</small>
          <h2>Gestão de {store.name}</h2>
          <p>Configurações disponíveis apenas para usuários com permissão administrativa.</p>
        </div>
      </section>

      <section className="management-grid">
        <button type="button" className="management-card identity-management-card" onClick={onOpenIdentity}>
          <span className="management-icon identity-preview-icon">{data.companyIdentity.logo ? <img src={data.companyIdentity.logo} alt="" /> : <PremiumIcon name="store" size={24} />}</span>
          <div>
            <strong>Identidade visual</strong>
            <p>Logo, nome exibido e cor da barra lateral para esta empresa.</p>
            <small>{data.companyIdentity.logo ? "Marca própria ativa · Tecnologia Gerivo" : "Identidade Gerivo padrão"}</small>
          </div>
          <PremiumIcon name="chevron" size={18} />
        </button>
        <button type="button" className="management-card" onClick={onOpenCatalog}>
          <span className="management-icon"><PremiumIcon name="layers" size={24} /></span>
          <div>
            <strong>Itens e serviços</strong>
            <p>Cadastre serviços, peças, produtos, preços e padrões de orçamento.</p>
            <small>{activeServices} itens ativos</small>
          </div>
          <PremiumIcon name="chevron" size={18} />
        </button>

        <button type="button" className="management-card" onClick={onOpenModules}>
          <span className="management-icon"><PremiumIcon name="modules" size={24} /></span>
          <div>
            <strong>Módulos e operação</strong>
            <p>Escolha quais áreas a empresa utiliza e o padrão de envio de orçamento.</p>
            <small>Definir módulos e padrão de orçamento</small>
          </div>
          <PremiumIcon name="chevron" size={18} />
        </button>

        <button type="button" className="management-card" onClick={onOpenChecklist}>
          <span className="management-icon"><PremiumIcon name="clipboard" size={24} /></span>
          <div>
            <strong>Modelos de checklist</strong>
            <p>Defina etapas, grupos e itens aplicáveis ao fluxo da empresa.</p>
            <small>{data.checklistSettings.name}</small>
          </div>
          <PremiumIcon name="chevron" size={18} />
        </button>

        <button
          type="button"
          className="management-card"
          onClick={() => window.alert("Usuários e permissões serão conectados ao banco na etapa de autenticação real.")}
        >
          <span className="management-icon"><PremiumIcon name="users" size={24} /></span>
          <div>
            <strong>Usuários e acessos</strong>
            <p>Gerencie funções, permissões e vínculo com empresas e lojas.</p>
            <small>Disponível na próxima fase</small>
          </div>
          <PremiumIcon name="chevron" size={18} />
        </button>
      </section>
    </div>
  );
}

function AttendanceCard({
  attendance,
  onOpen,
  onStartStage,
  onOpenModule,
  onDelete,
  companySettings,
}: {
  attendance: Attendance;
  onOpen: (attendance: Attendance, stageId?: StageId) => void;
  onStartStage: (attendance: Attendance, stageId: StageId) => void;
  onOpenModule: (attendance: Attendance, target: "orders" | "quotes") => void;
  onDelete: (attendance: Attendance) => void;
  companySettings: CompanySettings;
}) {
  const stageStates = attendance.stages.map((stage) => stage.status === "CONCLUIDO");
  return (
    <article className="attendance-card">
      <div className="attendance-id"><span><PremiumIcon name="car" size={18} /></span><div><strong>{attendance.code}</strong><small>{formatDate(attendance.createdAt)}</small></div></div>
      <div className="attendance-vehicle"><strong>{attendance.reception.vehicle || "Veículo não informado"}</strong><span>{attendance.reception.plate || "Sem placa"} · {attendance.reception.customer || "Cliente não informado"}</span></div>
      <div className={`attendance-status status-${attendance.status.toLowerCase()}`}>{attendanceStatusLabel(attendance.status)}</div>
      <div className="mini-flow">
        {attendance.stages.map((stage, index) => <span key={stage.id} className={stageStates[index] ? "done" : stage.status === "EM_ANDAMENTO" ? "active" : ""}>{stageStates[index] ? "✓" : index + 1}<small>{stage.label}</small></span>)}
      </div>
      <div className="attendance-actions">
        {attendance.status === "CHECKIN" && <button className="primary small" onClick={() => onOpen(attendance, "checkin")}>Continuar check-in</button>}
        {attendance.status === "AGUARDANDO_CHECKUP" && <button className="primary small" onClick={() => onStartStage(attendance, "checkup")}>Iniciar check-up</button>}
        {attendance.status === "CHECKUP" && <button className="primary small" onClick={() => onOpen(attendance, "checkup")}>Continuar check-up</button>}
        {attendance.status === "AGUARDANDO_QUALITY" && <button className="primary small" onClick={() => onStartStage(attendance, "quality")}>Iniciar qualidade</button>}
        {attendance.status === "QUALITY" && <button className="primary small" onClick={() => onOpen(attendance, "quality")}>Continuar qualidade</button>}
        {attendance.status === "AGUARDANDO_CHECKOUT" && <button className="primary small" onClick={() => onStartStage(attendance, "checkout")}>Iniciar check-out</button>}
        {attendance.status === "CHECKOUT" && <button className="primary small" onClick={() => onOpen(attendance, "checkout")}>Continuar check-out</button>}
        {attendance.status === "CONCLUIDO" && <button className="outline small" onClick={() => onOpen(attendance, "checkout")}>Ver checklist</button>}
        {attendance.status !== "CHECKIN" && companySettings.modules.ORDERS && <button className="outline small" onClick={() => onOpenModule(attendance, "orders")}>Abrir O.S.</button>}
        {attendance.status !== "CHECKIN" && companySettings.modules.QUOTES && <button className="outline small" onClick={() => onOpenModule(attendance, "quotes")}>Abrir orçamento</button>}
        <button className="delete-attendance-button" title="Excluir atendimento" aria-label={`Excluir ${attendance.code}`} onClick={() => onDelete(attendance)}><PremiumIcon name="trash" size={15} /></button>
      </div>
    </article>
  );
}

function Metric({ label, value, detail, compact = false }: { label: string; value: string; detail: string; compact?: boolean }) {
  return <article className={compact ? "metric compact" : "metric"}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Catalog({
  store,
  items,
  serviceTypes,
  onChange,
  onServiceTypesChange,
}: {
  store: Store;
  items: CatalogItem[];
  serviceTypes: ServiceType[];
  onChange: (items: CatalogItem[]) => void;
  onServiceTypesChange: (types: ServiceType[]) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<CatalogKind>("SERVICO");
  const [price, setPrice] = useState("");
  const [standard, setStandard] = useState(true);
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes.find((item) => item.active)?.id ?? "");
  const [newServiceType, setNewServiceType] = useState("");

  const activeServiceTypes = serviceTypes.filter((item) => item.active);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(price.replace(",", ".")) || 0;
    const selectedType = serviceTypes.find((item) => item.id === serviceTypeId);
    const finalCategory = kind === "SERVICO" ? (selectedType?.name ?? (category.trim() || "Serviço geral")) : category.trim();
    onChange([...items, { id: uid(), name: name.trim(), category: finalCategory, kind, price: value, active: true, standard: kind === "SERVICO" ? standard : false, serviceTypeId: kind === "SERVICO" ? selectedType?.id : undefined }]);
    setName("");
    setCategory("");
    setPrice("");
    setStandard(true);
  }

  function addLibraryItem(template: Omit<CatalogItem, "id" | "active">) {
    if (items.some((item) => item.name.toLowerCase() === template.name.toLowerCase())) {
      window.alert("Este serviço já está cadastrado.");
      return;
    }
    onChange([...items, { ...template, id: uid(), active: true }]);
  }

  function addServiceType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newServiceType.trim();
    if (!value) return;
    if (serviceTypes.some((item) => item.name.toLowerCase() === value.toLowerCase())) {
      window.alert("Este tipo de serviço já está cadastrado.");
      return;
    }
    const next = { id: uid(), name: value, active: true };
    onServiceTypesChange([...serviceTypes, next]);
    setServiceTypeId(next.id);
    setNewServiceType("");
  }

  function removeServiceType(type: ServiceType) {
    if (items.some((item) => item.serviceTypeId === type.id)) {
      window.alert("Este tipo está vinculado a itens do catálogo. Desative-o ou altere os itens antes de remover.");
      return;
    }
    if (!window.confirm(`Remover o tipo de serviço “${type.name}”?`)) return;
    onServiceTypesChange(serviceTypes.filter((item) => item.id !== type.id));
  }

  const standardCount = items.filter((item) => item.standard && item.kind === "SERVICO").length;

  return <section className="catalog-page">
    <section className="service-type-panel panel">
      <header><div><small>ORGANIZAÇÃO DO CATÁLOGO</small><h3>Tipos de serviço</h3></div><span className="count">{activeServiceTypes.length} ativos</span></header>
      <div className="service-type-content">
        <form onSubmit={addServiceType}><input value={newServiceType} onChange={(event) => setNewServiceType(event.target.value)} placeholder="Ex.: Funilaria e pintura" /><button className="primary" type="submit">Cadastrar tipo</button></form>
        <div className="service-type-list">
          {serviceTypes.map((type) => <div key={type.id} className={type.active ? "service-type-chip" : "service-type-chip inactive"}><span>{type.name}</span><button type="button" onClick={() => onServiceTypesChange(serviceTypes.map((item) => item.id === type.id ? { ...item, active: !item.active } : item))}>{type.active ? "Ativo" : "Inativo"}</button><button type="button" className="remove" onClick={() => removeServiceType(type)}>×</button></div>)}
        </div>
      </div>
    </section>

    <section className="standard-library panel">
      <header><div><small>BIBLIOTECA RÁPIDA</small><h3>Serviços padrão</h3></div><span className="count">{standardCount} configurados</span></header>
      <div className="standard-service-grid">
        {STANDARD_SERVICE_LIBRARY.map((service) => {
          const exists = items.some((item) => item.name.toLowerCase() === service.name.toLowerCase());
          return <button key={service.name} type="button" className={exists ? "standard-service-card added" : "standard-service-card"} disabled={exists} onClick={() => addLibraryItem(service)}>
            <span>Serviço</span><strong>{service.name}</strong><small>{service.category} · {money(service.price)}</small><em>{exists ? "Adicionado" : "+ Adicionar"}</em>
          </button>;
        })}
      </div>
    </section>
    <section className="catalog-layout">
      <article className="panel form-panel"><header><small>CONFIGURAÇÃO PRÓPRIA</small><h3>Novo item ou serviço</h3></header><form onSubmit={add} className="form-grid">
        <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex.: Troca de pastilhas" /></label>
        {kind === "SERVICO" ? <label>Tipo de serviço<select value={serviceTypeId} onChange={(event) => setServiceTypeId(event.target.value)} required><option value="">Selecione</option>{activeServiceTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label> : <label>Categoria<input value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="Ex.: Filtros" /></label>}
        <div className="split"><label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value as CatalogKind)}><option value="SERVICO">Serviço</option><option value="PRODUTO">Produto</option><option value="PECA">Peça</option></select></label><label>Preço<input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0,00" /></label></div>
        {kind === "SERVICO" && <label className="standard-checkbox"><input type="checkbox" checked={standard} onChange={(e) => setStandard(e.target.checked)} /><span>Disponibilizar como serviço padrão nos orçamentos</span></label>}
        <button className="primary">Adicionar ao catálogo</button><p>Cada empresa e loja mantém seus próprios tipos, catálogo e serviços padrão.</p>
      </form></article>
      <article className="panel"><header><small>{store.name.toUpperCase()}</small><h3>Itens e serviços configurados</h3></header><div className="catalog-list">{items.map((item) => <div className={item.active ? "catalog-row catalog-row-v07" : "catalog-row catalog-row-v07 inactive"} key={item.id}><span className={`pill ${item.kind.toLowerCase()}`}>{item.kind === "SERVICO" ? "Serviço" : item.kind === "PRODUTO" ? "Produto" : "Peça"}</span><div><strong>{item.name}</strong><small>{item.category}{item.standard ? " · Serviço padrão" : ""}</small></div><b>{money(item.price)}</b>{item.kind === "SERVICO" ? <button className={item.standard ? "standard-toggle active" : "standard-toggle"} onClick={() => onChange(items.map((current) => current.id === item.id ? { ...current, standard: !current.standard } : current))}>{item.standard ? "Padrão" : "Tornar padrão"}</button> : <span /> }<input type="checkbox" checked={item.active} onChange={() => onChange(items.map((current) => current.id === item.id ? { ...current, active: !current.active } : current))} /><button onClick={() => onChange(items.filter((current) => current.id !== item.id))}>Remover</button></div>)}</div></article>
    </section>
  </section>;
}
function Checklist({
  store,
  attendance,
  stageId,
  onStageChange,
  onChange,
  onExit,
  onOpenModule,
  knownAttendances,
  linkedOrder,
  onCloseOrder,
}: {
  store: Store;
  attendance: Attendance;
  stageId: StageId;
  onStageChange: (stageId: StageId) => void;
  onChange: (attendance: Attendance) => void;
  onExit: () => void;
  onOpenModule: (target: "orders" | "quotes") => void;
  knownAttendances: Attendance[];
  linkedOrder: ServiceOrder | null;
  onCloseOrder: () => void;
}) {
  const [photoMessage, setPhotoMessage] = useState("");
  const [openNotes, setOpenNotes] = useState<string[]>([]);
  const stage = attendance.stages.find((item) => item.id === stageId) ?? attendance.stages[0];
  const stageIndex = attendance.stages.findIndex((item) => item.id === stage.id);
  const grouped = useMemo(() => stage.items.reduce<Record<string, CheckItem[]>>((acc, item) => { (acc[item.category] ??= []).push(item); return acc; }, {}), [stage]);
  const groupEntries = Object.entries(grouped) as Array<[string, CheckItem[]]>;
  const visibleGroupEntries: Array<[string, CheckItem[]]> = groupEntries;
  const isLocked = stage.status === "CONCLUIDO";
  const normalizedPlate = attendance.reception.plate.replace(/[^A-Z0-9]/g, "").toUpperCase();
  const plateMatch = useMemo(
    () =>
      normalizedPlate.length >= 7
        ? knownAttendances
            .filter((item) => item.id !== attendance.id && item.storeId === attendance.storeId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .find(
              (item) =>
                item.reception.plate.replace(/[^A-Z0-9]/g, "").toUpperCase() === normalizedPlate &&
                Boolean(item.reception.customer || item.reception.vehicle),
            ) ?? null
        : null,
    [attendance.id, knownAttendances, normalizedPlate],
  );


  function patchAttendance(patch: Partial<Attendance>) {
    onChange({ ...attendance, ...patch, updatedAt: new Date().toISOString() });
  }

  function setReception(field: keyof Reception, value: string) {
    patchAttendance({ reception: { ...attendance.reception, [field]: field === "plate" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : value } });
  }

  function applyPlateMatch() {
    if (!plateMatch) return;
    patchAttendance({
      reception: {
        ...attendance.reception,
        customer: plateMatch.reception.customer,
        phone: plateMatch.reception.phone,
        email: plateMatch.reception.email,
        vehicle: plateMatch.reception.vehicle,
      },
    });
  }

  function updateStage(updated: Stage) {
    patchAttendance({ stages: attendance.stages.map((item) => item.id === updated.id ? updated : item) });
  }

  function updateItem(itemId: string, patch: Partial<CheckItem>) {
    updateStage({ ...stage, items: stage.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) });
  }

  async function addPhotos(files: File[], callback: (photos: Photo[]) => void) {
    if (!files.length) return;
    setPhotoMessage(`Processando ${files.length} foto(s)...`);
    try {
      const photos = await Promise.all(files.map(preparePhoto));
      callback(photos);
      setPhotoMessage(`${files.length} foto(s) adicionada(s).`);
    } catch (error) {
      setPhotoMessage(error instanceof Error ? error.message : "Falha ao adicionar fotos.");
    }
    window.setTimeout(() => setPhotoMessage(""), 2400);
  }

  function addStagePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []) as File[];
    void addPhotos(files, (photos) => updateStage({ ...stage, photos: [...stage.photos, ...photos] }));
    event.target.value = "";
  }

  function addItemPhotos(item: CheckItem, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []) as File[];
    void addPhotos(files, (photos) => updateItem(item.id, { photos: [...item.photos, ...photos] }));
    event.target.value = "";
  }

  function fillGroup(items: CheckItem[], value: ItemValue) {
    const ids = new Set(items.filter((item) => item.mode === "CONDITION").map((item) => item.id));
    updateStage({ ...stage, items: stage.items.map((item) => ids.has(item.id) ? { ...item, value } : item) });
  }

  function completeStage() {
    if (stage.id === "checkup") {
      const report = attendance.technicalReport;
      if (!report.diagnosis.trim() || !report.conclusion.trim()) {
        window.alert("Preencha ao menos o diagnóstico e a conclusão do laudo técnico antes de concluir o Check-up.");
        return;
      }
    }
    const pending = stage.items.filter((item) => item.value === "PENDENTE");
    if (pending.length) {
      window.alert(`Ainda existem ${pending.length} itens sem resposta neste módulo.`);
      return;
    }

    const now = new Date().toISOString();
    const stages = attendance.stages.map((item) => item.id === stage.id ? { ...item, status: "CONCLUIDO" as StageStatus, completedAt: now, completedBy: attendance.reception.responsible || "Petrick" } : item);
    let status: AttendanceStatus;
    if (stage.id === "checkin") status = "AGUARDANDO_CHECKUP";
    else if (stage.id === "checkup") status = "AGUARDANDO_QUALITY";
    else if (stage.id === "quality") status = "AGUARDANDO_CHECKOUT";
    else status = "CONCLUIDO";
    onChange({ ...attendance, stages, status, updatedAt: now });
    onExit();
  }

  function reopenStage() {
    if (!window.confirm(`Reabrir ${stage.label}?`)) return;
    const stages = attendance.stages.map((item, index) => {
      if (index === stageIndex) return { ...item, status: "EM_ANDAMENTO" as StageStatus, completedAt: undefined, completedBy: undefined };
      if (index > stageIndex) return { ...item, status: "NAO_INICIADO" as StageStatus, completedAt: undefined, completedBy: undefined };
      return item;
    });
    const status: AttendanceStatus = stage.id === "checkin" ? "CHECKIN" : stage.id === "checkup" ? "CHECKUP" : stage.id === "quality" ? "QUALITY" : "CHECKOUT";
    onChange({ ...attendance, stages, status });
  }


  return (
    <div className="check-page workshop-checklist">
      <article className="panel reception-board">
        <header className="row-head"><div><small>{store.name.toUpperCase()} · {attendance.code}</small><h3>Ficha do veículo</h3></div><button className="outline" onClick={onExit}>← Voltar aos atendimentos</button></header>
        <div className="reception">
          <Field label="Cliente"><input value={attendance.reception.customer} disabled={isLocked} onChange={(e) => setReception("customer", e.target.value)} placeholder="Nome do cliente" /></Field>
          <Field label="WhatsApp"><input value={attendance.reception.phone} disabled={isLocked} onChange={(e) => setReception("phone", e.target.value)} placeholder="(00) 00000-0000" /></Field>
          <Field label="Veículo"><input value={attendance.reception.vehicle} disabled={isLocked} onChange={(e) => setReception("vehicle", e.target.value)} placeholder="Modelo e versão" /></Field>
          <Field label="Placa"><input value={attendance.reception.plate} disabled={isLocked} maxLength={7} onChange={(e) => setReception("plate", e.target.value)} placeholder="ABC1D23" /></Field>
          <Field label="Quilometragem"><input value={attendance.reception.mileage} disabled={isLocked} onChange={(e) => setReception("mileage", e.target.value)} placeholder="0" /></Field>
          <Field label="Combustível"><select value={attendance.reception.fuel} disabled={isLocked} onChange={(e) => setReception("fuel", e.target.value)}><option>Reserva</option><option>1/4</option><option>1/2</option><option>3/4</option><option>Cheio</option></select></Field>
          <Field label="Responsável"><input value={attendance.reception.responsible} disabled={isLocked} onChange={(e) => setReception("responsible", e.target.value)} /></Field>
          {stage.id !== "checkin" && <Field label="Técnico"><input value={attendance.reception.technician} disabled={isLocked} onChange={(e) => setReception("technician", e.target.value)} /></Field>}
        </div>
        {normalizedPlate.length >= 7 && (
          <div className={plateMatch ? "plate-lookup found" : "plate-lookup not-found"}>
            <div>
              <strong>{plateMatch ? "Veículo já cadastrado" : "Placa sem histórico nesta loja"}</strong>
              <span>{plateMatch ? `${plateMatch.reception.vehicle || "Veículo"} · ${plateMatch.reception.customer || "Cliente não informado"} · último atendimento ${formatDate(plateMatch.updatedAt)}` : "Será criado um novo cadastro quando o atendimento for salvo no banco."}</span>
            </div>
            {plateMatch && !isLocked && <button type="button" className="outline small" onClick={applyPlateMatch}>Usar dados cadastrados</button>}
          </div>
        )}
      </article>

      <div className="stage-tabs workshop-tabs">
        {attendance.stages.map((item, index) => {
          const done = item.items.filter((checkItem) => checkItem.value !== "PENDENTE").length;
          const pct = item.items.length ? Math.round(done / item.items.length * 100) : 0;
          const enabled = item.status !== "NAO_INICIADO" || item.id === stage.id;
          return <button key={item.id} disabled={!enabled} className={`stage ${stage.id === item.id ? "active" : ""} ${item.status === "CONCLUIDO" ? "completed" : ""}`} onClick={() => enabled && onStageChange(item.id)}><b>{item.status === "CONCLUIDO" ? "✓" : index + 1}</b><div><strong>{item.label}</strong><small>{item.status === "CONCLUIDO" ? "Concluído" : item.status === "NAO_INICIADO" ? "Aguardando" : `${pct}% preenchido`}</small></div></button>;
        })}
      </div>

      <article className="panel stage-panel workshop-stage">
        <header className="stage-head workshop-stage-head">
          <div><small>ETAPA EM EXECUÇÃO</small><h2>{stage.label}</h2><p>{stage.description}</p>{stage.completedAt && <span className="completion-info">Concluído por {stage.completedBy} em {formatDate(stage.completedAt)}</span>}</div>
          <div className="stage-header-actions">{isLocked && <button className="reopen-button" onClick={reopenStage}>Reabrir etapa</button>}<label className={isLocked ? "photo-button disabled" : "photo-button"}>📷 Fotos gerais<input disabled={isLocked} type="file" accept="image/*" capture="environment" multiple onChange={addStagePhotos} /></label></div>
        </header>

        {photoMessage && <div className="message">{photoMessage}</div>}
        {stage.photos.length > 0 && <Gallery photos={stage.photos} remove={(id) => !isLocked && updateStage({ ...stage, photos: stage.photos.filter((photo) => photo.id !== id) })} />}

        {stage.id === "checkin" && <ChecklistProgressSummary stage={stage} />}

        {stage.id === "checkup" && (
          <TechnicalReportPanel
            type={attendance.checkupType}
            report={attendance.technicalReport}
            technician={attendance.reception.technician}
            locked={isLocked}
            onTypeChange={(checkupType) => patchAttendance({ checkupType })}
            onReportChange={(technicalReport) => patchAttendance({ technicalReport })}
          />
        )}

        <div className="groups workshop-groups">
          {visibleGroupEntries.map(([category, items]) => (
            <section className="group workshop-group" key={category}>
              <header>
                <div><h3>{category}</h3><span>{items.length} itens</span></div>
                {stage.id === "checkup" && items.some((item) => item.mode === "CONDITION") && !isLocked && (
                  <div className="bulk-actions"><small>Marcar módulo:</small><button onClick={() => fillGroup(items, "BOM")}>Tudo bom</button><button onClick={() => fillGroup(items, "REGULAR")}>Tudo regular</button><button onClick={() => fillGroup(items, "RUIM")}>Tudo ruim</button></div>
                )}
              </header>
              {items.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  locked={isLocked}
                  noteOpen={openNotes.includes(item.id)}
                  onOpenNote={() => setOpenNotes([...openNotes, item.id])}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  onAddPhotos={(event) => addItemPhotos(item, event)}
                />
              ))}
            </section>
          ))}
        </div>


        <footer className="stage-footer workshop-footer">
          {isLocked ? (
            <><div><strong>{stage.label} concluído</strong><span>A etapa está protegida no histórico.</span></div><button className="outline" onClick={onExit}>Voltar para atendimentos</button></>
          ) : (
            <><div><strong>Finalizar {stage.label}</strong><span>Ao concluir, o atendimento volta para a tela principal.</span></div><button className="primary" onClick={completeStage}>Concluir e salvar módulo</button></>
          )}
        </footer>
      </article>

      {attendance.status === "CONCLUIDO" && (
        <section className="panel final-actions professional-final-actions">
          <div><small>FLUXO OPERACIONAL CONCLUÍDO</small><h2>Check-in, Check-up, Qualidade e Check-out finalizados</h2><p>{linkedOrder && linkedOrder.status !== "FECHADA" ? `A ${linkedOrder.code} ainda precisa ser encerrada para finalizar o processo.` : linkedOrder ? `${linkedOrder.code} encerrada. O atendimento está finalizado.` : "O atendimento foi concluído sem O.S. vinculada."}</p></div>
          <div className="final-action-stack"><ReportActions store={store} attendance={attendance} />{linkedOrder && linkedOrder.status !== "FECHADA" && <button className="close-order-button" onClick={onCloseOrder}>Encerrar {linkedOrder.code}</button>}</div>
        </section>
      )}

      {attendance.status !== "CHECKIN" && attendance.status !== "CONCLUIDO" && (
        <section className="panel followup-actions"><div><small>PRÓXIMAS AÇÕES</small><h3>Continue a gestão do atendimento</h3></div><div><button className="outline" onClick={() => onOpenModule("orders")}>Abrir O.S.</button><button className="primary" onClick={() => onOpenModule("quotes")}>Abrir orçamento</button></div></section>
      )}
    </div>
  );
}

function ChecklistProgressSummary({ stage }: { stage: Stage }) {
  const answered = stage.items.filter((item) => item.value !== "PENDENTE").length;
  const progress = stage.items.length ? Math.round((answered / stage.items.length) * 100) : 0;
  return (
    <section className="checklist-progress-strip">
      <div>
        <small>CHECK-IN COMPLETO EM LISTA</small>
        <strong>{answered} de {stage.items.length} itens respondidos</strong>
        <span>Preencha os módulos na ordem apresentada. Fotos e observações permanecem vinculadas a cada item.</span>
      </div>
      <div className="checklist-progress-value"><b>{progress}%</b><i><em style={{ width: `${progress}%` }} /></i></div>
    </section>
  );
}

function TechnicalReportPanel({
  type,
  report,
  technician,
  locked,
  onTypeChange,
  onReportChange,
}: {
  type: CheckupType;
  report: TechnicalReport;
  technician: string;
  locked: boolean;
  onTypeChange: (type: CheckupType) => void;
  onReportChange: (report: TechnicalReport) => void;
}) {
  const patch = (field: keyof TechnicalReport, value: string) => onReportChange({ ...report, [field]: value });
  return (
    <section className="technical-report-panel">
      <header>
        <div><small>LAUDO TÉCNICO</small><h3>Registro profissional do Check-up</h3><p>O laudo acompanha a inspeção e será preservado no histórico do atendimento.</p></div>
        <div className="checkup-type-selector">
          <button type="button" disabled={locked} className={type === "REVISAO" ? "active" : ""} onClick={() => onTypeChange("REVISAO")}>Revisão</button>
          <button type="button" disabled={locked} className={type === "DIAGNOSTICO" ? "active" : ""} onClick={() => onTypeChange("DIAGNOSTICO")}>Diagnóstico</button>
        </div>
      </header>
      <div className="technical-report-grid">
        <label><span>Relato do cliente</span><textarea disabled={locked} value={report.complaint} onChange={(e) => patch("complaint", e.target.value)} placeholder="Sintoma, solicitação ou motivo da entrada..." /></label>
        <label><span>Diagnóstico técnico *</span><textarea disabled={locked} value={report.diagnosis} onChange={(e) => patch("diagnosis", e.target.value)} placeholder="Falhas, causas prováveis e componentes afetados..." /></label>
        <label><span>Testes e medições</span><textarea disabled={locked} value={report.tests} onChange={(e) => patch("tests", e.target.value)} placeholder="Scanner, pressão, tensão, folgas, espessuras, teste de rodagem..." /></label>
        <label><span>Recomendação</span><textarea disabled={locked} value={report.recommendation} onChange={(e) => patch("recommendation", e.target.value)} placeholder="Serviços recomendados, prioridade e riscos..." /></label>
        <label className="technical-conclusion"><span>Conclusão do laudo *</span><textarea disabled={locked} value={report.conclusion} onChange={(e) => patch("conclusion", e.target.value)} placeholder="Conclusão objetiva que poderá ser apresentada ao cliente..." /></label>
      </div>
      <footer><span>Técnico responsável</span><strong>{technician || "Defina o técnico na ficha do veículo"}</strong></footer>
    </section>
  );
}

function itemValueSymbol(value: ItemValue) {
  if (value === "BOM" || value === "SIM") return "✓";
  if (value === "REGULAR" || value === "AVARIADO") return "!";
  if (value === "RUIM" || value === "NAO") return "×";
  if (value === "NAO_SE_APLICA") return "—";
  if (value === "EXPRESSA") return "⚡";
  if (value === "OUTRO") return "+";
  return "·";
}

function optionsForMode(mode: ResponseMode) {
  if (mode === "PRESENCE") return PRESENCE_OPTIONS;
  if (mode === "YES_NO") return YES_NO_OPTIONS;
  if (mode === "WASH") return WASH_OPTIONS;
  return CONDITION_OPTIONS;
}

function ChecklistItemRow({
  item,
  locked,
  noteOpen,
  onOpenNote,
  onUpdate,
  onAddPhotos,
}: {
  item: CheckItem;
  locked: boolean;
  noteOpen: boolean;
  onOpenNote: () => void;
  onUpdate: (patch: Partial<CheckItem>) => void;
  onAddPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const options = optionsForMode(item.mode);
  const showNote = noteOpen || Boolean(item.note) || item.key === "wash-request" || item.key === "belongings" || item.key.startsWith("road-test") || ["REGULAR", "RUIM", "AVARIADO", "NAO", "OUTRO"].includes(item.value);
  return (
    <div id={`check-${item.key}`} className={`check-item workshop-item value-${item.value.toLowerCase()}`}>
      <div className="item-row">
        <div className="item-title"><strong>{item.label}</strong>{item.photoRecommended && <em>Foto recomendada</em>}<span>{item.photos.length} foto(s)</span></div>
        <div className="item-controls">
          <div className={`status-options options-${options.length}`}>
            {options.map((option) => <button disabled={locked} type="button" key={option.value} className={item.value === option.value ? `status-button active value-${option.value.toLowerCase()}` : `status-button value-${option.value.toLowerCase()}`} onClick={() => onUpdate({ value: option.value })}><b>{option.symbol}</b><span>{option.label}</span></button>)}
          </div>
          <label className={locked ? "photo-plus disabled" : "photo-plus"} title="Adicionar fotos"><span>+</span><input disabled={locked} type="file" accept="image/*" capture="environment" multiple onChange={onAddPhotos} /></label>
        </div>
      </div>
      <div className="item-meta"><span>{itemValueLabel(item.value)}</span>{!showNote && !locked && <button type="button" onClick={onOpenNote}>+ Observação</button>}</div>
      {showNote && <textarea disabled={locked} rows={2} value={item.note} onChange={(e) => onUpdate({ note: e.target.value })} placeholder="Observação opcional, avaria, medição ou orientação..." />}
      {item.photos.length > 0 && <Gallery compact photos={item.photos} remove={(id) => !locked && onUpdate({ photos: item.photos.filter((photo) => photo.id !== id) })} />}
    </div>
  );
}

function ReportActions({ store, attendance }: { store: Store; attendance: Attendance }) {
  function saveReport() {
    const blob = new Blob([createReportHtml(store, attendance, "FULL")], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `checklist-${attendance.reception.plate || attendance.code}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function printReport(mode: ReportMode) {
    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) return window.alert("O navegador bloqueou a janela de impressão.");
    popup.document.write(createReportHtml(store, attendance, mode));
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 300);
  }
  async function shareReport() {
    const text = buildShareText(store, attendance);
    if (navigator.share) {
      try { await navigator.share({ title: "Checklist do veículo", text }); return; } catch { /* cancelado */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  return <div className="report-buttons"><button onClick={saveReport}>Salvar relatório</button><button onClick={() => printReport("SUMMARY")}>Imprimir resumo</button><button onClick={() => printReport("FULL")}>Imprimir completo</button><button className="primary" onClick={shareReport}>Enviar ao cliente</button></div>;
}
function StoreSwitcherModal({ stores, currentStoreId, onClose, onSelect }: { stores: Store[]; currentStoreId: string; onClose: () => void; onSelect: (storeId: string) => void }) {
  return <div className="modal-backdrop"><section className="compact-modal store-switcher-modal">
    <header><div><small>EMPRESA E LOJA</small><h2>Onde deseja trabalhar?</h2><p>Os dados e configurações mudam conforme a loja selecionada.</p></div><button onClick={onClose}>×</button></header>
    <div className="store-options">{stores.map((store) => <button key={store.id} className={store.id === currentStoreId ? "store-option active" : "store-option"} onClick={() => onSelect(store.id)}><span><PremiumIcon name="store" size={20} /></span><div><strong>{store.name}</strong><small>{store.id === currentStoreId ? "Loja atual" : "Acessar esta loja"}</small></div>{store.id === currentStoreId ? <b>Atual</b> : <PremiumIcon name="chevron" size={16} />}</button>)}</div>
  </section></div>;
}

function UserProfileModal({ profile, onClose, onSave }: { profile: UserProfile; onClose: () => void; onSave: (profile: UserProfile) => void }) {
  const [draft, setDraft] = useState<UserProfile>({ ...profile });
  const [processing, setProcessing] = useState(false);
  async function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try { const photo = await preparePhoto(file); setDraft({ ...draft, photo: photo.dataUrl }); } finally { setProcessing(false); event.target.value = ""; }
  }
  return <div className="modal-backdrop"><section className="compact-modal profile-modal">
    <header><div><small>MEU PERFIL</small><h2>Informações pessoais</h2><p>Personalize como seu nome e contato aparecem no Gerivo.</p></div><button onClick={onClose}>×</button></header>
    <div className="profile-content"><div className="profile-photo-editor"><div>{draft.photo ? <img src={draft.photo} alt="Foto do perfil" /> : <PremiumIcon name="user" size={34} />}</div><label><PremiumIcon name="camera" size={16} /> {processing ? "Processando..." : "Alterar foto"}<input type="file" accept="image/*" onChange={changePhoto} /></label>{draft.photo && <button onClick={() => setDraft({ ...draft, photo: "" })}>Remover foto</button>}</div><div className="profile-fields"><Field label="Como deseja ser chamado"><input value={draft.preferredName} onChange={(e) => setDraft({ ...draft, preferredName: e.target.value })} placeholder="Seu nome" /></Field><Field label="Telefone"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(00) 00000-0000" /></Field><Field label="E-mail"><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="seuemail@empresa.com" /></Field></div></div>
    <footer><button className="outline" onClick={onClose}>Cancelar</button><button className="primary" onClick={() => onSave(draft)}>Salvar perfil</button></footer>
  </section></div>;
}

function CompanySettingsModal({
  companySettings,
  companyIdentity,
  checklistSettings,
  onClose,
  onSave,
  initialTab,
}: {
  companySettings: CompanySettings;
  companyIdentity: CompanyIdentity;
  checklistSettings: ChecklistSettings;
  onClose: () => void;
  onSave: (companySettings: CompanySettings, checklistSettings: ChecklistSettings, companyIdentity: CompanyIdentity) => void;
  initialTab: SettingsTab;
}) {
  const [companyDraft, setCompanyDraft] = useState<CompanySettings>(() => JSON.parse(JSON.stringify(companySettings)) as CompanySettings);
  const [identityDraft, setIdentityDraft] = useState<CompanyIdentity>(() => ({ ...companyIdentity }));
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState<ChecklistSettings>(() => JSON.parse(JSON.stringify(checklistSettings)) as ChecklistSettings);
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  function setProfile(profile: CompanyProfile) {
    if (profile === "FULL") {
      setCompanyDraft({ ...companyDraft, profile, modules: { CATALOG: true, CHECKLIST: true, ORDERS: true, QUOTES: true } });
      return;
    }
    if (profile === "QUOTE_ONLY") {
      setCompanyDraft({ ...companyDraft, profile, modules: { CATALOG: true, CHECKLIST: false, ORDERS: false, QUOTES: true } });
      return;
    }
    setCompanyDraft({ ...companyDraft, profile });
  }

  function toggleModule(module: CompanyModule) {
    setCompanyDraft({
      ...companyDraft,
      profile: "CUSTOM",
      modules: { ...companyDraft.modules, [module]: !companyDraft.modules[module] },
    });
  }

  async function uploadCompanyLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return window.alert("Selecione um arquivo de imagem.");
    if (file.size > 3 * 1024 * 1024) return window.alert("A logo deve ter no máximo 3 MB.");
    setLogoProcessing(true);
    try {
      const source = await fileToDataUrl(file);
      const image = await loadImage(source);
      const max = 900;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Falha ao preparar a logo.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setIdentityDraft({ ...identityDraft, logo: canvas.toDataURL("image/png") });
    } catch {
      window.alert("Não foi possível processar a logo.");
    } finally {
      setLogoProcessing(false);
      event.target.value = "";
    }
  }

  function toggleItem(stageId: StageId, key: string) {
    const current = checklistDraft.enabledItemKeys[stageId];
    const enabledItemKeys = { ...checklistDraft.enabledItemKeys, [stageId]: current.includes(key) ? current.filter((item) => item !== key) : [...current, key] };
    setChecklistDraft({ ...checklistDraft, enabledItemKeys });
  }

  function toggleGroup(stageId: StageId, group: TemplateGroup) {
    const keys = group.items.map((item) => item.key);
    const current = checklistDraft.enabledItemKeys[stageId];
    const allEnabled = keys.every((key) => current.includes(key));
    const next = allEnabled ? current.filter((key) => !keys.includes(key)) : Array.from(new Set([...current, ...keys]));
    setChecklistDraft({ ...checklistDraft, enabledItemKeys: { ...checklistDraft.enabledItemKeys, [stageId]: next } });
  }

  return <div className="modal-backdrop"><section className="settings-modal company-settings-modal">
    <header><div><small>CONFIGURAÇÃO POR EMPRESA</small><h2>{tab === "IDENTITY" ? "Identidade visual" : tab === "CHECKLIST" ? "Modelos de checklist" : tab === "QUOTES" ? "Configuração de orçamentos" : "Módulos e funcionamento"}</h2><p>{tab === "IDENTITY" ? "Personalize a apresentação da empresa sem esconder a tecnologia Gerivo." : tab === "CHECKLIST" ? "Defina os itens e etapas aplicáveis ao fluxo da empresa." : "Defina o que esta empresa utilizará dentro do Gerivo."}</p></div><button onClick={onClose}>×</button></header>
    <nav className="settings-tabs"><button className={tab === "IDENTITY" ? "active" : ""} onClick={() => setTab("IDENTITY")}>Identidade</button><button className={tab === "MODULES" ? "active" : ""} onClick={() => setTab("MODULES")}>Módulos</button><button disabled={!companyDraft.modules.CHECKLIST} className={tab === "CHECKLIST" ? "active" : ""} onClick={() => setTab("CHECKLIST")}>Checklist</button><button disabled={!companyDraft.modules.QUOTES} className={tab === "QUOTES" ? "active" : ""} onClick={() => setTab("QUOTES")}>Orçamentos</button></nav>

    {tab === "IDENTITY" && <div className="company-settings-content identity-settings-content">
      <section className="identity-editor-grid">
        <div className="identity-preview" style={{ background: identityDraft.sidebarColor, ...sidebarThemeVariables(identityDraft.sidebarColor) } as any}>
          <div>{identityDraft.logo ? <img src={identityDraft.logo} alt={identityDraft.displayName} /> : <img src={sidebarIsLight(identityDraft.sidebarColor) ? "/gerivo-logo.png" : "/gerivo-logo-light.png"} alt="Gerivo" />}</div>
          <strong>{identityDraft.displayName || "Nome da empresa"}</strong>
          {identityDraft.logo && <small><img src={sidebarIsLight(identityDraft.sidebarColor) ? "/gerivo-mark.png" : "/gerivo-mark-light.png"} alt="" /> Tecnologia Gerivo</small>}
        </div>
        <div className="identity-controls">
          <Field label="Nome exibido no sistema"><input value={identityDraft.displayName} onChange={(event) => setIdentityDraft({ ...identityDraft, displayName: event.target.value })} placeholder="Nome da oficina ou empresa" /></Field>
          <label className="logo-upload-control"><span>Logo da empresa</span><div>{identityDraft.logo && <img src={identityDraft.logo} alt="Prévia da logo" />}<label className="outline">{logoProcessing ? "Processando..." : identityDraft.logo ? "Trocar logo" : "Escolher logo"}<input type="file" accept="image/*" onChange={uploadCompanyLogo} disabled={logoProcessing} /></label>{identityDraft.logo && <button className="danger" type="button" onClick={() => setIdentityDraft({ ...identityDraft, logo: "" })}>Remover</button>}</div><small>PNG, JPG ou WEBP. A logo fica separada por empresa/loja.</small></label>
          <div className="sidebar-color-control"><span>Cor da barra lateral</span><div><input type="color" value={identityDraft.sidebarColor} onChange={(event) => setIdentityDraft({ ...identityDraft, sidebarColor: event.target.value })} /><input value={identityDraft.sidebarColor} maxLength={7} onChange={(event) => setIdentityDraft({ ...identityDraft, sidebarColor: event.target.value })} /></div><div className="color-presets">{["#0d1b28", "#0d3f46", "#176b5a", "#152a4a", "#3b224f", "#4a1f27"].map((color) => <button key={color} type="button" style={{ background: color }} aria-label={`Usar cor ${color}`} onClick={() => setIdentityDraft({ ...identityDraft, sidebarColor: color })} />)}</div></div>
          <p className="identity-note">Quando a empresa usa marca própria, o Gerivo permanece identificado no rodapé como tecnologia da plataforma.</p>
        </div>
      </section>
    </div>}

    {tab === "MODULES" && <div className="company-settings-content">
      <div className="profile-selector">
        <button className={companyDraft.profile === "FULL" ? "active" : ""} onClick={() => setProfile("FULL")}><strong>Sistema completo</strong><span>Catálogo, checklist, O.S. e orçamentos.</span></button>
        <button className={companyDraft.profile === "QUOTE_ONLY" ? "active" : ""} onClick={() => setProfile("QUOTE_ONLY")}><strong>Somente orçamentos</strong><span>Catálogo e criação de orçamento sem fluxo de oficina.</span></button>
        <button className={companyDraft.profile === "CUSTOM" ? "active" : ""} onClick={() => setProfile("CUSTOM")}><strong>Personalizado</strong><span>Escolha os módulos individualmente.</span></button>
      </div>
      <div className="module-selector">
        {(Object.keys(MODULE_INFO) as CompanyModule[]).map((module) => <label key={module} className={companyDraft.modules[module] ? "module-card enabled" : "module-card"}>
          <input type="checkbox" checked={companyDraft.modules[module]} onChange={() => toggleModule(module)} />
          <div><strong>{MODULE_INFO[module].label}</strong><span>{MODULE_INFO[module].description}</span></div>
        </label>)}
      </div>
    </div>}

    {tab === "QUOTES" && <div className="company-settings-content">
      <div className="quote-mode-settings"><small>PADRÃO DE ENVIO</small><h3>Como a empresa apresentará os orçamentos?</h3><div>
        <button className={companyDraft.quoteDeliveryMode === "LINK" ? "active" : ""} onClick={() => setCompanyDraft({ ...companyDraft, quoteDeliveryMode: "LINK" })}><strong>Link para aprovação</strong><span>Cliente seleciona os itens e devolve a decisão.</span></button>
        <button className={companyDraft.quoteDeliveryMode === "MESSAGE" ? "active" : ""} onClick={() => setCompanyDraft({ ...companyDraft, quoteDeliveryMode: "MESSAGE" })}><strong>Mensagem comercial</strong><span>Gera texto pronto para WhatsApp.</span></button>
        <button className={companyDraft.quoteDeliveryMode === "BOTH" ? "active" : ""} onClick={() => setCompanyDraft({ ...companyDraft, quoteDeliveryMode: "BOTH" })}><strong>Ambos</strong><span>Responsável escolhe o formato em cada orçamento.</span></button>
      </div></div>
      <div className="quote-template-settings">
        <small>MODELO PADRÃO DA MENSAGEM</small>
        <h3>Qual abordagem o Gerivo deve sugerir primeiro?</h3>
        <div>
          {(["PROFISSIONAL", "DIRETA", "CONSULTIVA", "PREVENTIVA"] as QuoteMessageTemplate[]).map((template) => (
            <button key={template} className={companyDraft.quoteMessageTemplate === template ? "active" : ""} onClick={() => setCompanyDraft({ ...companyDraft, quoteMessageTemplate: template })}>
              <strong>{quoteMessageTemplateLabel(template)}</strong>
              <span>{template === "PROFISSIONAL" ? "Apresentação completa e equilibrada." : template === "DIRETA" ? "Texto curto para retorno rápido." : template === "CONSULTIVA" ? "Explica a recomendação e convida para conversar." : "Reforça segurança e manutenção preventiva."}</span>
            </button>
          ))}
        </div>
      </div>
    </div>}

    {tab === "CHECKLIST" && <div className="checklist-settings-content">
      <div className="settings-toolbar"><Field label="Nome do modelo"><input value={checklistDraft.name} onChange={(e) => setChecklistDraft({ ...checklistDraft, name: e.target.value })} /></Field><div><button onClick={() => setChecklistDraft({ name: "Checklist oficina completo", enabledItemKeys: allTemplateKeys() })}>Modelo completo</button><button onClick={() => setChecklistDraft({ name: "Checklist oficina essencial", enabledItemKeys: essentialTemplateKeys() })}>Modelo essencial</button></div></div>
      <div className="settings-stages">{CHECKLIST_TEMPLATE.map((stage) => <section key={stage.id}><h3>{stage.label}</h3>{stage.groups.map((group) => { const groupKeys = group.items.map((item) => item.key); const checked = groupKeys.every((key) => checklistDraft.enabledItemKeys[stage.id].includes(key)); return <details key={group.key} open><summary><label><input type="checkbox" checked={checked} onChange={() => toggleGroup(stage.id, group)} /> {group.label}</label><span>{group.items.filter((item) => checklistDraft.enabledItemKeys[stage.id].includes(item.key)).length}/{group.items.length}</span></summary><div>{group.items.map((item) => <label key={item.key}><input type="checkbox" checked={checklistDraft.enabledItemKeys[stage.id].includes(item.key)} onChange={() => toggleItem(stage.id, item.key)} /> {item.label}</label>)}</div></details>})}</section>)}</div>
    </div>}

    <footer><button className="outline" onClick={onClose}>Cancelar</button><button className="primary" onClick={() => onSave(companyDraft, checklistDraft, { ...identityDraft, displayName: identityDraft.displayName.trim() || companyIdentity.displayName, sidebarColor: /^#[0-9a-f]{6}$/i.test(identityDraft.sidebarColor) ? identityDraft.sidebarColor : companyIdentity.sidebarColor })}>Salvar configuração</button></footer>
  </section></div>;
}
function FilterToolbar({
  search,
  onSearch,
  filter,
  onFilter,
  options,
  resultCount,
}: {
  search: string;
  onSearch: (value: string) => void;
  filter: string;
  onFilter: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  resultCount: number;
}) {
  return (
    <div className="filter-toolbar">
      <label className="filter-search"><span>Buscar</span><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Código, cliente, veículo ou placa" /></label>
      <label className="filter-select"><span>Status</span><select value={filter} onChange={(event) => onFilter(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <span className="filter-result-count">{resultCount} registro(s)</span>
    </div>
  );
}

function ChecklistIndex({
  attendances,
  onCreate,
  onOpen,
  onStartStage,
  onOpenModule,
  onDelete,
  companySettings,
}: {
  attendances: Attendance[];
  onCreate: () => void;
  onOpen: (attendance: Attendance, stageId?: StageId) => void;
  onStartStage: (attendance: Attendance, stageId: StageId) => void;
  onOpenModule: (attendance: Attendance, target: "orders" | "quotes") => void;
  onDelete: (attendance: Attendance) => void;
  companySettings: CompanySettings;
}) {
  const [filter, setFilter] = useState<ChecklistListStatus>("TODOS");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = attendances.filter((attendance) => {
    const statusMatches = filter === "TODOS" || checklistListStatus(attendance) === filter;
    const text = `${attendance.code} ${attendance.reception.customer} ${attendance.reception.vehicle} ${attendance.reception.plate}`.toLowerCase();
    return statusMatches && (!normalizedSearch || text.includes(normalizedSearch));
  });

  return (
    <section className="module-list-page">
      <div className="module-intro"><div><small>CONTROLE DE CHECKLISTS</small><h2>Recepções e inspeções</h2><p>Consulte cada atendimento sem abrir automaticamente o último checklist utilizado.</p></div><button className="primary" onClick={onCreate}>+ Nova recepção</button></div>
      <FilterToolbar
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilter={(value) => setFilter(value as ChecklistListStatus)}
        resultCount={filtered.length}
        options={[
          { value: "TODOS", label: "Todos" },
          { value: "ABERTO", label: "Aberto" },
          { value: "EM_ANDAMENTO", label: "Em andamento" },
          { value: "INCOMPLETO", label: "Incompleto" },
          { value: "CONCLUIDO", label: "Concluído" },
        ]}
      />
      <section className="panel module-record-panel">
        <header><div><small>CHECKLISTS</small><h3>Lista de atendimentos</h3></div><span className="count">{filtered.length} encontrados</span></header>
        {filtered.length === 0 ? <div className="module-empty">Nenhum checklist encontrado com os filtros informados.</div> : <div className="attendance-list">{filtered.map((attendance) => <div key={attendance.id} className="filtered-attendance-wrap"><span className={`list-status-badge status-${checklistListStatus(attendance).toLowerCase()}`}>{checklistListStatusLabel(checklistListStatus(attendance))}</span><AttendanceCard attendance={attendance} onOpen={onOpen} onStartStage={onStartStage} onOpenModule={onOpenModule} onDelete={onDelete} companySettings={companySettings} /></div>)}</div>}
      </section>
    </section>
  );
}

function OrdersPage({
  orders,
  attendances,
  onChange,
  onCreate,
  onOpen,
}: {
  orders: ServiceOrder[];
  attendances: Attendance[];
  onChange: (orders: ServiceOrder[]) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<OrderListStatus>("TODOS");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = orders.filter((order) => {
    const statusMatches = filter === "TODOS" || order.status === filter;
    const text = `${order.code} ${order.customer} ${order.vehicle} ${order.plate}`.toLowerCase();
    return statusMatches && (!normalizedSearch || text.includes(normalizedSearch));
  });

  function updateStatus(id: string, status: ServiceOrderStatus) {
    onChange(orders.map((order) => order.id === id ? { ...order, status, updatedAt: new Date().toISOString() } : order));
  }

  return (
    <section className="module-list-page">
      <div className="module-intro"><div><small>EXECUÇÃO E CONTROLE</small><h2>Gestão de ordens de serviço</h2><p>A abertura pelo menu não vincula automaticamente o checklist selecionado. O vínculo só acontece por uma ação explícita no atendimento.</p></div><button className="primary" onClick={onCreate}>+ Nova O.S.</button></div>
      <FilterToolbar
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilter={(value) => setFilter(value as OrderListStatus)}
        resultCount={filtered.length}
        options={[
          { value: "TODOS", label: "Todas" },
          { value: "ABERTA", label: "Aberta" },
          { value: "FECHADA", label: "Fechada" },
          { value: "PENDENTE", label: "Pendente" },
          { value: "INCOMPLETA", label: "Incompleta" },
        ]}
      />
      <section className="panel module-record-panel">
        <header><div><small>ORDENS DE SERVIÇO</small><h3>Lista de O.S.</h3></div><span className="count">{filtered.length} encontradas</span></header>
        {filtered.length === 0 ? <div className="module-empty">Nenhuma ordem de serviço encontrada. Crie uma O.S. nova ou abra uma a partir de um atendimento.</div> : <div className="document-table">{filtered.map((order) => { const attendance = attendances.find((item) => item.id === order.attendanceId); return <article key={order.id} className="document-row"><div className="document-code"><strong>{order.code}</strong><small>{formatDate(order.createdAt)}</small></div><div className="document-main"><strong>{order.vehicle || order.customer || "Cadastro incompleto"}</strong><small>{order.plate || "Sem placa"}{attendance ? ` · ${attendance.code}` : " · Sem checklist vinculado"}</small></div><div className="document-responsible"><span>Responsável</span><strong>{order.responsible || "Não informado"}</strong></div><label className="inline-status-select"><span>Status</span><select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value as ServiceOrderStatus)}><option value="ABERTA">Aberta</option><option value="FECHADA">Fechada</option><option value="PENDENTE">Pendente</option><option value="INCOMPLETA">Incompleta</option></select></label><strong className="document-total">{money(order.total)}</strong><button className="outline small" onClick={() => onOpen(order.id)}>Abrir</button></article>; })}</div>}
      </section>
    </section>
  );
}

function QuotesPage({
  quotes,
  attendances,
  deliveryMode,
  onChange,
  onCreate,
  onOpen,
}: {
  quotes: Quote[];
  attendances: Attendance[];
  deliveryMode: QuoteDeliveryMode;
  onChange: (quotes: Quote[]) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<QuoteListStatus>("TODOS");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = quotes.filter((quote) => {
    const statusMatches = filter === "TODOS" || quote.status === filter;
    const text = `${quote.code} ${quote.customer} ${quote.vehicle} ${quote.plate}`.toLowerCase();
    return statusMatches && (!normalizedSearch || text.includes(normalizedSearch));
  });

  function updateStatus(id: string, status: QuoteStatus) {
    onChange(quotes.map((quote) => quote.id === id ? { ...quote, status, updatedAt: new Date().toISOString() } : quote));
  }

  return (
    <section className="module-list-page">
      <div className="module-intro"><div><small>ORÇAMENTAÇÃO</small><h2>Gestão de orçamentos</h2><p>Padrão de envio da empresa: <strong>{quoteDeliveryLabel(deliveryMode)}</strong>. A abertura pelo menu sempre inicia na lista, sem importar automaticamente um checklist.</p></div><button className="primary" onClick={onCreate}>+ Novo orçamento</button></div>
      <FilterToolbar
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilter={(value) => setFilter(value as QuoteListStatus)}
        resultCount={filtered.length}
        options={[
          { value: "TODOS", label: "Todos" },
          { value: "ABERTO", label: "Aberto" },
          { value: "FECHADO", label: "Fechado" },
          { value: "AGUARDANDO_APROVACAO", label: "Aguardando aprovação" },
          { value: "AGUARDANDO_COTACAO", label: "Aguardando cotação" },
          { value: "AGUARDANDO_DIGITACAO", label: "Aguardando digitação" },
          { value: "INCOMPLETO", label: "Incompleto" },
          { value: "AGUARDANDO_RETORNO_CLIENTE", label: "Aguardando retorno do cliente" },
          { value: "AGUARDANDO_DESCONTO", label: "Aguardando desconto" },
        ]}
      />
      <section className="panel module-record-panel">
        <header><div><small>ORÇAMENTOS</small><h3>Lista de orçamentos</h3></div><span className="count">{filtered.length} encontrados</span></header>
        {filtered.length === 0 ? <div className="module-empty">Nenhum orçamento encontrado. Crie um orçamento novo ou abra um a partir de um atendimento.</div> : <div className="document-table">{filtered.map((quote) => { const attendance = attendances.find((item) => item.id === quote.attendanceId); return <article key={quote.id} className="document-row quote-document-row"><div className="document-code"><strong>{quote.code}</strong><small>{formatDate(quote.createdAt)}</small></div><div className="document-main"><strong>{quote.vehicle || quote.customer || "Cadastro incompleto"}</strong><small>{quote.plate || "Sem placa"}{attendance ? ` · ${attendance.code}` : " · Sem checklist vinculado"}</small></div><div className="document-responsible"><span>Responsável</span><strong>{quote.responsible || "Não informado"}</strong></div><label className="inline-status-select quote-status-select"><span>Status</span><select value={quote.status} onChange={(event) => updateStatus(quote.id, event.target.value as QuoteStatus)}><option value="ABERTO">Aberto</option><option value="FECHADO">Fechado</option><option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option><option value="AGUARDANDO_COTACAO">Aguardando cotação</option><option value="AGUARDANDO_DIGITACAO">Aguardando digitação</option><option value="INCOMPLETO">Incompleto</option><option value="AGUARDANDO_RETORNO_CLIENTE">Aguardando retorno do cliente</option><option value="AGUARDANDO_DESCONTO">Aguardando desconto</option></select></label><strong className="document-total">{money(quote.total)}</strong><button className="outline small" onClick={() => onOpen(quote.id)}>Abrir</button></article>; })}</div>}
      </section>
    </section>
  );
}


function DocumentItemsEditor({
  items,
  catalog,
  onChange,
}: {
  items: DocumentLine[];
  catalog: CatalogItem[];
  onChange: (items: DocumentLine[]) => void;
}) {
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const activeCatalog = catalog.filter((item) => item.active);

  function addCatalogItem() {
    const catalogItem = activeCatalog.find((item) => item.id === selectedCatalogId);
    if (!catalogItem) return;
    onChange([
      ...items,
      {
        id: uid(),
        catalogItemId: catalogItem.id,
        name: catalogItem.name,
        description: catalogItem.category,
        kind: catalogItem.kind,
        quantity: 1,
        unitPrice: catalogItem.price,
      },
    ]);
    setSelectedCatalogId("");
  }

  function addCustomItem() {
    onChange([...items, { id: uid(), catalogItemId: null, name: "", description: "", kind: "SERVICO", quantity: 1, unitPrice: 0 }]);
  }

  function updateItem(id: string, patch: Partial<DocumentLine>) {
    onChange(items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  return (
    <section className="document-items-panel">
      <header><div><small>ITENS DO DOCUMENTO</small><h3>Serviços, peças e produtos</h3></div><div className="document-item-add"><select value={selectedCatalogId} onChange={(event) => setSelectedCatalogId(event.target.value)}><option value="">Selecionar do catálogo</option>{activeCatalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.price)}</option>)}</select><button className="outline" type="button" disabled={!selectedCatalogId} onClick={addCatalogItem}>Adicionar</button><button className="primary" type="button" onClick={addCustomItem}>+ Item livre</button></div></header>
      <div className="document-items-table">
        <div className="document-items-head"><span>Tipo</span><span>Descrição</span><span>Qtd.</span><span>Valor unit.</span><span>Total</span><span /></div>
        {items.length === 0 ? <div className="document-items-empty">Nenhum item adicionado. Use o catálogo ou crie um item livre.</div> : items.map((item) => <div key={item.id} className="document-item-row"><select value={item.kind} onChange={(event) => updateItem(item.id, { kind: event.target.value as CatalogKind })}><option value="SERVICO">Serviço</option><option value="PECA">Peça</option><option value="PRODUTO">Produto</option></select><div className="document-item-description"><input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Descrição do item" /><input value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} placeholder="Detalhe, categoria ou observação" /></div><input type="number" min="0" step="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(0, Number(event.target.value) || 0) })} /><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })} /><strong>{money(lineTotal(item))}</strong><button className="document-remove-item" type="button" onClick={() => onChange(items.filter((current) => current.id !== item.id))}><PremiumIcon name="trash" size={16} /></button></div>)}
      </div>
    </section>
  );
}

function ServiceOrderEditor({
  order,
  catalog,
  companyName,
  onChange,
  onBack,
  onSaved,
}: {
  order: ServiceOrder;
  catalog: CatalogItem[];
  companyName: string;
  onChange: (order: ServiceOrder) => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  function update(patch: Partial<ServiceOrder>) {
    const items = patch.items ?? order.items;
    onChange({ ...order, ...patch, items, total: itemsSubtotal(items), updatedAt: new Date().toISOString() });
  }

  return <section className="document-editor-page">
    <header className="document-editor-header"><div><small>ORDEM DE SERVIÇO · {companyName}</small><h2>{order.code}</h2><p>{order.customer} · {order.vehicle} · {order.plate}</p></div><div><button className="outline" onClick={onBack}>← Voltar à lista</button><button className="primary" onClick={onSaved}>Salvar O.S.</button></div></header>
    <section className="document-editor-grid">
      <article className="document-editor-card"><h3>Controle da O.S.</h3><div className="document-form-grid"><Field label="Status"><select value={order.status} onChange={(event) => update({ status: event.target.value as ServiceOrderStatus })}><option value="ABERTA">Aberta</option><option value="PENDENTE">Pendente</option><option value="INCOMPLETA">Incompleta</option><option value="FECHADA">Fechada</option></select></Field><Field label="Responsável"><input value={order.responsible} onChange={(event) => update({ responsible: event.target.value })} /></Field><Field label="Técnico / executor"><input value={order.technician} onChange={(event) => update({ technician: event.target.value })} placeholder="Nome do técnico" /></Field><Field label="Previsão de entrega"><input type="datetime-local" value={order.expectedDelivery} onChange={(event) => update({ expectedDelivery: event.target.value })} /></Field></div></article>
      <article className="document-editor-card"><h3>Informações técnicas</h3><div className="document-textareas"><Field label="Solicitação / relato do cliente"><textarea rows={3} value={order.complaint} onChange={(event) => update({ complaint: event.target.value })} placeholder="Descreva o motivo da entrada do veículo." /></Field><Field label="Diagnóstico / orientação"><textarea rows={3} value={order.diagnosis} onChange={(event) => update({ diagnosis: event.target.value })} placeholder="Diagnóstico, recomendações ou serviço autorizado." /></Field><Field label="Observações internas"><textarea rows={3} value={order.internalNotes} onChange={(event) => update({ internalNotes: event.target.value })} placeholder="Informações internas que não precisam aparecer para o cliente." /></Field></div></article>
    </section>
    <DocumentItemsEditor items={order.items} catalog={catalog} onChange={(items) => update({ items })} />
    <aside className="document-total-bar"><span>Total da O.S.</span><strong>{money(order.total)}</strong></aside>
  </section>;
}

function paymentDescription(quote: Quote) {
  if (quote.paymentMethod === "PIX") return "Pix";
  if (quote.paymentMethod === "DEBITO") return "Cartão de débito";
  if (quote.paymentMethod === "CREDITO") {
    return quote.installments > 1
      ? `Cartão de crédito · parcelamento em até ${quote.installments}x`
      : "Cartão de crédito à vista";
  }
  if (quote.paymentMethod === "DINHEIRO") return "Dinheiro";
  return "Condição a combinar";
}

function quoteValidityDescription(quote: Quote) {
  return quote.validityDays > 0 ? `${quote.validityDays} dias` : "";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "cliente";
}

function buildQuoteMessage(quote: Quote, companyName: string, consultiveEnhancement = false) {
  const validItems = quote.items.filter((item) => item.name.trim());
  const lines = validItems.map((item) => `• ${item.name} — ${money(lineTotal(item))}`);
  const greeting = `Olá, ${firstName(quote.customer)}! 👋`;
  const vehicle = `${quote.vehicle}${quote.plate ? ` · ${quote.plate}` : ""}`;
  const payment = `💳 Condição de pagamento: ${paymentDescription(quote)}`;
  const validity = quote.validityDays > 0 ? `📅 Validade da proposta: ${quote.validityDays} dias` : "";
  const notes = quote.notes.trim() ? `📝 Observações: ${quote.notes.trim()}` : "";
  const consultiveSummary = consultiveEnhancement
    ? [
        "",
        "💡 Para facilitar sua decisão, podemos esclarecer cada item e organizar a execução conforme a sua prioridade.",
        validItems.length > 3 ? `O orçamento contempla ${validItems.length} itens entre serviços, peças e produtos.` : "",
      ].filter(Boolean)
    : [];

  if (quote.messageTemplate === "DIRETA") {
    return [
      greeting,
      "",
      `📄 Orçamento ${quote.code} — ${companyName}`,
      `🚗 Veículo: ${vehicle}`,
      "",
      "🔧 Itens orçados:",
      ...lines,
      "",
      `💰 Total: ${money(quote.total)}`,
      payment,
      validity,
      notes,
      ...consultiveSummary,
      "",
      "✅ Para aprovar, responda *APROVO*. Para ajustes, envie sua dúvida por aqui.",
    ].filter(Boolean).join("\n");
  }

  if (quote.messageTemplate === "CONSULTIVA") {
    return [
      greeting,
      "",
      `Realizamos a análise do atendimento do seu veículo e preparamos o orçamento ${quote.code}.`,
      `🚗 Veículo: ${vehicle}`,
      "",
      "🔎 Serviços, peças e produtos recomendados:",
      ...lines,
      "",
      `💰 Investimento total: ${money(quote.total)}`,
      payment,
      validity,
      notes,
      "",
      "💡 Nossa equipe está disponível para explicar cada recomendação e organizar a execução conforme sua necessidade.",
      ...consultiveSummary,
      "",
      "✅ Para autorizar ou solicitar uma revisão do orçamento, basta responder esta mensagem.",
      "",
      `Atenciosamente,\n${companyName}`,
    ].filter(Boolean).join("\n");
  }

  if (quote.messageTemplate === "PREVENTIVA") {
    return [
      greeting,
      "",
      `🛡️ Pensando na segurança e na confiabilidade do seu veículo, preparamos o orçamento ${quote.code}.`,
      `🚗 Veículo: ${vehicle}`,
      "",
      "🔧 Itens recomendados:",
      ...lines,
      "",
      `💰 Investimento previsto: ${money(quote.total)}`,
      payment,
      validity,
      notes,
      "",
      "🔍 A manutenção preventiva contribui para reduzir o risco de falhas e ajuda a preservar o bom funcionamento do veículo.",
      ...consultiveSummary,
      "",
      "✅ Responda esta mensagem para aprovar os itens desejados ou conversar com nossa equipe.",
      "",
      companyName,
    ].filter(Boolean).join("\n");
  }

  return [
    greeting,
    "",
    `A ${companyName} preparou o orçamento ${quote.code} para o seu veículo.`,
    `🚗 Veículo: ${vehicle}`,
    "",
    "📋 Serviços, peças e produtos:",
    ...lines,
    "",
    `💰 Valor total: ${money(quote.total)}`,
    payment,
    validity,
    notes,
    ...consultiveSummary,
    "",
    "✅ Para aprovar, solicitar alterações ou esclarecer dúvidas, responda esta mensagem.",
    "",
    `Atenciosamente,\n${companyName}`,
  ].filter(Boolean).join("\n");
}

function buildQuoteConsultiveSuggestions(quote: Quote) {
  const suggestions: string[] = [];
  const validItems = quote.items.filter((item) => item.name.trim());
  const itemsWithoutDetail = validItems.filter((item) => !item.description.trim()).length;

  if (!validItems.length) suggestions.push("Adicione pelo menos um serviço, peça ou produto antes de enviar ao cliente.");
  if (quote.total <= 0) suggestions.push("Revise os valores: o total do orçamento ainda está zerado.");
  if (itemsWithoutDetail > 0) suggestions.push(`Detalhe ${itemsWithoutDetail} item(ns) para deixar a proposta mais clara e reduzir dúvidas.`);
  if (!quote.notes.trim()) suggestions.push("Inclua prazo de execução, garantia ou condições relevantes nas observações.");
  if (quote.validityDays === 0) suggestions.push("A validade está em 0; ela será ocultada da mensagem e do documento.");
  if (quote.paymentMethod === "CREDITO" && quote.installments > 1) suggestions.push(`Destaque comercial disponível: parcelamento em até ${quote.installments}x.`);
  if (!["AGUARDANDO_APROVACAO", "FECHADO"].includes(quote.status)) suggestions.push("Antes do envio, considere alterar o status para “Aguardando aprovação”.");
  if (!suggestions.length) suggestions.push("O orçamento está bem estruturado e pronto para uma abordagem consultiva ao cliente.");
  return suggestions;
}

function buildQuoteDocumentHtml(quote: Quote, companyIdentity: CompanyIdentity, customer: Customer | null) {
  const subtotal = itemsSubtotal(quote.items);
  const discount = Math.max(0, subtotal - quote.total);
  const accent = /^#[0-9a-f]{6}$/i.test(companyIdentity.sidebarColor) ? companyIdentity.sidebarColor : "#0f766e";
  const rows = quote.items.filter((item) => item.name.trim()).map((item, index) => `<tr><td class="index">${String(index + 1).padStart(2, "0")}</td><td><b>${escapeHtml(item.name)}</b>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}<em>${item.kind === "SERVICO" ? "Serviço" : item.kind === "PECA" ? "Peça" : "Produto"}</em></td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${money(lineTotal(item))}</td></tr>`).join("");
  const logo = companyIdentity.logo ? `<img src="${companyIdentity.logo}" alt="${escapeHtml(companyIdentity.displayName)}">` : `<div class="logo-fallback">${escapeHtml(companyIdentity.displayName.slice(0, 2).toUpperCase())}</div>`;
  const validity = quote.validityDays > 0 ? `<div><span>Validade</span><strong>${quote.validityDays} dias</strong></div>` : "";
  const customerPhone = customer?.phone?.trim() || "Não informado";
  const customerEmail = customer?.email?.trim() || "Não informado";
  const emittedAt = new Date(quote.updatedAt).toLocaleDateString("pt-BR");
  const payment = paymentDescription(quote);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(quote.code)} - ${escapeHtml(companyIdentity.displayName)}</title><style>
  :root{--accent:${accent};--ink:#14212c;--muted:#64727d;--line:#d9e1e6;--soft:#f5f8f9} @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#eef2f4;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px}.sheet{max-width:210mm;min-height:273mm;margin:16px auto;padding:16mm;background:#fff;box-shadow:0 18px 50px rgba(20,33,44,.12)}.toolbar{max-width:210mm;margin:14px auto;text-align:right}.toolbar button{padding:10px 16px;border:0;border-radius:8px;color:#fff;background:var(--accent);font-weight:700;cursor:pointer}.top-accent{height:7px;margin:-16mm -16mm 15mm;background:var(--accent)}.header{display:flex;align-items:flex-start;justify-content:space-between;gap:28px}.brand{display:flex;align-items:center;gap:14px}.brand img{max-width:160px;max-height:65px;object-fit:contain}.logo-fallback{width:66px;height:66px;display:grid;place-items:center;border-radius:14px;color:#fff;background:var(--accent);font-size:22px;font-weight:900}.brand h1{margin:0;font-size:23px;letter-spacing:-.02em}.brand p{margin:5px 0 0;color:var(--muted)}.document{text-align:right}.document .label{color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.document h2{margin:5px 0 7px;font-size:25px}.status{display:inline-block;padding:6px 10px;border:1px solid var(--accent);border-radius:999px;color:var(--accent);font-size:9px;font-weight:800;text-transform:uppercase}.customer-panel{margin-top:22px;border:1px solid var(--line);border-radius:13px;overflow:hidden}.section-title{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;color:#fff;background:var(--accent);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.customer-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr}.customer-grid>div{min-height:64px;padding:11px 13px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.customer-grid>div:nth-child(4n){border-right:0}.customer-grid>div:nth-last-child(-n+4){border-bottom:0}.customer-grid span,.commercial-grid span{display:block;margin-bottom:5px;color:var(--muted);font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.customer-grid strong,.commercial-grid strong{font-size:11px}.commercial-panel{margin-top:13px;padding:13px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}.commercial-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.items-title{display:flex;align-items:end;justify-content:space-between;margin-top:22px;padding-bottom:8px;border-bottom:2px solid var(--accent)}.items-title h3{margin:0;font-size:15px}.items-title span{color:var(--muted);font-size:9px}table{width:100%;border-collapse:collapse;margin-top:8px}th{padding:10px 8px;color:#fff;background:#23313c;text-align:left;font-size:8px;letter-spacing:.06em;text-transform:uppercase}td{padding:11px 8px;border-bottom:1px solid var(--line);vertical-align:top}.index{width:32px;color:var(--muted)}td:nth-child(3),td:nth-child(4),td:nth-child(5),th:nth-child(3),th:nth-child(4),th:nth-child(5){text-align:right}td small{display:block;margin-top:4px;color:var(--muted);line-height:1.35}td em{display:inline-block;margin-top:6px;padding:3px 6px;border-radius:999px;color:var(--accent);background:#edf6f4;font-size:7px;font-style:normal;font-weight:800;text-transform:uppercase}.bottom-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;margin-top:17px}.notes{min-height:118px;padding:13px;border:1px solid var(--line);border-radius:11px;white-space:pre-wrap}.notes b{display:block;margin-bottom:8px;font-size:10px;text-transform:uppercase}.summary{padding:14px;border:1px solid var(--line);border-radius:11px;background:var(--soft)}.summary div{display:flex;justify-content:space-between;padding:5px 0}.summary .discount{color:#b42334}.summary .total{margin-top:8px;padding-top:12px;border-top:2px solid var(--accent);font-size:18px;font-weight:900}.approval{margin-top:24px;padding:14px;border:1px solid var(--line);border-radius:11px}.approval h4{margin:0 0 6px;font-size:11px}.approval p{margin:0;color:var(--muted);line-height:1.5}.signature{display:grid;grid-template-columns:1fr 1fr;gap:45px;margin-top:40px}.signature div{padding-top:8px;border-top:1px solid #87939c;text-align:center;color:var(--muted)}.footer{display:flex;justify-content:space-between;gap:20px;margin-top:28px;padding-top:13px;border-top:1px solid var(--line);color:var(--muted);font-size:8px}@media print{body{background:#fff}.toolbar{display:none}.sheet{max-width:none;min-height:auto;margin:0;padding:0;box-shadow:none}.top-accent{margin:0 0 12mm}}@media(max-width:760px){.sheet{margin:0;padding:20px}.top-accent{margin:-20px -20px 20px}.header,.bottom-grid{grid-template-columns:1fr;display:grid}.document{text-align:left}.customer-grid,.commercial-grid{grid-template-columns:1fr 1fr}.customer-grid>div{border-right:0}.toolbar{margin:10px}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / salvar PDF</button></div><main class="sheet"><div class="top-accent"></div><header class="header"><div class="brand">${logo}<div><h1>${escapeHtml(companyIdentity.displayName)}</h1><p>Proposta de serviços, peças e produtos</p></div></div><div class="document"><span class="label">Orçamento</span><h2>${escapeHtml(quote.code)}</h2><span class="status">${escapeHtml(quoteStatusLabel(quote.status))}</span></div></header><section class="customer-panel"><div class="section-title"><span>Dados do cliente e do veículo</span><span>Emissão ${emittedAt}</span></div><div class="customer-grid"><div><span>Cliente</span><strong>${escapeHtml(quote.customer)}</strong></div><div><span>WhatsApp</span><strong>${escapeHtml(customerPhone)}</strong></div><div><span>E-mail</span><strong>${escapeHtml(customerEmail)}</strong></div><div><span>Responsável</span><strong>${escapeHtml(quote.responsible)}</strong></div><div><span>Veículo</span><strong>${escapeHtml(quote.vehicle)}</strong></div><div><span>Placa</span><strong>${escapeHtml(quote.plate)}</strong></div><div><span>Código da proposta</span><strong>${escapeHtml(quote.code)}</strong></div><div><span>Data de emissão</span><strong>${emittedAt}</strong></div></div></section><section class="commercial-panel"><div class="commercial-grid"><div><span>Forma de pagamento</span><strong>${escapeHtml(payment)}</strong></div>${validity}<div><span>Status</span><strong>${escapeHtml(quoteStatusLabel(quote.status))}</strong></div><div><span>Responsável</span><strong>${escapeHtml(quote.responsible)}</strong></div></div></section><div class="items-title"><h3>Itens da proposta</h3><span>${quote.items.filter((item) => item.name.trim()).length} item(ns)</span></div><table><thead><tr><th>#</th><th>Descrição</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Nenhum item informado.</td></tr>'}</tbody></table><section class="bottom-grid"><div class="notes"><b>Observações e condições</b>${quote.notes ? escapeHtml(quote.notes) : "Nenhuma observação adicional informada."}</div><aside class="summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="discount"><span>Descontos</span><b>- ${money(discount)}</b></div><div class="total"><span>Total final</span><b>${money(quote.total)}</b></div></aside></section><section class="approval"><h4>Aprovação da proposta</h4><p>A execução dos serviços e o fornecimento dos itens desta proposta dependem da aprovação do cliente e da disponibilidade de agenda e estoque.</p></section><section class="signature"><div>Responsável pela empresa</div><div>Cliente / autorização</div></section><footer class="footer"><span>Documento emitido por ${escapeHtml(companyIdentity.displayName)}.</span><span>Tecnologia Gerivo · Sistema desenvolvido por Petrick Maciel</span></footer></main></body></html>`;
}

function QuoteEditor({
  quote,
  catalog,
  companyName,
  companyIdentity,
  customer,
  deliveryMode,
  onChange,
  onBack,
  onSaved,
}: {
  quote: Quote;
  catalog: CatalogItem[];
  companyName: string;
  companyIdentity: CompanyIdentity;
  customer: Customer | null;
  deliveryMode: QuoteDeliveryMode;
  onChange: (quote: Quote) => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  const subtotal = itemsSubtotal(quote.items);
  const total = Math.max(0, subtotal - quote.discountAmount - subtotal * quote.discountPercent / 100);
  const generatedMessage = buildQuoteMessage({ ...quote, total }, companyName);
  const [messageOverride, setMessageOverride] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const message = messageOverride ?? generatedMessage;
  const suggestions = buildQuoteConsultiveSuggestions({ ...quote, total });

  useEffect(() => {
    setMessageOverride(null);
    setAssistantOpen(false);
  }, [quote.id]);

  function update(patch: Partial<Quote>) {
    const items = patch.items ?? quote.items;
    const discountAmount = patch.discountAmount ?? quote.discountAmount;
    const discountPercent = patch.discountPercent ?? quote.discountPercent;
    const currentSubtotal = itemsSubtotal(items);
    const currentTotal = Math.max(0, currentSubtotal - discountAmount - currentSubtotal * discountPercent / 100);
    onChange({ ...quote, ...patch, items, discountAmount, discountPercent, total: currentTotal, updatedAt: new Date().toISOString(), status: quote.status === "AGUARDANDO_DIGITACAO" && items.length ? "ABERTO" : (patch.status ?? quote.status) });
  }

  function changeTemplate(template: QuoteMessageTemplate) {
    setMessageOverride(null);
    update({ messageTemplate: template });
  }

  function applyConsultiveImprovement() {
    setMessageOverride(buildQuoteMessage({ ...quote, total }, companyName, true));
    setAssistantOpen(true);
  }

  async function copyMessage() {
    try { await navigator.clipboard.writeText(message); onSaved(); } catch { window.alert(message); }
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function printQuote() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return window.alert("Permita pop-ups para imprimir o orçamento.");
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(buildQuoteDocumentHtml({ ...quote, total }, companyIdentity, customer));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 350);
  }

  function downloadQuote() {
    const html = buildQuoteDocumentHtml({ ...quote, total }, companyIdentity, customer);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${quote.code}-${quote.plate || "orcamento"}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return <section className="document-editor-page">
    <header className="document-editor-header"><div><small>ORÇAMENTO · {companyName}</small><h2>{quote.code}</h2><p>{quote.customer} · {quote.vehicle} · {quote.plate}</p></div><div><button className="outline" onClick={onBack}>← Voltar à lista</button><button className="outline" onClick={downloadQuote}>Baixar orçamento</button><button className="outline" onClick={printQuote}>Imprimir / PDF</button><button className="primary" onClick={onSaved}>Salvar orçamento</button></div></header>
    <section className="document-editor-grid quote-editor-grid">
      <article className="document-editor-card"><h3>Condições comerciais</h3><div className="document-form-grid"><Field label="Status"><select value={quote.status} onChange={(event) => update({ status: event.target.value as QuoteStatus })}><option value="ABERTO">Aberto</option><option value="FECHADO">Fechado</option><option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option><option value="AGUARDANDO_COTACAO">Aguardando cotação</option><option value="AGUARDANDO_DIGITACAO">Aguardando digitação</option><option value="INCOMPLETO">Incompleto</option><option value="AGUARDANDO_RETORNO_CLIENTE">Aguardando retorno do cliente</option><option value="AGUARDANDO_DESCONTO">Aguardando desconto</option></select></Field><Field label="Validade"><div className="validity-field"><div className="input-suffix"><input type="number" min="0" value={quote.validityDays} onChange={(event) => update({ validityDays: Math.max(0, Number(event.target.value) || 0) })} /><span>dias</span></div><small>Use 0 para não exibir validade.</small></div></Field><Field label="Forma de pagamento"><select value={quote.paymentMethod} onChange={(event) => update({ paymentMethod: event.target.value as PaymentMethod })}><option value="PIX">Pix</option><option value="DEBITO">Débito</option><option value="CREDITO">Crédito</option><option value="DINHEIRO">Dinheiro</option><option value="OUTRO">Outro</option></select></Field>{quote.paymentMethod === "CREDITO" && <Field label="Parcelamento em até"><select value={quote.installments} onChange={(event) => update({ installments: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}x</option>)}</select></Field>}<Field label="Desconto R$"><input type="number" min="0" step="0.01" value={quote.discountAmount} onChange={(event) => update({ discountAmount: Math.max(0, Number(event.target.value) || 0) })} /></Field><Field label="Desconto %"><input type="number" min="0" max="100" step="0.01" value={quote.discountPercent} onChange={(event) => update({ discountPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></Field></div></article>
      <article className="document-editor-card quote-message-card"><div className="message-card-heading"><div><h3>Mensagem ao cliente</h3><span>Modelo profissional com emojis e edição livre.</span></div><select value={quote.messageTemplate} onChange={(event) => changeTemplate(event.target.value as QuoteMessageTemplate)}>{(["PROFISSIONAL", "DIRETA", "CONSULTIVA", "PREVENTIVA"] as QuoteMessageTemplate[]).map((template) => <option key={template} value={template}>{quoteMessageTemplateLabel(template)}</option>)}</select></div><textarea rows={14} value={message} onChange={(event) => setMessageOverride(event.target.value)} /><div className="quote-message-actions"><span>Padrão da empresa: {quoteDeliveryLabel(deliveryMode)}</span><button className="outline" type="button" onClick={() => setMessageOverride(null)}>Restaurar automático</button>{deliveryMode !== "LINK" && <button className="outline" type="button" onClick={copyMessage}>Copiar mensagem</button>}<button className="primary" type="button" onClick={shareWhatsApp}>Abrir WhatsApp</button></div></article>
    </section>
    <section className="quote-ai-assistant"><div className="quote-ai-heading"><div className="quote-ai-icon">✦</div><div><small>ASSISTENTE CONSULTIVO GERIVO</small><h3>Análise inteligente da proposta</h3><p>Revisa clareza, condições comerciais e prontidão para envio.</p></div><div><button className="outline" type="button" onClick={() => setAssistantOpen((current) => !current)}>{assistantOpen ? "Ocultar análise" : "Analisar orçamento"}</button><button className="primary" type="button" onClick={applyConsultiveImprovement}>Melhorar mensagem</button></div></div>{assistantOpen && <div className="quote-ai-suggestions">{suggestions.map((suggestion, index) => <div key={`${index}-${suggestion}`}><span>{index + 1}</span><p>{suggestion}</p></div>)}</div>}</section>
    <DocumentItemsEditor items={quote.items} catalog={catalog} onChange={(items) => update({ items })} />
    <section className="quote-summary-grid"><Field label="Observações da proposta"><textarea rows={4} value={quote.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Prazo de execução, garantia, disponibilidade de peças ou informações adicionais." /></Field><aside><span>Subtotal</span><b>{money(subtotal)}</b><span>Descontos</span><b>- {money(Math.max(0, subtotal - total))}</b><strong>Total final</strong><em>{money(total)}</em></aside></section>
  </section>;
}

function StartFlowWizard({
  target,
  customers,
  vehicles,
  attendances,
  currentStoreId,
  defaultResponsible,
  onClose,
  onComplete,
}: {
  target: StartTarget;
  customers: Customer[];
  vehicles: Vehicle[];
  attendances: Attendance[];
  currentStoreId: string;
  defaultResponsible: string;
  onClose: () => void;
  onComplete: (payload: { target: StartTarget; customer: Customer; vehicle: Vehicle; responsible: string }) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [responsible, setResponsible] = useState(defaultResponsible);
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedPlate = plate.replace(/[^A-Z0-9]/g, "").toUpperCase();

  const registry = useMemo(() => {
    const records = customers.filter((customer) => customer.storeId === currentStoreId).flatMap((customer) => {
      const linkedVehicles = vehicles.filter((vehicle) => vehicle.storeId === currentStoreId && vehicle.customerId === customer.id);
      return linkedVehicles.length ? linkedVehicles.map((vehicle) => ({ customer, vehicle })) : [{ customer, vehicle: null as Vehicle | null }];
    });
    return records.filter(({ customer, vehicle }) => {
      if (!normalizedSearch) return true;
      const text = `${customer.name} ${customer.phone} ${customer.email} ${vehicle?.plate ?? ""} ${vehicle?.description ?? ""}`.toLowerCase();
      return text.includes(normalizedSearch);
    }).slice(0, 8);
  }, [customers, vehicles, normalizedSearch, currentStoreId]);

  const historicalMatch = normalizedPlate.length >= 7
    ? attendances.find((attendance) => attendance.storeId === currentStoreId && attendance.reception.plate.replace(/[^A-Z0-9]/g, "").toUpperCase() === normalizedPlate)
    : null;

  function selectRecord(customer: Customer, vehicle: Vehicle | null) {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email);
    if (vehicle) {
      setSelectedVehicleId(vehicle.id);
      setPlate(vehicle.plate);
      setVehicleDescription(vehicle.description);
    } else {
      setSelectedVehicleId("");
      setPlate("");
      setVehicleDescription("");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerName.trim()) return window.alert("Informe ou selecione o cliente.");
    if (!vehicleDescription.trim()) return window.alert("Informe o veículo.");
    if (normalizedPlate.length < 7) return window.alert("Informe uma placa válida para vincular o processo.");
    const now = new Date().toISOString();
    const customer: Customer = {
      id: selectedCustomerId || uid(),
      storeId: currentStoreId,
      name: customerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const vehicle: Vehicle = {
      id: selectedVehicleId || uid(),
      storeId: currentStoreId,
      customerId: customer.id,
      plate: normalizedPlate,
      description: vehicleDescription.trim(),
      createdAt: now,
      updatedAt: now,
    };
    onComplete({ target, customer, vehicle, responsible });
  }

  const title = target === "CHECKLIST" ? "Nova recepção" : target === "ORDER" ? "Nova ordem de serviço" : "Novo orçamento";
  const description = target === "CHECKLIST" ? "Localize o cliente e o veículo antes de iniciar o Check-in." : target === "ORDER" ? "Nenhuma O.S. pode ser aberta sem cliente e veículo vinculados." : "O orçamento será criado somente após identificar o cliente e o veículo.";

  return (
    <div className="modal-backdrop start-flow-backdrop">
      <section className="start-flow-modal">
        <header><div><small>NOVO PROCESSO</small><h2>{title}</h2><p>{description}</p></div><button type="button" onClick={onClose}>×</button></header>
        <div className="start-flow-layout">
          <aside className="registry-search">
            <label><span>Buscar cadastro</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, telefone, placa ou veículo" autoFocus /></label>
            <div className="registry-results">
              {registry.length === 0 ? <div className="registry-empty"><strong>Nenhum cadastro encontrado</strong><span>Preencha os dados ao lado para criar um novo cliente.</span></div> : registry.map(({ customer, vehicle }) => <button type="button" key={`${customer.id}-${vehicle?.id ?? "none"}`} className={selectedVehicleId === vehicle?.id ? "selected" : ""} onClick={() => selectRecord(customer, vehicle)}><b>{customer.name.slice(0,1).toUpperCase()}</b><span><strong>{customer.name}</strong><small>{vehicle ? `${vehicle.description} · ${vehicle.plate}` : customer.phone || "Sem veículo cadastrado"}</small></span><PremiumIcon name="chevron" size={14} /></button>)}
            </div>
          </aside>
          <form onSubmit={submit} className="start-flow-form">
            <div className="start-flow-section"><small>CLIENTE</small><div className="start-flow-grid"><label><span>Nome *</span><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Digite o nome do cliente" /></label><label><span>WhatsApp</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" /></label><label className="wide"><span>E-mail</span><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" /></label></div></div>
            <div className="start-flow-section"><small>VEÍCULO</small><div className="start-flow-grid"><label><span>Placa *</span><input value={plate} maxLength={7} onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABC1D23" /></label><label className="vehicle-description"><span>Veículo *</span><input value={vehicleDescription} onChange={(e) => setVehicleDescription(e.target.value)} placeholder="Modelo e versão" /></label><label className="wide"><span>Responsável</span><input value={responsible} onChange={(e) => setResponsible(e.target.value)} /></label></div>{historicalMatch && <div className="history-match"><PremiumIcon name="car" size={18} /><div><strong>Histórico encontrado para esta placa</strong><span>{historicalMatch.reception.customer} · último atendimento {formatDate(historicalMatch.updatedAt)}</span></div></div>}</div>
            <footer><button type="button" className="outline" onClick={onClose}>Cancelar</button><button type="submit" className="primary">{target === "CHECKLIST" ? "Iniciar Check-in" : target === "ORDER" ? "Criar O.S." : "Criar orçamento"}</button></footer>
          </form>
        </div>
      </section>
    </div>
  );
}

function EmptyChecklist({ onCreate }: { onCreate: () => void }) {
  return <article className="panel placeholder"><div>🚗</div><h2>Nenhum atendimento selecionado</h2><p>Abra um atendimento existente ou inicie uma nova recepção.</p><button className="primary" onClick={onCreate}>Nova recepção</button></article>;
}

function OperationPlaceholder({
  title,
  attendance,
  onBack,
  quoteDeliveryMode,
  standardServices,
}: {
  title: string;
  attendance: Attendance | null;
  onBack: () => void;
  quoteDeliveryMode: QuoteDeliveryMode;
  standardServices: CatalogItem[];
}) {
  const isQuote = title === "Orçamento";
  return <article className="panel operation-placeholder"><header><div><small>{isQuote ? "MÓDULO COMERCIAL" : "ATENDIMENTO VINCULADO"}</small><h2>{title}</h2></div><button className="outline" onClick={onBack}>← Voltar</button></header><div className="operation-content operation-preview"><div className="garage-icon">{isQuote ? "▤" : "🔧"}</div><h3>{attendance ? `${attendance.code} · ${attendance.reception.vehicle || "Veículo"}` : isQuote ? "Novo orçamento sem atendimento vinculado" : "Nenhum atendimento selecionado"}</h3>
    {isQuote ? <><p>Padrão configurado: <strong>{quoteDeliveryLabel(quoteDeliveryMode)}</strong>.</p><div className="standard-preview"><small>SERVIÇOS PADRÃO DISPONÍVEIS</small>{standardServices.length ? standardServices.map((service) => <span key={service.id}>{service.name}<b>{money(service.price)}</b></span>) : <em>Nenhum serviço padrão configurado.</em>}</div><p>O editor completo de orçamento, mensagem e link de aprovação será o próximo módulo implementado.</p></> : <p>O atendimento correto já está vinculado. A criação completa da O.S. será conectada nas próximas versões.</p>}
  </div></article>;
}
function Gallery({ photos, remove, compact = false }: { photos: Photo[]; remove: (id: string) => void; compact?: boolean }) {
  return <div className={compact ? "gallery compact" : "gallery"}>{photos.map((photo) => <figure key={photo.id}><img src={photo.dataUrl} alt={photo.name} /><figcaption><span>{photo.name}</span><button onClick={() => remove(photo.id)}>Remover</button></figcaption></figure>)}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
