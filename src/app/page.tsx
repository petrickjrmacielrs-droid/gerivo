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
import { getSupabaseBrowserClient } from "../lib/supabase";

type Page =
  | "dashboard"
  | "appointments"
  | "checklist"
  | "orders"
  | "quotes"
  | "assistant"
  | "bi"
  | "messages"
  | "knowledge"
  | "management"
  | "catalog"
  | "inventory"
  | "master";
type SettingsTab = "IDENTITY" | "MODULES" | "CHECKLIST" | "QUOTES" | "PRICING";
type IconName =
  | "home"
  | "clipboard"
  | "wrench"
  | "file"
  | "settings"
  | "layers"
  | "menu"
  | "store"
  | "user"
  | "logout"
  | "chevron"
  | "eye"
  | "eyeOff"
  | "car"
  | "users"
  | "modules"
  | "trash"
  | "camera"
  | "calendar"
  | "box"
  | "sparkle"
  | "chart"
  | "shield"
  | "truck"
  | "image";
type CompanyModule = "APPOINTMENTS" | "CATALOG" | "INVENTORY" | "CHECKLIST" | "ORDERS" | "QUOTES" | "ASSISTANT";
type CompanyProfile = "FULL" | "QUOTE_ONLY" | "CUSTOM";
type QuoteDeliveryMode = "LINK" | "MESSAGE" | "BOTH";
type ReportMode = "SUMMARY" | "FULL" | "MODULAR";
type ReportConfig = {
  includeCustomer: boolean;
  stageIds: StageId[];
  includeTechnicalReport: boolean;
  includeGeneralPhotos: boolean;
  includeItemPhotos: boolean;
  includeSignatures: boolean;
};
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
type ResponseMode =
  | "CONDITION"
  | "PRESENCE"
  | "YES_NO"
  | "WASH"
  | "MATS"
  | "PRESENCE_DAMAGE"
  | "AIR_CONDITIONING"
  | "BELONGINGS"
  | "TIRE"
  | "SIDE_TRIM"
  | "MIRROR"
  | "OK_DAMAGE_OTHER"
  | "OK_DAMAGE_NA"
  | "GOOD_OTHER"
  | "GOOD_NA"
  | "TOOLS"
  | "MILEAGE"
  | "FUEL";
type ItemValue =
  | "PENDENTE"
  | "BOM"
  | "REGULAR"
  | "RUIM"
  | "NAO_SE_APLICA"
  | "SIM"
  | "NAO"
  | "AVARIADO"
  | "AVARIA"
  | "INCOMPLETO"
  | "NORMAL"
  | "MAL_ODOR"
  | "NAO_POSSUI"
  | "OK"
  | "EXPRESSA"
  | "OUTRO";
type CatalogKind = "SERVICO" | "PRODUTO" | "PECA" | "KIT" | "MATERIAL";
type MarginMode = "GENERAL" | "INDIVIDUAL";
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
type QuoteMessageTemplate =
  | "PROFISSIONAL"
  | "DIRETA"
  | "CONSULTIVA"
  | "PREVENTIVA"
  | "AMIGAVEL"
  | "FORMAL"
  | "COMERCIAL"
  | "CURTA";
type AppointmentStatus = "AGENDADO" | "CONFIRMADO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "CANCELADO";
type AppointmentSettings = {
  startTime: string;
  endTime: string;
  slotMinutes: 15 | 30 | 60;
  defaultDurationMinutes: number;
  professionals: string[];
  workingDays: number[];
  allowOverlap: boolean;
};
type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
};

type AppointmentBlock = {
  id: string;
  storeId: string;
  professional: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
};

type Store = {
  id: string;
  publicCode: number;
  name: string;
  companyId: string;
  companyName: string;
  segment: string;
  role: string;
};
type ServiceType = { id: string; name: string; active: boolean };
type CompanyIdentity = {
  displayName: string;
  logo: string;
  sidebarColor: string;
  selectionColor: string;
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
type UserProfile = {
  preferredName: string;
  username: string;
  phone: string;
  email: string;
  photo: string;
};
type Photo = { id: string; name: string; dataUrl: string; createdAt: string };
type Supplier = {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  paymentTerms: string;
  leadTimeDays: number;
  active: boolean;
};
type CatalogItem = {
  id: string;
  name: string;
  category: string;
  kind: CatalogKind;
  price: number;
  cost: number;
  marginMode: MarginMode;
  individualMargin: number | null;
  image: string;
  referenceImage: string;
  sku: string;
  stock: number;
  minimumStock: number;
  supplierId: string | null;
  active: boolean;
  standard: boolean;
  serviceTypeId?: string;
};
type Appointment = {
  id: string;
  storeId: string;
  customerId: string | null;
  customer: string;
  phone: string;
  title: string;
  professional: string;
  startsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string;
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
  generalMargin: number;
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
  combinePartsLabor: boolean;
  items: DocumentLine[];
};
type StoreData = {
  customers: Customer[];
  vehicles: Vehicle[];
  catalog: CatalogItem[];
  suppliers: Supplier[];
  appointments: Appointment[];
  appointmentSettings: AppointmentSettings;
  appointmentBlocks: AppointmentBlock[];
  serviceTypes: ServiceType[];
  checklistSettings: ChecklistSettings;
  companySettings: CompanySettings;
  companyIdentity: CompanyIdentity;
  attendances: Attendance[];
  orders: ServiceOrder[];
  quotes: Quote[];
  knowledgeBase: KnowledgeEntry[];
};

const EMPTY_STORE_ID = "pending";
const EMPTY_STORE: Store = {
  id: EMPTY_STORE_ID,
  publicCode: 0,
  name: "Carregando...",
  companyId: "",
  companyName: "",
  segment: "OUTRO",
  role: "MEMBER",
};

const NAV: Array<{ id: Page; label: string; icon: IconName; module?: CompanyModule; hidden?: boolean; masterOnly?: boolean }> = [
  { id: "dashboard", label: "Tela inicial", icon: "home" },
  { id: "appointments", label: "Agendamentos", icon: "calendar", module: "APPOINTMENTS" },
  { id: "checklist", label: "Checklist", icon: "clipboard", module: "CHECKLIST" },
  { id: "orders", label: "Ordens de serviço", icon: "wrench", module: "ORDERS" },
  { id: "quotes", label: "Orçamentos", icon: "file", module: "QUOTES" },
  { id: "assistant", label: "Assistente Gerivo", icon: "sparkle", module: "ASSISTANT" },
  { id: "bi", label: "Gerivo BI", icon: "chart", module: "ASSISTANT" },
  { id: "messages", label: "Central de mensagens", icon: "file", hidden: true },
  { id: "knowledge", label: "Conhecimento da IA", icon: "sparkle", hidden: true },
  { id: "management", label: "Gestão", icon: "settings" },
  { id: "master", label: "Gerivo MASTER", icon: "shield", masterOnly: true },
  { id: "catalog", label: "Catálogo", icon: "layers", module: "CATALOG", hidden: true },
  { id: "inventory", label: "Estoque", icon: "box", module: "INVENTORY", hidden: true },
];

function isDeliverySegment(segment: string) {
  const normalized = segment.toUpperCase();
  return normalized === "DEMO_DELIVERY" || normalized === "DELIVERY" || normalized === "DELIVERY_COMIDA";
}

function navigationLabel(item: (typeof NAV)[number], segment: string) {
  if (item.id === "appointments" && isDeliverySegment(segment)) return "Pedidos";
  return item.label;
}

const MODULE_INFO: Record<CompanyModule, { label: string; description: string }> = {
  APPOINTMENTS: { label: "Agendamentos", description: "Agenda, profissionais, confirmações e capacidade." },
  CATALOG: { label: "Catálogo", description: "Produtos, serviços, materiais, kits e formação de preço." },
  INVENTORY: { label: "Estoque", description: "Saldo, compras, fornecedores e movimentações." },
  CHECKLIST: { label: "Checklist", description: "Check-in, Check-up, qualidade, Check-out e relatórios." },
  ORDERS: { label: "Ordens de serviço", description: "Execução, responsáveis, andamento e entrega." },
  QUOTES: { label: "Orçamentos", description: "Propostas, condições comerciais e aprovação." },
  ASSISTANT: { label: "Assistente Gerivo", description: "Análises consultivas dos dados autorizados." },
};

function catalogSeedItem(
  name: string,
  category: string,
  kind: CatalogKind,
  price: number,
  serviceTypeId?: string,
): Omit<CatalogItem, "id" | "active"> {
  return {
    name,
    category,
    kind,
    price,
    cost: kind === "SERVICO" ? 0 : Number((price * 0.62).toFixed(2)),
    marginMode: "GENERAL",
    individualMargin: null,
    image: "",
    referenceImage: "",
    sku: "",
    stock: kind === "SERVICO" ? 0 : 10,
    minimumStock: kind === "SERVICO" ? 0 : 3,
    supplierId: null,
    standard: true,
    serviceTypeId,
  };
}

const STANDARD_SERVICE_LIBRARY: Array<Omit<CatalogItem, "id" | "active">> = [
  catalogSeedItem("Troca de óleo do motor", "Manutenção", "SERVICO", 180, "manutencao"),
  catalogSeedItem("Alinhamento", "Pneus e geometria", "SERVICO", 120, "pneus-geometria"),
  catalogSeedItem("Balanceamento", "Pneus e geometria", "SERVICO", 35, "pneus-geometria"),
  catalogSeedItem("Diagnóstico eletrônico", "Diagnóstico", "SERVICO", 150, "diagnostico"),
  catalogSeedItem("Revisão preventiva", "Revisão", "SERVICO", 250, "revisao"),
];

const CHECKLIST_TEMPLATE: StageTemplate[] = [
  {
    id: "checkin",
    label: "Check-in",
    description: "Recepção do veículo em cinco passos objetivos.",
    groups: [
      {
        key: "driver-interior",
        label: "Passo 1 — Dentro do veículo no motorista",
        items: [
          { key: "mileage", label: "KM", mode: "MILEAGE" },
          { key: "fuel", label: "Nível de combustível", mode: "FUEL" },
          { key: "mats", label: "Tapetes", mode: "MATS" },
          { key: "sound", label: "Som/Multimídia", mode: "PRESENCE_DAMAGE" },
          { key: "air-conditioning", label: "Ar condicionado", mode: "AIR_CONDITIONING" },
          { key: "owner-manual", label: "Manual", mode: "PRESENCE_DAMAGE" },
          { key: "vehicle-doc", label: "Documento", mode: "PRESENCE_DAMAGE" },
          { key: "interior-belongings", label: "Pertences?", mode: "BELONGINGS", photoRecommended: true },
        ],
      },
      {
        key: "left-side",
        label: "Passo 2 — Lateral esquerda",
        items: [
          { key: "left-rear-tire", label: "Pneu traseiro", mode: "TIRE", photoRecommended: true },
          { key: "left-side-trim", label: "Friso lateral", mode: "SIDE_TRIM" },
          { key: "left-front-tire", label: "Pneu dianteiro", mode: "TIRE", photoRecommended: true },
          { key: "left-mirror", label: "Retrovisor", mode: "MIRROR", photoRecommended: true },
        ],
      },
      {
        key: "front",
        label: "Passo 3 — Dianteira",
        items: [
          { key: "front-bumper", label: "Parachoque", mode: "OK_DAMAGE_OTHER", photoRecommended: true },
          { key: "hood", label: "Capô", mode: "GOOD_OTHER", photoRecommended: true },
          { key: "front-lighting", label: "Iluminação", mode: "OK_DAMAGE_OTHER" },
          { key: "headlights", label: "Farois", mode: "OK_DAMAGE_OTHER", photoRecommended: true },
          { key: "fog-lights", label: "Farois de neblina", mode: "OK_DAMAGE_NA" },
          { key: "skid-plate", label: "Protetor de cárter", mode: "YES_NO" },
          { key: "front-wipers", label: "Palhetas", mode: "GOOD_OTHER" },
          { key: "windshield", label: "Para-brisa", mode: "OK_DAMAGE_OTHER", photoRecommended: true },
        ],
      },
      {
        key: "right-side",
        label: "Passo 4 — Lateral direita",
        items: [
          { key: "right-front-tire", label: "Pneu dianteiro", mode: "TIRE", photoRecommended: true },
          { key: "right-side-trim", label: "Friso lateral", mode: "SIDE_TRIM" },
          { key: "right-rear-tire", label: "Pneu traseiro", mode: "TIRE", photoRecommended: true },
          { key: "right-mirror", label: "Retrovisor", mode: "MIRROR", photoRecommended: true },
        ],
      },
      {
        key: "rear",
        label: "Passo 5 — Traseira",
        items: [
          { key: "rear-bumper", label: "Parachoque", mode: "OK_DAMAGE_OTHER", photoRecommended: true },
          { key: "rear-lid", label: "Tampa", mode: "OK_DAMAGE_OTHER", photoRecommended: true },
          { key: "rear-glass", label: "Vidro traseiro", mode: "OK_DAMAGE_OTHER", photoRecommended: true },
          { key: "rear-wiper", label: "Palheta", mode: "GOOD_NA" },
          { key: "spare-tire", label: "Estepe", mode: "GOOD_NA", photoRecommended: true },
          { key: "triangle", label: "Triangulo", mode: "TOOLS" },
          { key: "jack", label: "Macaco", mode: "TOOLS" },
          { key: "wheel-wrench", label: "Chave de roda", mode: "TOOLS" },
          { key: "rear-belongings", label: "Pertences?", mode: "BELONGINGS", photoRecommended: true },
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

type ItemOption = { value: ItemValue; label: string; symbol: string };

const CONDITION_OPTIONS: ItemOption[] = [
  { value: "BOM", label: "Bom", symbol: "✓" },
  { value: "REGULAR", label: "Regular", symbol: "!" },
  { value: "RUIM", label: "Ruim", symbol: "×" },
  { value: "NAO_SE_APLICA", label: "Não se aplica", symbol: "—" },
];
const PRESENCE_OPTIONS: ItemOption[] = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "AVARIADO", label: "Avariado", symbol: "!" },
];
const YES_NO_OPTIONS: ItemOption[] = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
];
const WASH_OPTIONS: ItemOption[] = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "EXPRESSA", label: "Expressa", symbol: "⚡" },
  { value: "OUTRO", label: "Outro", symbol: "+" },
];
const MATS_OPTIONS: ItemOption[] = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "AVARIA", label: "Avaria", symbol: "!" },
  { value: "INCOMPLETO", label: "Incompleto", symbol: "−" },
];
const PRESENCE_DAMAGE_OPTIONS: ItemOption[] = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "AVARIA", label: "Avaria", symbol: "!" },
];
const AIR_CONDITIONING_OPTIONS: ItemOption[] = [
  { value: "NORMAL", label: "Normal", symbol: "✓" },
  { value: "RUIM", label: "Ruim", symbol: "×" },
  { value: "MAL_ODOR", label: "Mal odor", symbol: "!" },
  { value: "NAO_SE_APLICA", label: "Não se aplica", symbol: "—" },
  { value: "OUTRO", label: "Outro", symbol: "+" },
];
const BELONGINGS_OPTIONS: ItemOption[] = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "OUTRO", label: "Outro", symbol: "+" },
];
const TIRE_OPTIONS: ItemOption[] = [
  { value: "BOM", label: "Bom", symbol: "✓" },
  { value: "REGULAR", label: "Regular", symbol: "!" },
  { value: "RUIM", label: "Ruim", symbol: "×" },
  { value: "OUTRO", label: "Outro", symbol: "+" },
];
const SIDE_TRIM_OPTIONS: ItemOption[] = YES_NO_OPTIONS;
const MIRROR_OPTIONS: ItemOption[] = [
  { value: "BOM", label: "Bom", symbol: "✓" },
  { value: "AVARIADO", label: "Avariado", symbol: "!" },
  { value: "NAO_POSSUI", label: "Não possui", symbol: "—" },
];
const OK_DAMAGE_OTHER_OPTIONS: ItemOption[] = [
  { value: "OK", label: "OK", symbol: "✓" },
  { value: "AVARIA", label: "Avaria", symbol: "!" },
  { value: "OUTRO", label: "Outro", symbol: "+" },
];
const OK_DAMAGE_NA_OPTIONS: ItemOption[] = [
  { value: "OK", label: "OK", symbol: "✓" },
  { value: "AVARIA", label: "Avaria", symbol: "!" },
  { value: "NAO_SE_APLICA", label: "Não se aplica", symbol: "—" },
];
const GOOD_OTHER_OPTIONS: ItemOption[] = TIRE_OPTIONS;
const GOOD_NA_OPTIONS: ItemOption[] = [
  { value: "BOM", label: "Bom", symbol: "✓" },
  { value: "REGULAR", label: "Regular", symbol: "!" },
  { value: "RUIM", label: "Ruim", symbol: "×" },
  { value: "NAO_SE_APLICA", label: "Não se aplica", symbol: "—" },
];
const TOOLS_OPTIONS: ItemOption[] = [
  { value: "SIM", label: "Sim", symbol: "✓" },
  { value: "NAO", label: "Não", symbol: "×" },
  { value: "AVARIA", label: "Avaria", symbol: "!" },
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
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#0B1F3A";
  const red = parseInt(safe.slice(1, 3), 16) / 255;
  const green = parseInt(safe.slice(3, 5), 16) / 255;
  const blue = parseInt(safe.slice(5, 7), 16) / 255;
  const linear = (value: number) => value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  return luminance > 0.48;
}

function sidebarThemeVariables(hex: string) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#0B1F3A";
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

function adjustHexColor(hex: string, amount: number) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#C89B3C";
  const channels = [1, 3, 5].map((index) => parseInt(safe.slice(index, index + 2), 16));
  const adjusted = channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel + amount))));
  return `#${adjusted.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function selectionThemeVariables(hex: string) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#C89B3C";
  const red = parseInt(safe.slice(1, 3), 16);
  const green = parseInt(safe.slice(3, 5), 16);
  const blue = parseInt(safe.slice(5, 7), 16);
  return {
    "--company-accent": safe,
    "--primary": safe,
    "--primary-dark": adjustHexColor(safe, -34),
    "--primary-soft": `rgba(${red},${green},${blue},.11)`,
    "--primary-ring": `rgba(${red},${green},${blue},.20)`,
  };
}

function quoteMessageTemplateLabel(template: QuoteMessageTemplate) {
  return ({
    PROFISSIONAL: "Profissional",
    DIRETA: "Direta e objetiva",
    CONSULTIVA: "Consultiva",
    PREVENTIVA: "Preventiva",
    AMIGAVEL: "Amigável",
    FORMAL: "Formal",
    COMERCIAL: "Comercial",
    CURTA: "Curta",
  } as const)[template];
}

function seedSuppliers(segment = "OUTRO"): Supplier[] {
  const names: Record<string, string> = {
    DEMO_ROUPAS: "Distribuidora Moda Brasil",
    OFICINA: "Autopeças Principal",
    OFICINA_COMPLETA: "Autopeças Principal",
    DEMO_CONFEITARIA: "Distribuidora Doce Sabor",
    DEMO_SALAO: "Cosméticos Profissionais",
    DEMO_ESTETICA: "Produtos Detail Pro",
    DEMO_DELIVERY: "Distribuidora de Alimentos",
  };
  return [
    { id: "supplier-geral", name: names[segment.toUpperCase()] || "Fornecedor principal", document: "", phone: "", email: "", paymentTerms: "28 dias", leadTimeDays: 5, active: true },
  ];
}

function buildDemoCatalogItem(
  name: string,
  category: string,
  kind: CatalogKind,
  price: number,
  cost: number,
  stock: number,
  minimumStock: number,
  icon: string,
  sku = "",
): CatalogItem {
  return {
    id: uid(),
    name,
    category,
    kind,
    price,
    cost,
    marginMode: "GENERAL",
    individualMargin: null,
    image: "",
    referenceImage: genericCatalogImage(name, icon),
    sku,
    stock: kind === "SERVICO" ? 0 : stock,
    minimumStock: kind === "SERVICO" ? 0 : minimumStock,
    supplierId: kind === "SERVICO" ? null : "supplier-geral",
    active: true,
    standard: true,
  };
}

function seedCatalog(segment = "OUTRO"): CatalogItem[] {
  const key = segment.toUpperCase();
  if (key === "DEMO_ROUPAS" || key === "VAREJO") return [
    buildDemoCatalogItem("Camiseta Premium", "Camisetas", "PRODUTO", 89.9, 38, 24, 6, "👕", "CAM-PREM"),
    buildDemoCatalogItem("Calça Jeans Slim", "Calças", "PRODUTO", 179.9, 82, 12, 4, "👖", "CAL-JEANS"),
    buildDemoCatalogItem("Vestido Midi", "Vestidos", "PRODUTO", 219.9, 96, 8, 3, "👗", "VES-MIDI"),
    buildDemoCatalogItem("Cinto Casual", "Acessórios", "PRODUTO", 69.9, 28, 5, 4, "👜", "CIN-CAS"),
  ];
  if (["OFICINA", "OFICINA_COMPLETA", "CONCESSIONARIA", "AUTOPECAS"].includes(key)) return [
    { ...catalogSeedItem("Troca de óleo do motor", "Manutenção", "SERVICO", 180, "manutencao"), id: uid(), active: true, referenceImage: genericCatalogImage("Troca de óleo", "🔧") },
    buildDemoCatalogItem("Óleo 5W30", "Motor", "PRODUTO", 58, 36, 12, 4, "🛢️", "OLEO-5W30"),
    buildDemoCatalogItem("Filtro de óleo", "Filtros", "PECA", 42, 24, 5, 3, "⚙️", "FILTRO-OLEO"),
    { ...catalogSeedItem("Alinhamento", "Pneus e geometria", "SERVICO", 120, "pneus-geometria"), id: uid(), active: true, referenceImage: genericCatalogImage("Alinhamento", "🚗") },
  ];
  if (key === "DEMO_CONFEITARIA" || key === "CONFEITARIA" || key === "PADARIA") return [
    buildDemoCatalogItem("Bolo de chocolate 1 kg", "Bolos", "PRODUTO", 95, 42, 6, 2, "🎂", "BOLO-CHOC-1K"),
    buildDemoCatalogItem("Caixa com 12 brigadeiros", "Doces", "PRODUTO", 48, 19, 14, 5, "🍫", "BRIG-12"),
    buildDemoCatalogItem("Torta de morango", "Tortas", "PRODUTO", 120, 54, 4, 2, "🍓", "TORTA-MOR"),
    buildDemoCatalogItem("Decoração personalizada", "Adicionais", "SERVICO", 35, 0, 0, 0, "✨"),
  ];
  if (key === "DEMO_SALAO" || key === "SALAO_BELEZA") return [
    buildDemoCatalogItem("Corte feminino", "Cabelos", "SERVICO", 85, 0, 0, 0, "✂️"),
    buildDemoCatalogItem("Escova", "Cabelos", "SERVICO", 65, 0, 0, 0, "💇"),
    buildDemoCatalogItem("Manicure", "Unhas", "SERVICO", 42, 0, 0, 0, "💅"),
    buildDemoCatalogItem("Shampoo profissional", "Produtos", "PRODUTO", 79.9, 38, 9, 3, "🧴", "SHAMP-PRO"),
  ];
  if (key === "DEMO_ESTETICA" || key === "ESTETICA_AUTOMOTIVA") return [
    buildDemoCatalogItem("Lavagem técnica", "Lavagem", "SERVICO", 120, 0, 0, 0, "🚿"),
    buildDemoCatalogItem("Higienização interna", "Higienização", "SERVICO", 320, 0, 0, 0, "✨"),
    buildDemoCatalogItem("Polimento comercial", "Polimento", "SERVICO", 450, 0, 0, 0, "🚘"),
    buildDemoCatalogItem("Cera premium", "Produtos", "PRODUTO", 89, 44, 7, 3, "🧴", "CERA-PREM"),
  ];
  if (key === "DEMO_DELIVERY" || key === "DELIVERY") return [
    buildDemoCatalogItem("Hambúrguer artesanal", "Lanches", "PRODUTO", 32.9, 14, 20, 8, "🍔", "BURG-ART"),
    buildDemoCatalogItem("Pizza grande", "Pizzas", "PRODUTO", 69.9, 29, 12, 5, "🍕", "PIZ-GRANDE"),
    buildDemoCatalogItem("Marmita executiva", "Refeições", "PRODUTO", 29.9, 12, 18, 7, "🍱", "MARM-EXEC"),
    buildDemoCatalogItem("Refrigerante lata", "Bebidas", "PRODUTO", 7, 3.2, 28, 10, "🥤", "REFRI-LATA"),
  ];
  return [
    buildDemoCatalogItem("Produto de demonstração", "Geral", "PRODUTO", 59.9, 30, 10, 3, "📦", "DEMO-001"),
    buildDemoCatalogItem("Serviço de demonstração", "Serviços", "SERVICO", 120, 0, 0, 0, "🧰"),
  ];
}

function seedCompanyIdentity(_storeId: string): CompanyIdentity {
  return { displayName: "Minha empresa", logo: "", sidebarColor: "#0B1F3A", selectionColor: "#C89B3C" };
}

function seedCompanySettings(segment = "OUTRO"): CompanySettings {
  const key = segment.toUpperCase();
  const modules: Record<CompanyModule, boolean> = {
    APPOINTMENTS: ["OFICINA", "OFICINA_COMPLETA", "CONCESSIONARIA", "DEMO_CONFEITARIA", "CONFEITARIA", "DEMO_SALAO", "SALAO_BELEZA", "DEMO_ESTETICA", "ESTETICA_AUTOMOTIVA", "DEMO_DELIVERY", "DELIVERY"].includes(key),
    CATALOG: true,
    INVENTORY: true,
    CHECKLIST: ["OFICINA", "OFICINA_COMPLETA", "CONCESSIONARIA", "DEMO_ESTETICA", "ESTETICA_AUTOMOTIVA"].includes(key),
    ORDERS: ["OFICINA", "OFICINA_COMPLETA", "CONCESSIONARIA", "DEMO_ESTETICA", "ESTETICA_AUTOMOTIVA"].includes(key),
    QUOTES: key !== "DEMO_DELIVERY" && key !== "DELIVERY",
    ASSISTANT: true,
  };
  return {
    profile: "CUSTOM",
    modules,
    quoteDeliveryMode: "BOTH",
    quoteMessageTemplate: "PROFISSIONAL",
    generalMargin: 35,
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
  const keys = allTemplateKeys();
  return {
    checkin: keys.checkin,
    checkup: ["engine-oil", "brake-fluid", "coolant", "engine", "leaks", "front-brakes", "rear-brakes", "steering", "front-suspension", "rear-suspension", "shocks", "tire-wear", "battery", "road-test-after"],
    quality: ["quality-services", "quality-parts", "quality-leaks", "quality-panel", "quality-road-test"],
    checkout: ["road-test-final", "parts-shown", "services-explained", "warranty-explained", "values-explained", "vehicle-final", "objects-returned", "out-mileage", "customer-acceptance", "cleaning-done"],
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
        .map((item) => ({ ...item, id: uid(), categoryKey: group.key, category: group.label, value: "PENDENTE" as ItemValue, note: "", photos: [] })),
    ),
  }));
}

function createAttendance(settings: ChecklistSettings, sequence: number, storeId: string): Attendance {
  const now = new Date().toISOString();
  return {
    id: uid(), storeId, customerId: "", vehicleId: "", checkupType: "REVISAO",
    technicalReport: { complaint: "", diagnosis: "", tests: "", recommendation: "", conclusion: "" },
    code: `ATD-${String(sequence).padStart(4, "0")}`,
    createdAt: now, updatedAt: now, status: "CHECKIN",
    reception: { customer: "", phone: "", email: "", vehicle: "", plate: "", mileage: "", fuel: "", responsible: "", osNumber: "", technician: "" },
    stages: createStages(settings),
  };
}

function seedAppointmentSettings(segment = "OUTRO"): AppointmentSettings {
  const normalized = segment.toUpperCase();
  const professionals = isDeliverySegment(segment)
    ? ["Produção", "Entrega"]
    : normalized.includes("SALAO")
      ? ["Profissional 1", "Profissional 2"]
      : normalized.includes("OFICINA") || normalized.includes("CONCESSIONARIA") || normalized.includes("ESTETICA")
        ? ["Agenda principal", "Atendimento 2"]
        : ["Agenda principal"];
  return {
    startTime: "07:30",
    endTime: "18:00",
    slotMinutes: 30,
    defaultDurationMinutes: 60,
    professionals,
    workingDays: [1, 2, 3, 4, 5, 6],
    allowOverlap: false,
  };
}

function normalizeAppointmentSettings(value: Partial<AppointmentSettings> | undefined, segment = "OUTRO"): AppointmentSettings {
  const fallback = seedAppointmentSettings(segment);
  const slot = Number(value?.slotMinutes);
  const professionals = Array.from(new Set((value?.professionals ?? fallback.professionals).map((item) => item.trim()).filter(Boolean)));
  const workingDays = Array.from(new Set((value?.workingDays ?? fallback.workingDays).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort();
  return {
    startTime: /^\d{2}:\d{2}$/.test(value?.startTime ?? "") ? value!.startTime! : fallback.startTime,
    endTime: /^\d{2}:\d{2}$/.test(value?.endTime ?? "") ? value!.endTime! : fallback.endTime,
    slotMinutes: slot === 15 || slot === 60 ? slot : 30,
    defaultDurationMinutes: Math.max(15, Number(value?.defaultDurationMinutes) || fallback.defaultDurationMinutes),
    professionals: professionals.length ? professionals : fallback.professionals,
    workingDays: workingDays.length ? workingDays : fallback.workingDays,
    allowOverlap: value?.allowOverlap ?? fallback.allowOverlap,
  };
}

function seedStoreData(storeId: string, segment = "OUTRO"): StoreData {
  const hasAgenda = seedCompanySettings(segment).modules.APPOINTMENTS;
  const delivery = isDeliverySegment(segment);
  const appointmentSettings = seedAppointmentSettings(segment);
  const demoAppointments: Appointment[] = hasAgenda ? [{ id: uid(), storeId, customerId: null, customer: "Cliente demonstração", phone: "", title: delivery ? "Pedido demonstrativo" : "Atendimento demonstrativo", professional: appointmentSettings.professionals[0], startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), durationMinutes: appointmentSettings.defaultDurationMinutes, status: "AGENDADO", notes: "" }] : [];
  return {
    customers: [],
    vehicles: [],
    catalog: seedCatalog(segment),
    suppliers: seedSuppliers(segment),
    appointments: demoAppointments,
    appointmentSettings,
    appointmentBlocks: [],
    serviceTypes: seedServiceTypes(),
    checklistSettings: seedSettings(),
    companySettings: seedCompanySettings(segment),
    companyIdentity: seedCompanyIdentity(storeId),
    attendances: [],
    orders: [],
    quotes: [],
    knowledgeBase: [],
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
    responsible: attendance.reception.responsible || "",
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
    combinePartsLabor: false,
    items: [],
  };
}

function keyFor(storeId: string) {
  return `gerivo:prototype:v176:store:${storeId}`;
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
          checkin: Array.from(new Set([
            "mileage",
            "fuel",
            ...(parsed.checklistSettings.enabledItemKeys?.checkin ?? defaultSettings.enabledItemKeys.checkin).filter((key) => defaultSettings.enabledItemKeys.checkin.includes(key)),
          ])),
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
          APPOINTMENTS: parsed.companySettings.modules?.APPOINTMENTS ?? true,
          CATALOG: parsed.companySettings.modules?.CATALOG ?? true,
          INVENTORY: parsed.companySettings.modules?.INVENTORY ?? true,
          CHECKLIST: parsed.companySettings.modules?.CHECKLIST ?? true,
          ORDERS: parsed.companySettings.modules?.ORDERS ?? true,
          QUOTES: parsed.companySettings.modules?.QUOTES ?? true,
          ASSISTANT: parsed.companySettings.modules?.ASSISTANT ?? true,
        },
        quoteDeliveryMode: parsed.companySettings.quoteDeliveryMode ?? "BOTH",
        quoteMessageTemplate: parsed.companySettings.quoteMessageTemplate ?? "PROFISSIONAL",
        generalMargin: Math.max(0, Number(parsed.companySettings.generalMargin) || 35),
      }
    : defaultCompanySettings;
  const defaultIdentity = seedCompanyIdentity(storeId);
  const companyIdentity: CompanyIdentity = {
    displayName: parsed.companyIdentity?.displayName?.trim() || defaultIdentity.displayName,
    logo: parsed.companyIdentity?.logo ?? "",
    sidebarColor: /^#[0-9a-f]{6}$/i.test(parsed.companyIdentity?.sidebarColor ?? "")
      ? String(parsed.companyIdentity?.sidebarColor)
      : defaultIdentity.sidebarColor,
    selectionColor: /^#[0-9a-f]{6}$/i.test(parsed.companyIdentity?.selectionColor ?? "")
      ? String(parsed.companyIdentity?.selectionColor)
      : defaultIdentity.selectionColor,
  };
  const serviceTypes = (parsed.serviceTypes ?? seedServiceTypes()).map((item) => ({
    id: item.id || uid(),
    name: item.name?.trim() || "Tipo de serviço",
    active: item.active ?? true,
  }));
  const suppliers = (parsed.suppliers ?? seedSuppliers()).map((supplier) => ({
    id: supplier.id || uid(),
    name: supplier.name || "Fornecedor",
    document: supplier.document || "",
    phone: supplier.phone || "",
    email: supplier.email || "",
    paymentTerms: supplier.paymentTerms || "",
    leadTimeDays: Math.max(0, Number(supplier.leadTimeDays) || 0),
    active: supplier.active ?? true,
  }));
  const catalog = (parsed.catalog ?? seedCatalog()).map((item) => ({
    ...item,
    id: item.id || uid(),
    name: item.name || "Item sem nome",
    category: item.category || "Geral",
    kind: item.kind || "PRODUTO",
    price: Math.max(0, Number(item.price) || 0),
    cost: Math.max(0, Number(item.cost) || 0),
    marginMode: item.marginMode === "INDIVIDUAL" ? "INDIVIDUAL" as MarginMode : "GENERAL" as MarginMode,
    individualMargin: item.individualMargin == null ? null : Math.max(0, Number(item.individualMargin) || 0),
    image: item.image || "",
    referenceImage: item.referenceImage || "",
    sku: item.sku || "",
    stock: Math.max(0, Number(item.stock) || 0),
    minimumStock: Math.max(0, Number(item.minimumStock) || 0),
    supplierId: item.supplierId ?? null,
    active: item.active ?? true,
    standard: item.standard ?? item.kind === "SERVICO",
    serviceTypeId: item.serviceTypeId ?? (item.kind === "SERVICO" ? serviceTypes.find((type) => type.name.toLowerCase() === item.category.toLowerCase())?.id : undefined),
  }));
  const appointmentSettings = normalizeAppointmentSettings(parsed.appointmentSettings, "OUTRO");
  const appointmentBlocks: AppointmentBlock[] = (parsed.appointmentBlocks ?? []).filter((item) => item.storeId === storeId).map((item) => ({
    id: item.id || uid(),
    storeId,
    professional: item.professional?.trim() || null,
    startsAt: item.startsAt || new Date().toISOString(),
    endsAt: item.endsAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    reason: item.reason || "Horário bloqueado",
  }));
  const appointments: Appointment[] = (parsed.appointments ?? []).filter((item) => item.storeId === storeId).map((item) => ({
    ...item,
    id: item.id || uid(),
    storeId,
    customerId: item.customerId ?? null,
    customer: item.customer || "Cliente não informado",
    phone: item.phone || "",
    title: item.title || "Atendimento",
    professional: item.professional || appointmentSettings.professionals[0] || "Agenda principal",
    startsAt: item.startsAt || new Date().toISOString(),
    durationMinutes: Math.max(15, Number(item.durationMinutes) || 60),
    status: item.status || "AGENDADO",
    notes: item.notes || "",
  }));
  const attendances = (parsed.attendances ?? []).filter((attendance) => attendance.storeId === storeId).map((attendance) => {
    const freshStages = createStages(settings);
    const legacyItems = new Map(
      attendance.stages.flatMap((stage) => stage.items).map((item) => [item.key, item]),
    );
    const normalizedReception: Reception = {
      ...attendance.reception,
      mileage: attendance.reception?.mileage || "",
      fuel: legacyItems.has("fuel") ? (attendance.reception?.fuel || "") : "",
      responsible: ["petrick", "petrick maciel"].includes((attendance.reception?.responsible || "").trim().toLowerCase()) ? "" : (attendance.reception?.responsible || ""),
    };
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
          if (freshItem.key === "mileage") return { ...freshItem, value: normalizedReception.mileage ? "SIM" as ItemValue : "PENDENTE" as ItemValue };
          if (freshItem.key === "fuel") return { ...freshItem, value: normalizedReception.fuel !== "" ? "SIM" as ItemValue : "PENDENTE" as ItemValue };
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
      reception: normalizedReception,
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
      combinePartsLabor: Boolean(quote.combinePartsLabor),
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

  const knowledgeBase: KnowledgeEntry[] = (parsed.knowledgeBase ?? []).map((entry) => ({
    id: entry.id || uid(),
    title: entry.title || "Procedimento sem título",
    content: entry.content || "",
    tags: Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [],
    source: entry.source || "Cadastro manual",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  }));

  return { customers: linkedCustomers, vehicles: linkedVehicles, catalog, suppliers, appointments, appointmentSettings, appointmentBlocks, serviceTypes, checklistSettings: settings, companySettings, companyIdentity, attendances: linkedAttendances, orders, quotes, knowledgeBase };
}

function isolateStoreData(storeId: string, data: StoreData): StoreData {
  return {
    ...data,
    customers: data.customers.filter((item) => item.storeId === storeId),
    vehicles: data.vehicles.filter((item) => item.storeId === storeId),
    appointments: data.appointments.filter((item) => item.storeId === storeId),
    appointmentBlocks: data.appointmentBlocks.filter((item) => item.storeId === storeId),
    attendances: data.attendances.filter((item) => item.storeId === storeId),
    orders: data.orders.filter((item) => item.storeId === storeId),
    quotes: data.quotes.filter((item) => item.storeId === storeId),
  };
}

function loadStore(storeId: string, segment = "OUTRO"): StoreData {
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

    const previousRaw = localStorage.getItem(`gerivo:prototype:v17:store:${storeId}`) ?? localStorage.getItem(`gerivo:prototype:v16:store:${storeId}`) ?? localStorage.getItem(`gerivo:prototype:v14:store:${storeId}`) ?? localStorage.getItem(`gerivo:prototype:v13:store:${storeId}`);
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
          suppliers: legacyParsed.suppliers,
          appointments: [],
          appointmentSettings: legacyParsed.appointmentSettings,
          appointmentBlocks: [],
          checklistSettings: legacyParsed.checklistSettings,
          companySettings: legacyParsed.companySettings,
          companyIdentity: legacyParsed.companyIdentity,
          customers: [],
          vehicles: [],
          attendances: [],
          orders: [],
          quotes: [],
          knowledgeBase: legacyParsed.knowledgeBase,
        },
        storeId,
      );
      const isolated = isolateStoreData(storeId, safeConfiguration);
      localStorage.setItem(keyFor(storeId), JSON.stringify(isolated));
      return isolated;
    }

    const seeded = isolateStoreData(storeId, seedStoreData(storeId, segment));
    localStorage.setItem(keyFor(storeId), JSON.stringify(seeded));
    return seeded;
  } catch {
    return isolateStoreData(storeId, seedStoreData(storeId, segment));
  }
}

function saveStore(storeId: string, data: StoreData) {
  try {
    localStorage.setItem(keyFor(storeId), JSON.stringify(isolateStoreData(storeId, data)));
    return true;
  } catch {
    return false;
  }
}

function navigationKey(storeId: string) {
  return `gerivo:navigation:v171:${storeId}`;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fuelLevelIndex(value: string) {
  const map: Record<string, number> = { Reserva: 0, "1/4": 1, "1/2": 2, "3/4": 3, Cheio: 4 };
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(4, numeric)) : (map[value] ?? 2);
}

function fuelLevelLabel(value: string) {
  if (value === "" || value == null) return "Não informado";
  return ["Reserva", "1/4", "1/2", "3/4", "Cheio"][fuelLevelIndex(value)];
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
    AVARIA: "Avaria",
    INCOMPLETO: "Incompleto",
    NORMAL: "Normal",
    MAL_ODOR: "Mal odor",
    NAO_POSSUI: "Não possui",
    OK: "OK",
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
  if (["BOM", "SIM", "OK", "NORMAL"].includes(value)) return "good";
  if (["REGULAR", "AVARIADO", "AVARIA", "INCOMPLETO", "MAL_ODOR", "EXPRESSA", "OUTRO"].includes(value)) return "attention";
  if (["RUIM", "NAO"].includes(value)) return "bad";
  if (["NAO_SE_APLICA", "NAO_POSSUI"].includes(value)) return "neutral";
  return "pending";
}

function createReportHtml(store: Store, attendance: Attendance, mode: ReportMode = "FULL", config?: Partial<ReportConfig>) {
  const reportConfig: ReportConfig = {
    includeCustomer: config?.includeCustomer ?? true,
    stageIds: config?.stageIds ?? attendance.stages.map((stage) => stage.id),
    includeTechnicalReport: config?.includeTechnicalReport ?? true,
    includeGeneralPhotos: config?.includeGeneralPhotos ?? mode === "FULL",
    includeItemPhotos: config?.includeItemPhotos ?? mode === "FULL",
    includeSignatures: config?.includeSignatures ?? true,
  };
  const completedStages = attendance.stages.filter((stage) => stage.status === "CONCLUIDO");
  let stagesToRender = completedStages.length
    ? completedStages
    : attendance.stages.filter((stage) => stage.items.some((item) => item.value !== "PENDENTE"));
  stagesToRender = stagesToRender.filter((stage) => reportConfig.stageIds.includes(stage.id));

  const answeredItems = stagesToRender.flatMap((stage) =>
    stage.items.filter((item) => item.value !== "PENDENTE"),
  );
  const goodCount = answeredItems.filter((item) => ["BOM", "SIM", "OK", "NORMAL"].includes(item.value)).length;
  const attentionCount = answeredItems.filter((item) => ["REGULAR", "AVARIADO", "AVARIA", "INCOMPLETO", "MAL_ODOR", "EXPRESSA", "OUTRO"].includes(item.value)).length;
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

  const technicalReportHtml = reportConfig.includeTechnicalReport && attendance.technicalReport && (attendance.technicalReport.diagnosis || attendance.technicalReport.conclusion)
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
                  ${reportConfig.includeItemPhotos ? renderPhotoGallery(item.photos, `Fotos · ${item.label}`) : ""}`,
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
        ${reportConfig.includeGeneralPhotos ? renderPhotoGallery(stage.photos, `Fotos gerais · ${stage.label}`) : ""}
      </section>`;
    })
    .join("");

  const vehicleCardHtml = reportConfig.includeCustomer ? `<section class="vehicle-card">
      <div><small>Cliente</small><strong>${escapeHtml(attendance.reception.customer || "Não informado")}</strong></div>
      <div><small>WhatsApp</small><strong>${escapeHtml(attendance.reception.phone || "—")}</strong></div>
      <div><small>Veículo</small><strong>${escapeHtml(attendance.reception.vehicle || "Não informado")}</strong></div>
      <div><small>Placa</small><strong>${escapeHtml(attendance.reception.plate || "Não informada")}</strong></div>
      <div><small>KM</small><strong>${escapeHtml(attendance.reception.mileage || "—")}</strong></div>
      <div><small>Combustível</small><strong>${escapeHtml(fuelLevelLabel(attendance.reception.fuel))}</strong></div>
      <div><small>Responsável</small><strong>${escapeHtml(attendance.reception.responsible || "Não informado")}</strong></div>
      <div><small>Técnico</small><strong>${escapeHtml(attendance.reception.technician || "—")}</strong></div>
    </section>` : "";
  const signaturesHtml = reportConfig.includeSignatures ? `<section class="signatures"><div class="signature">Responsável pela inspeção</div><div class="signature">Cliente / responsável</div></section>` : "";
  const title = mode === "SUMMARY" ? "Resumo do checklist" : mode === "MODULAR" ? "Relatório modular do checklist" : "Relatório completo do checklist";
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
    ${vehicleCardHtml}
    <section class="summary">
      <div class="summary-card"><small>Itens avaliados</small><strong>${answeredItems.length}</strong></div>
      <div class="summary-card good"><small>Conformes</small><strong>${goodCount}</strong></div>
      <div class="summary-card attention"><small>Atenção</small><strong>${attentionCount}</strong></div>
      <div class="summary-card bad"><small>Reprovados</small><strong>${badCount}</strong></div>
    </section>
    ${technicalReportHtml}
    ${stageSections || '<div class="all-good">Nenhuma etapa concluída ou preenchida para gerar o relatório.</div>'}
    ${signaturesHtml}
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
  return `Olá! Segue o resumo do atendimento ${attendance.code}.\n\nEmpresa: ${store.companyName}\nCliente: ${attendance.reception.customer || "Não informado"}\nVeículo: ${attendance.reception.vehicle || "Não informado"}\nPlaca: ${attendance.reception.plate || "Não informada"}\n\n${summary}\n\nSistema desenvolvido com Gerivo.`;
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
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h3M13 14h3M8 17h3"/></svg>;
  if (name === "box") return <svg {...common}><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>;
  if (name === "sparkle") return <svg {...common}><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m18 13 .7 2.3L21 16l-2.3.7L18 19l-.7-2.3L15 16l2.3-.7L18 13Z"/><path d="m6 14 .8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8L6 14Z"/></svg>;
  if (name === "chart") return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/><path d="M2 20h21"/></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === "truck") return <svg {...common}><path d="M3 6h11v11H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
  if (name === "image") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="m3 17 5-5 4 4 3-3 6 5"/></svg>;
  return null;
}

export default function Home() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [storeId, setStoreId] = useState(EMPTY_STORE_ID);
  const [data, setData] = useState<StoreData>(() => seedStoreData(EMPTY_STORE_ID));
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
  const [userProfile, setUserProfile] = useState<UserProfile>({ preferredName: "Usuário", username: "", phone: "", email: "", photo: "" });
  const [platformRole, setPlatformRole] = useState<"USER" | "MASTER">("USER");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const saveToastTimer = useRef<number | null>(null);
  const pendingSaveTimer = useRef<number | null>(null);
  const loadedStoreIdRef = useRef(EMPTY_STORE_ID);
  const hasSavedOnce = useRef(false);
  const latestDataRef = useRef(data);
  const authenticatedUserIdRef = useRef<string | null>(null);
  const currentAccessRole = stores.find((store) => store.id === storeId)?.role ?? "MEMBER";
  const canManageCompany = ["MASTER", "ADMIN", "MANAGER"].includes(currentAccessRole);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 800px)").matches;
    setSidebarCollapsed(isMobile || localStorage.getItem("gerivo:sidebar-collapsed") === "1");

    let mounted = true;

    async function initializeAuth() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(sessionData.session);
      if (sessionData.session?.user) {
        authenticatedUserIdRef.current = sessionData.session.user.id;
        await loadAccessContext(sessionData.session.user.id);
      } else {
        setAuthLoading(false);
      }
    }

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, nextSession: any) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthError("");
      if (nextSession?.user) {
        const nextUserId = nextSession.user.id;
        if (authenticatedUserIdRef.current !== nextUserId) {
          authenticatedUserIdRef.current = nextUserId;
          window.setTimeout(() => {
            if (mounted) loadAccessContext(nextUserId);
          }, 0);
        }
      } else {
        authenticatedUserIdRef.current = null;
        setStores([]);
        setNeedsOnboarding(false);
        setStoreId(EMPTY_STORE_ID);
        loadedStoreIdRef.current = EMPTY_STORE_ID;
        setData(seedStoreData(EMPTY_STORE_ID));
        setReady(false);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function loadAccessContext(userId: string) {
    setAuthLoading(true);
    setAuthError("");

    const [profileResult, membershipsResult] = await Promise.all([
      supabase.from("profiles").select("full_name, username, phone, email, avatar_url, platform_role").eq("id", userId).maybeSingle(),
      supabase.from("store_members").select("store_id, role").eq("user_id", userId).eq("active", true),
    ]);

    if (profileResult.data) {
      setUserProfile({
        preferredName: profileResult.data.full_name || profileResult.data.username || profileResult.data.email || "Usuário",
        username: profileResult.data.username || "",
        phone: profileResult.data.phone || "",
        email: profileResult.data.email || "",
        photo: profileResult.data.avatar_url || "",
      });
    }

    if (membershipsResult.error) {
      setAuthError("Não foi possível carregar as empresas vinculadas ao usuário.");
      setAuthLoading(false);
      return;
    }

    const memberships = membershipsResult.data ?? [];
    const platformMaster = profileResult.data?.platform_role === "MASTER";
    setPlatformRole(platformMaster ? "MASTER" : "USER");

    if (platformMaster) {
      const { data: masterStoreRows, error: masterStoresError } = await supabase
        .from("stores")
        .select("id, public_code, name, company_id, companies(name, segment)")
        .order("created_at", { ascending: true });

      if (masterStoresError) {
        setAuthError("Não foi possível carregar as empresas da plataforma.");
        setAuthLoading(false);
        return;
      }

      const masterStores: Store[] = (masterStoreRows ?? []).map((row: any) => {
        const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
        return {
          id: row.id,
          publicCode: Number(row.public_code) || 0,
          name: row.name,
          companyId: row.company_id,
          companyName: company?.name || row.name,
          segment: company?.segment || "OUTRO",
          role: "MASTER",
        };
      });

      if (!masterStores.length) {
        setStores([]);
        setNeedsOnboarding(true);
        setAuthLoading(false);
        return;
      }

      setStores(masterStores);
      setNeedsOnboarding(false);
      const savedStoreId = localStorage.getItem("gerivo:active-store");
      const selected = masterStores.find((item) => item.id === savedStoreId) ?? masterStores[0];
      await activateStore(selected, false, true);
      setReady(true);
      setAuthLoading(false);
      return;
    }

    if (!memberships.length) {
      setStores([]);
      setNeedsOnboarding(true);
      setAuthLoading(false);
      return;
    }

    const storeIds = memberships.map((item: any) => item.store_id);
    const { data: storeRows, error: storesError } = await supabase
      .from("stores")
      .select("id, public_code, name, company_id, companies(name, segment)")
      .in("id", storeIds)
      .eq("active", true);

    if (storesError) {
      setAuthError("Não foi possível carregar as lojas autorizadas.");
      setAuthLoading(false);
      return;
    }

    const nextStores: Store[] = (storeRows ?? []).map((row: any) => {
      const membership = memberships.find((item: any) => item.store_id === row.id);
      const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
      return {
        id: row.id,
        publicCode: Number(row.public_code) || 0,
        name: row.name,
        companyId: row.company_id,
        companyName: company?.name || row.name,
        segment: company?.segment || "OUTRO",
        role: membership?.role || "MEMBER",
      };
    });

    if (!nextStores.length) {
      setNeedsOnboarding(true);
      setAuthLoading(false);
      return;
    }

    setStores(nextStores);
    setNeedsOnboarding(false);
    const savedStoreId = localStorage.getItem("gerivo:active-store");
    const selected = nextStores.find((item) => item.id === savedStoreId) ?? nextStores[0];
    await activateStore(selected, false, true);
    setReady(true);
    setAuthLoading(false);
  }

  async function loadCloudSettings(targetStore: Store, localData: StoreData) {
    const { data: settings } = await supabase
      .from("store_settings")
      .select("display_name, logo_value, sidebar_color, selection_color, company_profile, modules, quote_delivery_mode, quote_message_template, checklist_name, checklist_enabled_keys, general_margin")
      .eq("store_id", targetStore.id)
      .maybeSingle();

    if (!settings) return localData;

    return {
      ...localData,
      companyIdentity: {
        displayName: settings.display_name || targetStore.name,
        logo: settings.logo_value || "",
        sidebarColor: settings.sidebar_color || "#0B1F3A",
        selectionColor: settings.selection_color || localData.companyIdentity.selectionColor || "#C89B3C",
      },
      companySettings: {
        ...localData.companySettings,
        profile: settings.company_profile || localData.companySettings.profile,
        modules: { ...localData.companySettings.modules, ...(settings.modules || {}) },
        quoteDeliveryMode: settings.quote_delivery_mode || localData.companySettings.quoteDeliveryMode,
        quoteMessageTemplate: settings.quote_message_template || localData.companySettings.quoteMessageTemplate,
        generalMargin: Math.max(0, Number(settings.general_margin) || localData.companySettings.generalMargin),
      },
      checklistSettings: {
        ...localData.checklistSettings,
        name: settings.checklist_name || localData.checklistSettings.name,
        enabledItemKeys: (() => {
          const cloudKeys =
            settings.checklist_enabled_keys && Object.keys(settings.checklist_enabled_keys).length
              ? settings.checklist_enabled_keys as Record<StageId, string[]>
              : localData.checklistSettings.enabledItemKeys;
          return {
            ...localData.checklistSettings.enabledItemKeys,
            ...cloudKeys,
            checkin: Array.from(new Set(["mileage", "fuel", ...(cloudKeys.checkin || localData.checklistSettings.enabledItemKeys.checkin)])),
          };
        })(),
      },
    } as StoreData;
  }

  async function activateStore(targetStore: Store, showToast = true, restoreNavigation = false) {
    if (pendingSaveTimer.current && loadedStoreIdRef.current !== EMPTY_STORE_ID) {
      window.clearTimeout(pendingSaveTimer.current);
      saveStore(loadedStoreIdRef.current, latestDataRef.current);
    }
    const localData = loadStore(targetStore.id, targetStore.segment);
    const nextData = await loadCloudSettings(targetStore, localData);
    loadedStoreIdRef.current = targetStore.id;
    hasSavedOnce.current = false;
    setStoreId(targetStore.id);
    localStorage.setItem("gerivo:active-store", targetStore.id);
    setData(nextData);
    const savedNavigation = restoreNavigation ? (() => {
      try { return JSON.parse(sessionStorage.getItem(navigationKey(targetStore.id)) || "null"); } catch { return null; }
    })() : null;
    const restoredAttendanceId = savedNavigation?.activeAttendanceId && nextData.attendances.some((item) => item.id === savedNavigation.activeAttendanceId) ? savedNavigation.activeAttendanceId : null;
    const restoredOrderId = savedNavigation?.activeOrderId && nextData.orders.some((item) => item.id === savedNavigation.activeOrderId) ? savedNavigation.activeOrderId : null;
    const restoredQuoteId = savedNavigation?.activeQuoteId && nextData.quotes.some((item) => item.id === savedNavigation.activeQuoteId) ? savedNavigation.activeQuoteId : null;
    const restoredPage = NAV.some((item) => item.id === savedNavigation?.page) ? savedNavigation.page as Page : "dashboard";
    setActiveAttendanceId(restoredAttendanceId);
    setActiveOrderId(restoredOrderId);
    setActiveQuoteId(restoredQuoteId);
    setActiveStageId(savedNavigation?.activeStageId || "checkin");
    setStoreSwitcherOpen(false);
    setMobileMenuOpen(false);
    setPage(restoreNavigation ? restoredPage : "dashboard");
    if (showToast) setToast(`Empresa alterada para ${targetStore.companyName}`);
  }

  async function syncStoreSettings(
    companySettings: CompanySettings,
    checklistSettings: ChecklistSettings,
    companyIdentity: CompanyIdentity,
  ) {
    const targetStore = stores.find((item) => item.id === storeId);
    if (!targetStore || !session?.user) return;
    const { error } = await supabase.from("store_settings").upsert({
      store_id: targetStore.id,
      company_id: targetStore.companyId,
      display_name: companyIdentity.displayName || targetStore.name,
      logo_value: companyIdentity.logo || null,
      sidebar_color: companyIdentity.sidebarColor || "#0B1F3A",
      selection_color: companyIdentity.selectionColor || "#C89B3C",
      company_profile: companySettings.profile,
      modules: companySettings.modules,
      quote_delivery_mode: companySettings.quoteDeliveryMode,
      quote_message_template: companySettings.quoteMessageTemplate,
      checklist_name: checklistSettings.name,
      checklist_enabled_keys: checklistSettings.enabledItemKeys,
      general_margin: companySettings.generalMargin,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "store_id" });

    if (error) throw error;
  }

  useEffect(() => {
    latestDataRef.current = data;
    if (!ready || loadedStoreIdRef.current === EMPTY_STORE_ID) return;
    const saved = saveStore(loadedStoreIdRef.current, data);
    if (!saved) {
      setToast("Não foi possível salvar. Remova fotos muito grandes e tente novamente.");
      return;
    }
    if (pendingSaveTimer.current) window.clearTimeout(pendingSaveTimer.current);
    if (hasSavedOnce.current) {
      pendingSaveTimer.current = window.setTimeout(() => {
        setToast("Alterações salvas automaticamente");
        if (saveToastTimer.current) window.clearTimeout(saveToastTimer.current);
        saveToastTimer.current = window.setTimeout(() => setToast(""), 1800);
      }, 420);
    } else {
      hasSavedOnce.current = true;
    }
    return () => {
      if (pendingSaveTimer.current) window.clearTimeout(pendingSaveTimer.current);
    };
  }, [data, ready]);

  useEffect(() => {
    if (!ready || storeId === EMPTY_STORE_ID) return;
    sessionStorage.setItem(navigationKey(storeId), JSON.stringify({ page, activeAttendanceId, activeOrderId, activeQuoteId, activeStageId }));
  }, [ready, storeId, page, activeAttendanceId, activeOrderId, activeQuoteId, activeStageId]);

  useEffect(() => {
    const flush = () => {
      if (loadedStoreIdRef.current !== EMPTY_STORE_ID) saveStore(loadedStoreIdRef.current, latestDataRef.current);
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const currentStore = stores.find((store) => store.id === storeId) ?? EMPTY_STORE;
  const brandedStore: Store = { ...currentStore, name: data.companyIdentity.displayName || currentStore.name };
  const activeAttendance = data.attendances.find((item) => item.id === activeAttendanceId) ?? null;
  const activeOrder = data.orders.find((item) => item.id === activeOrderId) ?? null;
  const activeQuote = data.quotes.find((item) => item.id === activeQuoteId) ?? null;
  const visibleNav = NAV.filter(
    (item) =>
      !item.hidden &&
      (!item.masterOnly || platformRole === "MASTER") &&
      (item.id !== "management" || canManageCompany) &&
      (!item.module || data.companySettings.modules[item.module]),
  );

  async function login(identifier: string, password: string) {
    setAuthError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token || !payload.refresh_token) {
      const message = payload.error || "Usuário ou senha inválidos.";
      setAuthError(message);
      throw new Error(message);
    }
    const { error } = await supabase.auth.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token });
    if (error) {
      setAuthError("Não foi possível iniciar a sessão.");
      throw error;
    }
  }


  async function recoverPassword(email: string) {
    setAuthError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      const message = "Informe o e-mail de recuperação.";
      setAuthError(message);
      throw new Error(message);
    }
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
    if (error) {
      setAuthError("Não foi possível enviar a recuperação de senha.");
      throw error;
    }
    setAuthError("Enviamos as instruções de recuperação para o e-mail informado.");
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function bootstrapCompany(companyName: string, storeName: string, segment: string, groupId = "", groupName = "", document = "") {
    setAuthError("");
    if (!session?.access_token || !session.user) {
      const message = "Sua sessão expirou. Entre novamente no Gerivo.";
      setAuthError(message);
      throw new Error(message);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("/api/master/companies/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: companyName,
          storeName: storeName || companyName,
          segment,
          groupId,
          groupName,
          document,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.store_id) {
        const message = payload.error || "Não foi possível criar a empresa.";
        setAuthError(message);
        throw new Error(message);
      }

      localStorage.setItem("gerivo:active-store", payload.store_id);
      await loadAccessContext(session.user.id);
      setPage("master");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        const message = "A criação demorou mais que o esperado. Verifique a conexão e tente novamente.";
        setAuthError(message);
        throw new Error(message);
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function changeStore(nextId: string) {
    if (nextId === loadedStoreIdRef.current) {
      setStoreSwitcherOpen(false);
      setMobileMenuOpen(false);
      return;
    }
    const targetStore = stores.find((item) => item.id === nextId);
    if (targetStore) await activateStore(targetStore);
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
    if (loadedStoreIdRef.current !== EMPTY_STORE_ID) saveStore(loadedStoreIdRef.current, latestDataRef.current);
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
      responsible: payload.responsible.trim(),
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
  const selectionTheme = selectionThemeVariables(data.companyIdentity.selectionColor);
  const sidebarUsesDarkAssets = sidebarIsLight(data.companyIdentity.sidebarColor);

  if (authLoading) return <SystemLoading />;
  if (!session) return <Login onSubmit={login} onRecover={recoverPassword} error={authError} />;
  if (needsOnboarding) return platformRole === "MASTER" ? <CompanyOnboarding onSubmit={bootstrapCompany} onLogout={logout} error={authError} /> : <NoAccess onLogout={logout} />;
  if (!ready || !stores.length) return <SystemLoading />;

  return (
    <main style={{ ...sidebarTheme, ...selectionTheme } as any} className={`${sidebarCollapsed ? "shell sidebar-collapsed" : "shell"} ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
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
            .filter((item) => !["management", "master"].includes(item.id))
            .map((item) => (
              <button
                key={item.id}
                title={sidebarCollapsed ? item.label : undefined}
                className={page === item.id ? "nav active" : "nav"}
                onClick={() => navigate(item.id)}
              >
                <i><PremiumIcon name={item.icon} size={17} /></i>
                <span>{navigationLabel(item, currentStore.segment)}</span>
              </button>
            ))}

          {visibleNav.some((item) => item.id === "management" || item.id === "master") && (
            <>
              <small className="nav-section-title management-title">ADMINISTRAÇÃO</small>
              {visibleNav
                .filter((item) => item.id === "management" || item.id === "master")
                .map((item) => (
                  <button
                    key={item.id}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={page === item.id || (item.id === "management" && (page === "catalog" || page === "inventory")) ? "nav active" : "nav"}
                    onClick={() => navigate(item.id)}
                  >
                    <i><PremiumIcon name={item.icon} size={17} /></i>
                    <span>{navigationLabel(item, currentStore.segment)}</span>
                  </button>
                ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {data.companyIdentity.logo && <div className="gerivo-technology"><img src={sidebarUsesDarkAssets ? "/gerivo-mark.png" : "/gerivo-mark-light.png"} alt="" /><span>Tecnologia Gerivo</span></div>}
          <button type="button" className="current-store" title={sidebarCollapsed ? `Empresa: ${brandedStore.companyName}` : undefined} onClick={() => setStoreSwitcherOpen(true)}>
            <PremiumIcon name="store" size={17} />
            <div>
              <small>EMPRESA ATUAL</small>
              <strong>{brandedStore.companyName}</strong>
            </div>
            <PremiumIcon name="chevron" size={15} />
          </button>

          <button type="button" className="user user-profile-button" title={sidebarCollapsed ? `Perfil: ${userProfile.preferredName || "Usuário"}` : undefined} onClick={() => setProfileOpen(true)}>
            <b>{userProfile.photo ? <img src={userProfile.photo} alt="Foto do perfil" /> : <PremiumIcon name="user" size={17} />}</b>
            <div>
              <strong>{userProfile.preferredName || "Usuário"}</strong>
              <small>{currentAccessRole} · Editar perfil</small>
            </div>
            <PremiumIcon name="chevron" size={14} />
          </button>

          <button
            className="logout"
            title={sidebarCollapsed ? "Sair" : undefined}
            onClick={logout}
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
            <div><h1>{navigationLabel(NAV.find((item) => item.id === page) ?? NAV[0], currentStore.segment)}</h1></div>
          </div>

          <div className="top-actions">
            {page === "appointments" ? (
              <button className="primary" onClick={() => window.dispatchEvent(new CustomEvent("gerivo:new-appointment"))}>{isDeliverySegment(currentStore.segment) ? "+ Novo pedido" : "+ Novo agendamento"}</button>
            ) : page === "checklist" && !activeAttendance ? (
              <button className="primary" onClick={() => openStartFlow("CHECKLIST")}>+ Nova recepção</button>
            ) : page === "orders" && !activeOrder ? (
              <button className="primary" onClick={createStandaloneOrder}>+ Nova O.S.</button>
            ) : page === "quotes" && !activeQuote ? (
              <button className="primary" onClick={createStandaloneQuote}>+ Novo orçamento</button>
            ) : page === "catalog" ? (
              <button className="primary" onClick={() => window.dispatchEvent(new CustomEvent("gerivo:new-catalog-item"))}>+ Novo item</button>
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
              onOpenAppointments={() => setPage("appointments")}
              onOpenOrders={() => { setActiveAttendanceId(null); setPage("orders"); }}
              onOpenQuotes={() => { setActiveAttendanceId(null); setPage("quotes"); }}
              companySettings={data.companySettings}
            />
          )}

          {page === "appointments" && (
            <AppointmentsPage
              appointments={data.appointments}
              appointmentSettings={data.appointmentSettings}
              appointmentBlocks={data.appointmentBlocks}
              customers={data.customers}
              storeId={storeId}
              mode={isDeliverySegment(currentStore.segment) ? "DELIVERY" : "AGENDA"}
              onAppointmentsChange={(appointments) => setData({ ...data, appointments })}
              onSettingsChange={(appointmentSettings) => setData({ ...data, appointmentSettings })}
              onBlocksChange={(appointmentBlocks) => setData({ ...data, appointmentBlocks })}
            />
          )}

          {page === "assistant" && (
            <AssistantPage store={brandedStore} data={data} />
          )}

          {page === "bi" && (
            <BusinessIntelligencePage data={data} />
          )}

          {page === "messages" && (
            <MessageCenterPage store={brandedStore} />
          )}

          {page === "knowledge" && (
            <KnowledgeBasePage
              entries={data.knowledgeBase}
              onChange={(knowledgeBase) => setData({ ...data, knowledgeBase })}
            />
          )}

          {page === "management" && (
            <ManagementHub
              store={brandedStore}
              data={data}
              isPlatformMaster={platformRole === "MASTER"}
              sessionAccessToken={session?.access_token || ""}
              onOpenCatalog={() => setPage("catalog")}
              onOpenInventory={() => setPage("inventory")}
              onOpenIdentity={() => { setSettingsTab("IDENTITY"); setSettingsOpen(true); }}
              onOpenPricing={() => { setSettingsTab("PRICING"); setSettingsOpen(true); }}
              onOpenModules={() => { setSettingsTab("MODULES"); setSettingsOpen(true); }}
              onOpenChecklist={() => { setSettingsTab("CHECKLIST"); setSettingsOpen(true); }}
              onOpenKnowledge={() => setPage("knowledge")}
              onOpenMessages={() => setPage("messages")}
              onOpenBi={() => setPage("bi")}
            />
          )}

          {page === "catalog" && (
            <Catalog
              store={brandedStore}
              items={data.catalog}
              suppliers={data.suppliers}
              generalMargin={data.companySettings.generalMargin}
              serviceTypes={data.serviceTypes}
              onChange={(catalog) => setData({ ...data, catalog })}
              onServiceTypesChange={(serviceTypes) => setData({ ...data, serviceTypes })}
            />
          )}

          {page === "inventory" && (
            <InventoryPage
              items={data.catalog}
              suppliers={data.suppliers}
              generalMargin={data.companySettings.generalMargin}
              onItemsChange={(catalog) => setData({ ...data, catalog })}
              onSuppliersChange={(suppliers) => setData({ ...data, suppliers })}
            />
          )}

          {page === "master" && platformRole === "MASTER" && (
            <MasterCommercialPage stores={stores} currentStore={brandedStore} onCreateCompany={(input) => bootstrapCompany(input.companyName, input.storeName, input.segment, input.groupId, input.groupName, input.document)} />
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
            <small>Configurações online; dados operacionais ainda permanecem neste dispositivo.</small>
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
          defaultResponsible=""
          onClose={() => setStartFlow({ ...startFlow, open: false })}
          onComplete={completeStartFlow}
        />
      )}

      {storeSwitcherOpen && (
        <StoreSwitcherModal
          stores={stores}
          currentStoreId={storeId}
          onClose={() => setStoreSwitcherOpen(false)}
          onSelect={changeStore}
        />
      )}

      {profileOpen && (
        <UserProfileModal
          profile={userProfile}
          onClose={() => setProfileOpen(false)}
          onSave={async (profile) => {
            setUserProfile(profile);
            if (session?.user) {
              const { error } = await supabase.from("profiles").update({
                full_name: profile.preferredName,
                phone: profile.phone || null,
                avatar_url: profile.photo || null,
                updated_at: new Date().toISOString(),
              }).eq("id", session.user.id);
              if (error) window.alert(`Não foi possível salvar o perfil: ${error.message}`);
            }
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
          isPlatformMaster={platformRole === "MASTER"}
          initialTab={settingsTab}
          onClose={() => setSettingsOpen(false)}
          onSave={async (companySettings, checklistSettings, companyIdentity) => {
            try {
              await syncStoreSettings(companySettings, checklistSettings, companyIdentity);
              setData({ ...data, companySettings, checklistSettings, companyIdentity });
              const currentNav = NAV.find((item) => item.id === page);
              if (currentNav?.module && !companySettings.modules[currentNav.module]) {
                setPage("dashboard");
              }
              setSettingsOpen(false);
              setToast("Configurações sincronizadas com o Gerivo Online");
            } catch (error: any) {
              window.alert(`Não foi possível sincronizar as configurações: ${error.message}`);
            }
          }}
        />
      )}
    </main>
  );
}

function SystemLoading() {
  return (
    <main className="system-loading">
      <img src="/gerivo-logo.png" alt="Gerivo" />
      <span>Preparando seu ambiente...</span>
    </main>
  );
}

function Login({
  onSubmit,
  onRecover,
  error,
}: {
  onSubmit: (identifier: string, password: string) => Promise<void>;
  onRecover: (email: string) => Promise<void>;
  error: string;
}) {
  const [show, setShow] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [clientAccess, setClientAccess] = useState(false);

  useEffect(() => {
    setClientAccess(window.location.pathname.startsWith("/cliente"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try { await onSubmit(identifier.trim(), password); } catch { setSubmitting(false); }
  }

  async function recover() {
    setSubmitting(true);
    try {
      await onRecover(recoveryEmail);
      setRecovering(false);
    } catch { /* mensagem exibida no formulário */ }
    finally { setSubmitting(false); }
  }

  const loginForm = (
      <form className="public-login-card" id="acesso" onSubmit={submit}>
          <div className="public-login-heading"><small>JÁ É CLIENTE?</small><h2>{recovering ? "Recuperar acesso" : "Entre no Gerivo"}</h2><p>{recovering ? "Informe o e-mail cadastrado para receber as instruções." : "Acesse sua empresa com usuário ou e-mail."}</p></div>
          {recovering ? (
            <label>E-mail de recuperação
              <input required autoComplete="email" type="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} placeholder="seuemail@empresa.com.br" />
            </label>
          ) : (
            <>
              <label>Usuário ou e-mail
                <input required autoCapitalize="none" autoComplete="username" type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Digite seu usuário ou e-mail" />
              </label>
              <label>Senha
                <div className="password">
                  <input required autoComplete="current-password" type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} title={show ? "Ocultar senha" : "Mostrar senha"}><PremiumIcon name={show ? "eyeOff" : "eye"} size={19} /></button>
                </div>
              </label>
            </>
          )}

          {error && <div className={error.startsWith("Enviamos") ? "auth-success" : "auth-error"}>{error}</div>}

          {recovering ? (
            <div className="login-recovery-actions"><button type="button" className="outline" onClick={() => setRecovering(false)}>Voltar</button><button type="button" className="primary" disabled={submitting} onClick={recover}>{submitting ? "Enviando..." : "Enviar recuperação"}</button></div>
          ) : (
            <><button className="primary login-button" disabled={submitting}>{submitting ? "Entrando..." : "Entrar no Gerivo"}</button><button type="button" className="login-link" onClick={() => { setRecovering(true); setRecoveryEmail(identifier.includes("@") ? identifier : ""); }}>Esqueci minha senha ou usuário</button></>
          )}
          <div className="public-new-client"><span>Ainda não utiliza o Gerivo?</span><a href="#recursos">Conheça a plataforma</a></div>
      </form>
  );

  if (clientAccess) return (
    <main className="client-access-page">
      <header><a href="/"><img src="/gerivo-logo-light.png" alt="Gerivo" /></a><a href="/">← Voltar ao site</a></header>
      <section><div className="client-access-copy"><small>ACESSO DO CLIENTE</small><h1>Entre no Gerivo</h1><p>Acesse a empresa e a unidade vinculadas ao seu usuário.</p></div>{loginForm}</section>
    </main>
  );

  return (
    <main className="public-site">
      <header className="public-header">
        <a className="public-logo" href="#inicio" aria-label="Gerivo - início"><img src="/gerivo-logo-light.png" alt="Gerivo" /><span>Gestão que gera resultados</span></a>
        <a className="public-client-button" href="/cliente">Acesso do cliente</a>
      </header>

      <section className="public-hero" id="inicio">
        <div className="public-hero-copy">
          <small>GESTÃO INTELIGENTE PARA EMPRESAS</small>
          <h1>Controle completo.<br />Decisões melhores.</h1>
          <p>Organize clientes, serviços, vendas, estoque, atendimentos e indicadores em uma plataforma modular criada para gerar mais controle, tempo e resultado.</p>
          <div className="public-hero-actions"><a className="public-primary-link" href="#recursos">Conheça o Gerivo</a><a className="public-secondary-link" href="#planos">Conheça nossos planos</a></div>

        </div>

        <figure className="public-hero-product"><img src="/gerivo-showcase.webp" alt="Gerivo em computador e celular" /><figcaption>Operação conectada no computador e no celular.</figcaption></figure>
      </section>

      <section className="public-brand-showcase" aria-label="Visão geral do Gerivo">
        <div className="public-brand-showcase-copy">
          <small>GESTÃO QUE GERA RESULTADOS</small>
          <h2>Uma operação mais clara, conectada e profissional.</h2>
          <p>O Gerivo reúne a rotina da empresa em um único ambiente, com experiência consistente no computador e no celular.</p>
          <div><span>Mais controle</span><span>Mais tempo</span><span>Mais resultado</span></div>
        </div>
        <figure><img src="/gerivo-showcase.webp" alt="Gerivo em computador e celular" /></figure>
      </section>

      <section className="public-section" id="recursos">
        <div className="public-section-heading"><small>CONHEÇA NOSSA FERRAMENTA</small><h2>Uma base única, módulos para cada operação</h2><p>O Gerivo adapta os recursos liberados ao segmento, ao plano e às permissões de cada usuário.</p></div>
        <div className="public-feature-grid">
          <article><span><PremiumIcon name="calendar" size={25} /></span><h3>Agenda e atendimento</h3><p>Organize clientes, horários, pedidos, recepções e equipes.</p></article>
          <article><span><PremiumIcon name="layers" size={25} /></span><h3>Catálogo e estoque</h3><p>Cadastre produtos, serviços, imagens, margens, fornecedores e saldos.</p></article>
          <article><span><PremiumIcon name="file" size={25} /></span><h3>Orçamentos e ordens</h3><p>Centralize propostas, aprovações e execução dos serviços.</p></article>
          <article><span><PremiumIcon name="clipboard" size={25} /></span><h3>Checklists profissionais</h3><p>Registre condições, fotos, observações e relatórios modulares.</p></article>
          <article><span><PremiumIcon name="sparkle" size={25} /></span><h3>Assistente Gerivo</h3><p>Consulte indicadores e transforme dados da empresa em decisões.</p></article>
          <article><span><PremiumIcon name="store" size={25} /></span><h3>Identidade própria</h3><p>Logo, cores, empresas, unidades, usuários e permissões configuráveis.</p></article>
        </div>
      </section>

      <section className="public-section public-plans-section" id="planos">
        <div className="public-section-heading"><small>PLANOS GERIVO</small><h2>Comece com o que sua empresa precisa</h2><p>Módulos e limites são definidos conforme a contratação.</p></div>
        <div className="public-plan-grid">
          <article><small>ESSENCIAL</small><h3>Gerivo Essencial</h3><strong>R$ 119<em>/mês</em></strong><p>1 empresa · 1 unidade · 3 usuários</p><ul><li>Painel e clientes</li><li>Catálogo e orçamentos</li><li>Agenda básica</li></ul><a href="mailto:gerivo.sistemas@gmail.com?subject=Interesse%20no%20Gerivo%20Essencial">Tenho interesse</a></article>
          <article className="recommended"><b>Mais indicado</b><small>GESTÃO</small><h3>Gerivo Gestão</h3><strong>R$ 219<em>/mês</em></strong><p>1 empresa · até 2 unidades · 8 usuários</p><ul><li>Tudo do Essencial</li><li>O.S., estoque e compras</li><li>Indicadores e satisfação</li></ul><a href="mailto:gerivo.sistemas@gmail.com?subject=Interesse%20no%20Gerivo%20Gest%C3%A3o">Tenho interesse</a></article>
          <article><small>PROFISSIONAL</small><h3>Gerivo Profissional</h3><strong>R$ 349<em>/mês</em></strong><p>Até 2 empresas · 5 unidades · 20 usuários</p><ul><li>Indicadores gerenciais</li><li>Automações e auditoria</li><li>Assistente Gerivo inicial</li></ul><a href="mailto:gerivo.sistemas@gmail.com?subject=Interesse%20no%20Gerivo%20Profissional">Tenho interesse</a></article>
          <article><small>ENTERPRISE</small><h3>Gerivo Enterprise</h3><strong>R$ 599<em>/mês</em></strong><p>Estrutura e limites personalizados</p><ul><li>Múltiplas empresas</li><li>Implantação acompanhada</li><li>Integrações e suporte prioritário</li></ul><a href="mailto:gerivo.sistemas@gmail.com?subject=Interesse%20no%20Gerivo%20Enterprise">Solicitar proposta</a></article>
        </div>
      </section>

      <section className="public-contact public-contact-form" id="contato"><div><small>CONTATE-NOS</small><h2>Vamos entender a sua operação</h2><p>Preencha os dados e envie a solicitação para a equipe Gerivo.</p></div><form action="mailto:gerivo.sistemas@gmail.com" method="post" encType="text/plain"><input name="nome" placeholder="Nome" required /><input name="telefone" placeholder="Telefone" required /><input name="email" type="email" placeholder="E-mail" required /><input name="assunto" placeholder="Assunto" required /><textarea name="mensagem" rows={4} placeholder="Mensagem" required /><button className="primary">Enviar contato</button></form></section>
      <a className="public-floating-contact" href="#contato">Fale com a gente</a>
      <footer className="public-footer"><img src="/gerivo-logo-light.png" alt="Gerivo" /><span>Gestão que gera resultados.</span><span>Gerivo v1.7.6</span></footer>
    </main>
  );
}

function NoAccess({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <main className="onboarding-page">
      <section className="onboarding-card no-access-card">
        <img src="/gerivo-logo.png" alt="Gerivo" />
        <small>ACESSO PENDENTE</small>
        <h1>Seu usuário ainda não possui empresa ou loja vinculada</h1>
        <p>Solicite ao administrador da empresa a liberação do acesso.</p>
        <button className="secondary" onClick={() => void onLogout()}>Sair</button>
      </section>
    </main>
  );
}

function CompanyOnboarding({
  onSubmit,
  onLogout,
  error,
}: {
  onSubmit: (companyName: string, storeName: string, segment: string) => Promise<void>;
  onLogout: () => Promise<void>;
  error: string;
}) {
  const [companyName, setCompanyName] = useState("");
  const [segment, setSegment] = useState("OUTRO");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(companyName.trim(), companyName.trim(), segment);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <main className="onboarding-page">
      <form className="onboarding-card" onSubmit={submit}>
        <img src="/gerivo-logo.png" alt="Gerivo" />
        <small>CONFIGURAÇÃO INICIAL</small>
        <h1>Cadastre sua primeira empresa</h1>
        <p>Informe os dados principais para iniciar a configuração.</p>

        <label>
          Nome da empresa
          <input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ex.: RS Performance" />
        </label>


        <label>
          Segmento principal
          <select value={segment} onChange={(event) => setSegment(event.target.value)}>
            <option value="OFICINA">Oficina e centro automotivo</option>
            <option value="CONCESSIONARIA">Concessionária</option>
            <option value="VAREJO">Comércio varejista</option>
            <option value="AUTOPECAS">Autopeças</option>
            <option value="MERCADO">Mercado</option>
            <option value="PADARIA">Padaria</option>
            <option value="CONFEITARIA">Confeitaria</option>
            <option value="JOALHERIA">Joalheria</option>
            <option value="SERVICOS">Prestação de serviços</option>
            <option value="OUTRO">Outro</option>
          </select>
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button className="primary" disabled={submitting}>{submitting ? "Criando ambiente..." : "Criar empresa e continuar"}</button>
        <button type="button" className="secondary" onClick={onLogout}>Sair</button>
      </form>
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
  onOpenAppointments,
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
  onOpenAppointments: () => void;
  onOpenOrders: () => void;
  onOpenQuotes: () => void;
  companySettings: CompanySettings;
}) {
  const now = new Date();
  const sameMonth = (value: string) => { const date = new Date(value); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); };
  const openAttendances = data.attendances.filter((item) => item.status !== "CONCLUIDO");
  const monthOrders = data.orders.filter((item) => item.status === "FECHADA" && sameMonth(item.updatedAt));
  const monthQuotes = data.quotes.filter((item) => item.status === "FECHADO" && sameMonth(item.updatedAt));
  const monthRevenue = companySettings.modules.ORDERS ? monthOrders.reduce((total, item) => total + item.total, 0) : monthQuotes.reduce((total, item) => total + item.total, 0);
  const openOrders = data.orders.filter((item) => item.status !== "FECHADA");
  const openQuotes = data.quotes.filter((item) => item.status !== "FECHADO");
  const todayAppointments = data.appointments.filter((item) => new Date(item.startsAt).toDateString() === now.toDateString() && !["CANCELADO", "CONCLUIDO"].includes(item.status));

  const cards: Array<{ label: string; value: string; detail: string; icon: IconName; action?: () => void }> = [
    { label: "Faturamento do mês", value: money(monthRevenue), detail: `${monthOrders.length + monthQuotes.length} registros concluídos`, icon: "chart" },
  ];
  if (companySettings.modules.APPOINTMENTS) cards.push({ label: isDeliverySegment(store.segment) ? "Pedidos de hoje" : "Clientes agendados", value: String(todayAppointments.length), detail: isDeliverySegment(store.segment) ? "Pedidos programados" : "Agendamentos de hoje", icon: "calendar", action: onOpenAppointments });
  if (companySettings.modules.ORDERS) cards.push({ label: "O.S. abertas", value: money(openOrders.reduce((total, item) => total + item.total, 0)), detail: `${openOrders.length} ordens em aberto`, icon: "wrench", action: onOpenOrders });
  if (companySettings.modules.QUOTES) cards.push({ label: "Orçamentos abertos", value: money(openQuotes.reduce((total, item) => total + item.total, 0)), detail: `${openQuotes.length} orçamentos em andamento`, icon: "file", action: onOpenQuotes });

  return (
    <>
      <section className="dashboard-welcome">
        <div><small>{store.companyName.toUpperCase()}</small><h2>Visão geral da operação</h2></div>
        {companySettings.modules.CHECKLIST && <button className="primary" onClick={onCreate}>+ Nova recepção</button>}
      </section>
      <section className={`dashboard-smart-metrics cards-${Math.min(cards.length, 4)}`}>
        {cards.slice(0, 4).map((card) => <button key={card.label} className="smart-metric" onClick={card.action} disabled={!card.action}><span><PremiumIcon name={card.icon} size={21} /></span><div><small>{card.label}</small><strong>{card.value}</strong><em>{card.detail}</em></div>{card.action && <PremiumIcon name="chevron" size={16} />}</button>)}
      </section>

      {(companySettings.modules.ORDERS || companySettings.modules.QUOTES) && <section className="dashboard-operation-grid">
        {companySettings.modules.ORDERS && <DashboardDocumentPanel eyebrow="ORDENS DE SERVIÇO" title="Em execução" empty="Nenhuma ordem de serviço aberta." records={openOrders.slice(0, 5).map((order) => ({ code: order.code, primary: order.vehicle || order.customer || "Cadastro incompleto", secondary: order.plate || "Sem placa", status: serviceOrderStatusLabel(order.status), statusClass: order.status.toLowerCase(), value: money(order.total) }))} onOpen={onOpenOrders} />}
        {companySettings.modules.QUOTES && <DashboardDocumentPanel eyebrow="ORÇAMENTOS" title="Em andamento" empty="Nenhum orçamento aberto." records={openQuotes.slice(0, 5).map((quote) => ({ code: quote.code, primary: quote.vehicle || quote.customer || "Cadastro incompleto", secondary: quote.plate || "Sem placa", status: quoteStatusLabel(quote.status), statusClass: quote.status.toLowerCase(), value: money(quote.total) }))} onOpen={onOpenQuotes} />}
      </section>}

      {companySettings.modules.CHECKLIST && <section className="panel attendance-panel"><header><div><small>ATENDIMENTOS</small><h3>Atendimentos recentes</h3></div><span className="count">{data.attendances.length} registros</span></header>{data.attendances.length === 0 ? <div className="empty-attendance"><div className="garage-icon"><PremiumIcon name="car" size={27} /></div><h3>Nenhum atendimento aberto</h3><button className="primary" onClick={onCreate}>Criar primeira recepção</button></div> : <div className="attendance-list">{data.attendances.slice(0, 6).map((attendance) => <AttendanceCard key={attendance.id} attendance={attendance} onOpen={onOpen} onStartStage={onStartStage} onOpenModule={onOpenModule} onDelete={onDelete} companySettings={companySettings} />)}</div>}</section>}
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
  isPlatformMaster,
  sessionAccessToken,
  onOpenCatalog,
  onOpenInventory,
  onOpenIdentity,
  onOpenPricing,
  onOpenModules,
  onOpenChecklist,
  onOpenKnowledge,
  onOpenMessages,
  onOpenBi,
}: {
  store: Store;
  data: StoreData;
  isPlatformMaster: boolean;
  sessionAccessToken: string;
  onOpenCatalog: () => void;
  onOpenInventory: () => void;
  onOpenIdentity: () => void;
  onOpenPricing: () => void;
  onOpenModules: () => void;
  onOpenChecklist: () => void;
  onOpenKnowledge: () => void;
  onOpenMessages: () => void;
  onOpenBi: () => void;
}) {
  const [usersOpen, setUsersOpen] = useState(false);
  const activeItems = data.catalog.filter((item) => item.active).length;
  const lowStock = data.catalog.filter((item) => item.kind !== "SERVICO" && item.active && item.stock <= item.minimumStock).length;

  const cards = [
    { key: "identity", label: "Identidade visual", icon: "store" as IconName, value: data.companyIdentity.logo ? "Marca própria" : "Gerivo padrão", action: onOpenIdentity },
    { key: "catalog", label: "Catálogo", icon: "layers" as IconName, value: `${activeItems} itens ativos`, action: onOpenCatalog },
    { key: "pricing", label: "Formação de preço", icon: "chart" as IconName, value: `${data.companySettings.generalMargin}% margem geral`, action: onOpenPricing },
    { key: "inventory", label: "Estoque", icon: "box" as IconName, value: lowStock ? `${lowStock} alertas` : "Estoque regular", action: onOpenInventory },
    { key: "checklist", label: "Modelos de checklist", icon: "clipboard" as IconName, value: data.checklistSettings.name, action: onOpenChecklist },
    { key: "knowledge", label: "Conhecimento da IA", icon: "sparkle" as IconName, value: `${data.knowledgeBase.length} procedimentos`, action: onOpenKnowledge },
    { key: "messages", label: "Central de mensagens", icon: "file" as IconName, value: "Modelos comerciais", action: onOpenMessages },
    { key: "bi", label: "Gerivo BI", icon: "chart" as IconName, value: "Indicadores 3, 6 e 12 meses", action: onOpenBi },
    { key: "users", label: "Usuários e acessos", icon: "users" as IconName, value: "Gerenciar acessos", action: () => setUsersOpen(true) },
  ];
  if (isPlatformMaster) cards.splice(3, 0, { key: "modules", label: "Módulos contratados", icon: "modules" as IconName, value: "Controle MASTER", action: onOpenModules });

  return (
    <div className="management-page">
      <section className="management-heading compact-heading">
        <div><small>ADMINISTRAÇÃO DA EMPRESA</small><h2>Gestão de {store.companyName}</h2></div>
      </section>
      <section className="management-grid management-grid-clean">
        {cards.map((card) => (
          <button type="button" className="management-card clean" key={card.key} onClick={card.action}>
            <span className="management-icon">{card.key === "identity" && data.companyIdentity.logo ? <img src={data.companyIdentity.logo} alt="" /> : <PremiumIcon name={card.icon} size={24} />}</span>
            <div><strong>{card.label}</strong><small>{card.value}</small></div>
            <PremiumIcon name="chevron" size={18} />
          </button>
        ))}
      </section>
      {usersOpen && (
        <UserAccessModal
          store={store}
          accessToken={sessionAccessToken}
          onClose={() => setUsersOpen(false)}
        />
      )}
    </div>
  );
}

function suggestUsername(fullName: string, _storeCode: number) {
  const normalized = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!normalized.length) return "";
  const first = normalized[0][0] || "u";
  const last = normalized[normalized.length - 1] || normalized[0];
  return `${first}.${last}`.replace(/[^a-z0-9.]/g, "");
}

function UserAccessModal({ store, accessToken, onClose }: { store: Store; accessToken: string; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [availability, setAvailability] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!fullName.trim() || username.trim()) return;
    setUsername(suggestUsername(fullName, store.publicCode));
  }, [fullName, store.publicCode, username]);

  useEffect(() => {
    const value = username.trim();
    if (value.length < 4) { setAvailability("idle"); return; }
    setAvailability("checking");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/users/username-availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: value }) });
        const payload = await response.json();
        setAvailability(payload.available ? "available" : "unavailable");
        if (payload.username && payload.username !== value) setUsername(payload.username);
      } catch { setAvailability("unavailable"); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [username]);

  async function createUser() {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ companyId: store.companyId, storeIds: [store.id], fullName, username, email, password, role }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao criar usuário.");
      setMessage(`Usuário ${payload.username} criado com sucesso.`);
      setFullName(""); setUsername(""); setEmail(""); setPassword(""); setAvailability("idle");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao criar usuário."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="modal-backdrop"><section className="compact-modal user-access-modal">
      <header><div><small>USUÁRIOS E ACESSOS</small><h2>Novo usuário</h2></div><button onClick={onClose}>×</button></header>
      <div className="user-access-form">
        <Field label="Nome e sobrenome"><input value={fullName} onChange={(e) => { setFullName(e.target.value); setUsername(""); }} placeholder="Ex.: Maria Silva" /></Field>
        <Field label="Usuário"><div className="availability-field"><input autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="nome.sobrenome" /><span className={`availability ${availability}`}>{availability === "checking" ? "Verificando..." : availability === "available" ? "✓ Disponível" : availability === "unavailable" ? "Indisponível" : ""}</span></div></Field>
        <Field label="E-mail de recuperação"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" /></Field>
        <Field label="Senha temporária"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></Field>
        <Field label="Perfil"><select value={role} onChange={(e) => setRole(e.target.value)}><option value="MEMBER">Usuário</option><option value="MANAGER">Gestor</option><option value="ADMIN">Administrador</option></select></Field>
        {message && <div className={message.includes("sucesso") ? "auth-success" : "auth-error"}>{message}</div>}
      </div>
      <footer><button className="outline" onClick={onClose}>Fechar</button><button className="primary" disabled={submitting || availability !== "available" || !email || password.length < 8} onClick={createUser}>{submitting ? "Criando..." : "Criar usuário"}</button></footer>
    </section></div>
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

function normalizeCatalogSuggestion(name: string) {
  const value = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const rules: Array<{ terms: string[]; category: string; kind: CatalogKind; icon: string }> = [
    { terms: ["oleo", "lubrificante"], category: "Lubrificantes", kind: "PRODUTO", icon: "🛢️" },
    { terms: ["filtro"], category: "Filtros", kind: "PECA", icon: "⚙️" },
    { terms: ["camiseta", "camisa", "blusa", "vestido", "calca"], category: "Roupas", kind: "PRODUTO", icon: "👕" },
    { terms: ["bolo", "torta", "doce", "brigadeiro"], category: "Confeitaria", kind: "PRODUTO", icon: "🎂" },
    { terms: ["corte", "escova", "manicure", "barba"], category: "Beleza", kind: "SERVICO", icon: "✂️" },
    { terms: ["lavagem", "polimento", "higienizacao"], category: "Estética", kind: "SERVICO", icon: "✨" },
    { terms: ["hamburguer", "pizza", "marmita", "lanche"], category: "Cardápio", kind: "PRODUTO", icon: "🍔" },
  ];
  return rules.find((rule) => rule.terms.some((term) => value.includes(term))) ?? { category: "Geral", kind: "PRODUTO" as CatalogKind, icon: "📦" };
}

function genericCatalogImage(name: string, icon: string) {
  const safeName = (name || "Item").slice(0, 24).replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e7f7f1"/><stop offset="1" stop-color="#f5fbf9"/></linearGradient></defs><rect width="640" height="420" rx="40" fill="url(#g)"/><circle cx="320" cy="170" r="88" fill="#fff" stroke="#16826e" stroke-width="4"/><text x="320" y="198" text-anchor="middle" font-size="82">${icon}</text><text x="320" y="315" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#0d2630">${safeName}</text><text x="320" y="352" text-anchor="middle" font-family="Arial" font-size="18" fill="#16826e">Imagem de referência Gerivo</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function effectiveMargin(item: CatalogItem, generalMargin: number) {
  return item.marginMode === "INDIVIDUAL" && item.individualMargin != null ? item.individualMargin : generalMargin;
}

function priceFromCost(cost: number, margin: number) {
  return Math.max(0, Number(cost) || 0) * (1 + Math.max(0, Number(margin) || 0) / 100);
}

function Catalog({
  store,
  items,
  suppliers,
  generalMargin,
  serviceTypes,
  onChange,
  onServiceTypesChange,
}: {
  store: Store;
  items: CatalogItem[];
  suppliers: Supplier[];
  generalMargin: number;
  serviceTypes: ServiceType[];
  onChange: (items: CatalogItem[]) => void;
  onServiceTypesChange: (types: ServiceType[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"TODOS" | CatalogKind | "INATIVOS">("TODOS");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogItem>(() => ({
    id: uid(), name: "", category: "", kind: "PRODUTO", price: 0, cost: 0, marginMode: "GENERAL", individualMargin: null,
    image: "", referenceImage: "", sku: "", stock: 0, minimumStock: 0, supplierId: null, active: true, standard: false,
  }));

  useEffect(() => {
    const handler = () => { setDraft({ id: uid(), name: "", category: "", kind: "PRODUTO", price: 0, cost: 0, marginMode: "GENERAL", individualMargin: null, image: "", referenceImage: "", sku: "", stock: 0, minimumStock: 0, supplierId: null, active: true, standard: false }); setEditorOpen(true); };
    window.addEventListener("gerivo:new-catalog-item", handler);
    return () => window.removeEventListener("gerivo:new-catalog-item", handler);
  }, []);

  const filtered = items.filter((item) => {
    const matchesText = `${item.name} ${item.category} ${item.sku}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "TODOS" ? item.active : filter === "INATIVOS" ? !item.active : item.kind === filter && item.active;
    return matchesText && matchesFilter;
  });

  function openItem(item: CatalogItem) { setDraft({ ...item }); setEditorOpen(true); }
  function applyRecognition() {
    const suggestion = normalizeCatalogSuggestion(draft.name);
    setDraft({ ...draft, category: draft.category || suggestion.category, kind: draft.kind || suggestion.kind, referenceImage: genericCatalogImage(draft.name, suggestion.icon) });
  }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const photo = await preparePhoto(file);
    setDraft({ ...draft, image: photo.dataUrl });
    event.target.value = "";
  }
  function saveItem() {
    if (!draft.name.trim()) return window.alert("Informe o nome do item.");
    const margin = effectiveMargin(draft, generalMargin);
    const calculated = draft.price || priceFromCost(draft.cost, margin);
    const final = { ...draft, name: draft.name.trim(), category: draft.category.trim() || "Geral", price: Number(calculated.toFixed(2)) };
    onChange(items.some((item) => item.id === final.id) ? items.map((item) => item.id === final.id ? final : item) : [final, ...items]);
    setEditorOpen(false);
  }

  return (
    <div className="catalog-page">
      <section className="catalog-toolbar panel compact-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, categoria ou código" />
        <div className="catalog-filters">
          {(["TODOS", "PRODUTO", "SERVICO", "PECA", "KIT", "INATIVOS"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "TODOS" ? "Todos" : value === "INATIVOS" ? "Inativos" : value === "PECA" ? "Peças" : value === "SERVICO" ? "Serviços" : value === "PRODUTO" ? "Produtos" : value === "KIT" ? "Kits" : value}</button>)}
        </div>
      </section>

      <section className="panel catalog-list-panel">
        <header><div><small>CATÁLOGO</small><h3>{filtered.length} itens</h3></div></header>
        <div className="catalog-grid-professional">
          {filtered.map((item) => {
            const margin = effectiveMargin(item, generalMargin);
            const image = item.image || item.referenceImage;
            return <button key={item.id} className="catalog-product-card" onClick={() => openItem(item)}>
              <span className="catalog-product-image">{image ? <img src={image} alt={item.name} /> : <PremiumIcon name="image" size={28} />}</span>
              <div><small>{item.category}</small><strong>{item.name}</strong><span>{item.kind === "SERVICO" ? "Serviço" : `${item.stock} em estoque`}</span></div>
              <aside><b>{money(item.price)}</b>{item.kind !== "SERVICO" && <small>{margin}% margem</small>}</aside>
            </button>;
          })}
          {!filtered.length && <div className="empty-inline">Nenhum item encontrado.</div>}
        </div>
      </section>

      {editorOpen && <div className="modal-backdrop"><section className="compact-modal catalog-editor-modal">
        <header><div><small>ITEM DO CATÁLOGO</small><h2>{draft.name || "Novo item"}</h2></div><button onClick={() => setEditorOpen(false)}>×</button></header>
        <div className="catalog-editor-layout">
          <div className="catalog-image-editor">
            <div>{draft.image || draft.referenceImage ? <img src={draft.image || draft.referenceImage} alt="" /> : <PremiumIcon name="image" size={42} />}</div>
            <label>Enviar imagem<input type="file" accept="image/*" onChange={uploadImage} /></label>
            <button className="outline" type="button" onClick={applyRecognition}>Sugerir categoria e imagem</button>
          </div>
          <div className="catalog-editor-fields">
            <Field label="Nome"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Tipo"><select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CatalogKind })}><option value="PRODUTO">Produto</option><option value="SERVICO">Serviço</option><option value="PECA">Peça</option><option value="KIT">Kit</option><option value="MATERIAL">Material</option></select></Field>
            <Field label="Categoria"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
            <Field label="Código / SKU"><input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></Field>
            <Field label="Custo"><input inputMode="decimal" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) || 0 })} /></Field>
            <Field label="Margem"><select value={draft.marginMode} onChange={(e) => setDraft({ ...draft, marginMode: e.target.value as MarginMode })}><option value="GENERAL">Usar margem geral ({generalMargin}%)</option><option value="INDIVIDUAL">Margem individual</option></select></Field>
            {draft.marginMode === "INDIVIDUAL" && <Field label="Margem individual %"><input inputMode="decimal" value={draft.individualMargin ?? ""} onChange={(e) => setDraft({ ...draft, individualMargin: e.target.value === "" ? null : Number(e.target.value) || 0 })} /></Field>}
            <Field label="Preço de venda"><input inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })} /></Field>
            {draft.kind !== "SERVICO" && <><Field label="Estoque atual"><input inputMode="numeric" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) || 0 })} /></Field><Field label="Estoque mínimo"><input inputMode="numeric" value={draft.minimumStock} onChange={(e) => setDraft({ ...draft, minimumStock: Number(e.target.value) || 0 })} /></Field><Field label="Fornecedor"><select value={draft.supplierId || ""} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value || null })}><option value="">Sem fornecedor</option>{suppliers.filter((item) => item.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field></>}
            <Field label="Situação"><select value={draft.active ? "1" : "0"} onChange={(e) => setDraft({ ...draft, active: e.target.value === "1" })}><option value="1">Ativo</option><option value="0">Inativo</option></select></Field>
          </div>
        </div>
        <footer><button className="outline" onClick={() => setEditorOpen(false)}>Cancelar</button><button className="primary" onClick={saveItem}>Salvar item</button></footer>
      </section></div>}
    </div>
  );
}

function agendaDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function agendaMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return Math.max(0, Math.min(24 * 60, (hour || 0) * 60 + (minute || 0)));
}

function agendaTime(minutes: number) {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function agendaLocalDate(dateKey: string, minutes: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function agendaStatusLabel(status: AppointmentStatus) {
  return ({ AGENDADO: "Agendado", CONFIRMADO: "Confirmado", EM_ATENDIMENTO: "Em atendimento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" } as Record<AppointmentStatus, string>)[status];
}

function AppointmentsPage({
  appointments,
  appointmentSettings,
  appointmentBlocks,
  customers,
  storeId,
  mode,
  onAppointmentsChange,
  onSettingsChange,
  onBlocksChange,
}: {
  appointments: Appointment[];
  appointmentSettings: AppointmentSettings;
  appointmentBlocks: AppointmentBlock[];
  customers: Customer[];
  storeId: string;
  mode: "AGENDA" | "DELIVERY";
  onAppointmentsChange: (items: Appointment[]) => void;
  onSettingsChange: (settings: AppointmentSettings) => void;
  onBlocksChange: (items: AppointmentBlock[]) => void;
}) {
  const isDelivery = mode === "DELIVERY";
  const [selectedDate, setSelectedDate] = useState(agendaDateKey(new Date()));
  const [statusFilter, setStatusFilter] = useState<"TODOS" | AppointmentStatus>("TODOS");
  const [professionalFilter, setProfessionalFilter] = useState("TODOS");
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const settings = normalizeAppointmentSettings(appointmentSettings, isDelivery ? "DELIVERY" : "OUTRO");
  const startMinutes = agendaMinutes(settings.startTime);
  const endMinutes = Math.max(startMinutes + settings.slotMinutes, agendaMinutes(settings.endTime));
  const slotMinutes = settings.slotMinutes;
  const slots = useMemo(() => Array.from({ length: Math.ceil((endMinutes - startMinutes) / slotMinutes) }, (_, index) => startMinutes + index * slotMinutes), [startMinutes, endMinutes, slotMinutes]);
  const configuredProfessionals = Array.from(new Set([...settings.professionals, ...appointments.map((item) => item.professional.trim()).filter(Boolean)]));
  const activeProfessionals = professionalFilter === "TODOS" ? configuredProfessionals : configuredProfessionals.filter((item) => item === professionalFilter);
  const selectedDateValue = agendaLocalDate(selectedDate, 12 * 60);
  const workingDay = settings.workingDays.includes(selectedDateValue.getDay());
  const today = selectedDate === agendaDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimePercent = ((nowMinutes - startMinutes) / Math.max(1, endMinutes - startMinutes)) * 100;

  const emptyDraft = (professional = configuredProfessionals[0] || "Agenda principal", minute = today ? Math.max(startMinutes, Math.ceil((nowMinutes + 15) / slotMinutes) * slotMinutes) : startMinutes): Appointment => ({
    id: uid(),
    storeId,
    customerId: null,
    customer: "",
    phone: "",
    title: isDelivery ? "Pedido" : "Atendimento",
    professional,
    startsAt: agendaLocalDate(selectedDate, Math.min(minute, endMinutes - settings.defaultDurationMinutes)).toISOString(),
    durationMinutes: settings.defaultDurationMinutes,
    status: "AGENDADO",
    notes: "",
  });
  const [draft, setDraft] = useState<Appointment>(() => emptyDraft());
  const [settingsDraft, setSettingsDraft] = useState<AppointmentSettings>(settings);
  const [newProfessional, setNewProfessional] = useState("");
  const [blockDraft, setBlockDraft] = useState(() => ({ professional: "TODOS", date: selectedDate, startTime: settings.startTime, endTime: agendaTime(Math.min(endMinutes, startMinutes + 60)), reason: "Horário bloqueado" }));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSettingsDraft(settings);
  }, [appointmentSettings.startTime, appointmentSettings.endTime, appointmentSettings.slotMinutes, appointmentSettings.defaultDurationMinutes, appointmentSettings.allowOverlap, appointmentSettings.professionals.join("|"), appointmentSettings.workingDays.join("|")]);

  useEffect(() => {
    const handleNew = () => {
      setError("");
      setDraft(emptyDraft());
      setOpen(true);
    };
    window.addEventListener("gerivo:new-appointment", handleNew);
    return () => window.removeEventListener("gerivo:new-appointment", handleNew);
  }, [selectedDate, startMinutes, endMinutes, slotMinutes, settings.defaultDurationMinutes, settings.professionals.join("|"), nowMinutes, isDelivery, storeId]);

  useEffect(() => {
    if (!today || !timelineRef.current || nowMinutes < startMinutes || nowMinutes > endMinutes) return;
    const slotWidth = window.innerWidth <= 760 ? 66 : 82;
    const target = Math.max(0, ((nowMinutes - startMinutes) / slotMinutes) * slotWidth - timelineRef.current.clientWidth / 2);
    timelineRef.current.scrollLeft = target;
  }, [selectedDate]);

  const dayAppointments = appointments
    .filter((item) => agendaDateKey(new Date(item.startsAt)) === selectedDate)
    .filter((item) => statusFilter === "TODOS" || item.status === statusFilter)
    .filter((item) => professionalFilter === "TODOS" || item.professional === professionalFilter)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dayBlocks = appointmentBlocks.filter((item) => agendaDateKey(new Date(item.startsAt)) === selectedDate);

  function moveDate(days: number) {
    const date = agendaLocalDate(selectedDate, 12 * 60);
    date.setDate(date.getDate() + days);
    setSelectedDate(agendaDateKey(date));
  }

  function openSlot(professional: string, minute: number) {
    if (!workingDay) return;
    setError("");
    setDraft(emptyDraft(professional, minute));
    setOpen(true);
  }

  function editAppointment(item: Appointment) {
    setError("");
    setDraft({ ...item });
    setOpen(true);
  }

  function appointmentCollides(item: Appointment) {
    const itemStart = new Date(item.startsAt).getTime();
    const itemEnd = itemStart + item.durationMinutes * 60000;
    const blocked = appointmentBlocks.some((block) => {
      if (block.professional && block.professional !== item.professional) return false;
      const blockStart = new Date(block.startsAt).getTime();
      const blockEnd = new Date(block.endsAt).getTime();
      return itemStart < blockEnd && itemEnd > blockStart;
    });
    if (blocked) return "Este horário está bloqueado para o responsável selecionado.";
    if (!settings.allowOverlap) {
      const overlapping = appointments.some((current) => {
        if (current.id === item.id || current.status === "CANCELADO" || current.professional !== item.professional) return false;
        const currentStart = new Date(current.startsAt).getTime();
        const currentEnd = currentStart + current.durationMinutes * 60000;
        return itemStart < currentEnd && itemEnd > currentStart;
      });
      if (overlapping) return "Já existe um agendamento nesse período para o responsável selecionado.";
    }
    return "";
  }

  function saveAppointment() {
    setError("");
    if (!draft.customer.trim()) return setError("Informe o cliente.");
    if (!draft.professional.trim()) return setError("Selecione um responsável.");
    const startsAt = new Date(draft.startsAt);
    if (Number.isNaN(startsAt.getTime())) return setError("Informe uma data e hora válidas.");
    const minute = startsAt.getHours() * 60 + startsAt.getMinutes();
    if (minute < startMinutes || minute + draft.durationMinutes > endMinutes) return setError(`O atendimento precisa ficar entre ${settings.startTime} e ${settings.endTime}.`);
    if (!settings.workingDays.includes(startsAt.getDay())) return setError("O dia selecionado não está configurado como dia de atendimento.");
    const item = { ...draft, storeId, startsAt: startsAt.toISOString(), professional: draft.professional.trim() };
    const collision = appointmentCollides(item);
    if (collision) return setError(collision);
    onAppointmentsChange(appointments.some((current) => current.id === item.id) ? appointments.map((current) => current.id === item.id ? item : current) : [...appointments, item]);
    setOpen(false);
    setDraft(emptyDraft());
  }

  function deleteAppointment() {
    if (!appointments.some((item) => item.id === draft.id)) return;
    if (!window.confirm("Excluir este agendamento?")) return;
    onAppointmentsChange(appointments.filter((item) => item.id !== draft.id));
    setOpen(false);
  }

  function saveSettings() {
    const normalized = normalizeAppointmentSettings(settingsDraft, isDelivery ? "DELIVERY" : "OUTRO");
    if (agendaMinutes(normalized.endTime) <= agendaMinutes(normalized.startTime)) return window.alert("O horário final precisa ser posterior ao horário inicial.");
    onSettingsChange(normalized);
    setProfessionalFilter("TODOS");
    setSettingsOpen(false);
  }

  function saveBlock() {
    setError("");
    if (!blockDraft.date) return setError("Informe a data do bloqueio.");
    const from = agendaMinutes(blockDraft.startTime);
    const to = agendaMinutes(blockDraft.endTime);
    if (to <= from) return setError("O fim do bloqueio precisa ser posterior ao início.");
    const block: AppointmentBlock = {
      id: uid(),
      storeId,
      professional: blockDraft.professional === "TODOS" ? null : blockDraft.professional,
      startsAt: agendaLocalDate(blockDraft.date, from).toISOString(),
      endsAt: agendaLocalDate(blockDraft.date, to).toISOString(),
      reason: blockDraft.reason.trim() || "Horário bloqueado",
    };
    onBlocksChange([...appointmentBlocks, block]);
    setBlockOpen(false);
  }

  function blockFor(professional: string, minute: number) {
    const instant = agendaLocalDate(selectedDate, minute).getTime();
    return dayBlocks.find((block) => (!block.professional || block.professional === professional) && instant >= new Date(block.startsAt).getTime() && instant < new Date(block.endsAt).getTime());
  }

  function appointmentStyle(item: Appointment) {
    const date = new Date(item.startsAt);
    const minutes = date.getHours() * 60 + date.getMinutes();
    return {
      left: `${((minutes - startMinutes) / slotMinutes) * 82}px`,
      width: `${Math.max(76, (item.durationMinutes / slotMinutes) * 82 - 6)}px`,
    };
  }

  function blockStyle(block: AppointmentBlock) {
    const start = new Date(block.startsAt);
    const end = new Date(block.endsAt);
    const from = start.getHours() * 60 + start.getMinutes();
    const duration = Math.max(slotMinutes, (end.getTime() - start.getTime()) / 60000);
    return {
      left: `${((from - startMinutes) / slotMinutes) * 82}px`,
      width: `${Math.max(76, (duration / slotMinutes) * 82 - 6)}px`,
    };
  }

  const summary = {
    total: dayAppointments.filter((item) => item.status !== "CANCELADO").length,
    confirmed: dayAppointments.filter((item) => item.status === "CONFIRMADO").length,
    inService: dayAppointments.filter((item) => item.status === "EM_ATENDIMENTO").length,
    blocked: dayBlocks.length,
  };

  return <div className="appointments-page agenda-v174">
    <section className="panel agenda-toolbar">
      <div className="agenda-date-navigation">
        <button className="outline agenda-icon-button" onClick={() => moveDate(-1)} aria-label="Dia anterior">‹</button>
        <button className="outline" onClick={() => setSelectedDate(agendaDateKey(new Date()))}>Hoje</button>
        <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        <button className="outline agenda-icon-button" onClick={() => moveDate(1)} aria-label="Próximo dia">›</button>
      </div>
      <div className="agenda-toolbar-filters">
        <select value={professionalFilter} onChange={(event) => setProfessionalFilter(event.target.value)}><option value="TODOS">Todos os responsáveis</option>{configuredProfessionals.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "TODOS" | AppointmentStatus)}><option value="TODOS">Todos os status</option><option value="AGENDADO">Agendados</option><option value="CONFIRMADO">Confirmados</option><option value="EM_ATENDIMENTO">Em atendimento</option><option value="CONCLUIDO">Concluídos</option><option value="CANCELADO">Cancelados</option></select>
        <button className="outline" onClick={() => { setError(""); setBlockDraft({ professional: "TODOS", date: selectedDate, startTime: settings.startTime, endTime: agendaTime(Math.min(endMinutes, startMinutes + 60)), reason: "Horário bloqueado" }); setBlockOpen(true); }}>Bloquear horário</button>
        <button className="outline" onClick={() => { setSettingsDraft(settings); setSettingsOpen(true); }}>Configurar agenda</button>
      </div>
    </section>

    <section className="agenda-day-heading">
      <div><small>{isDelivery ? "PROGRAMAÇÃO DE PEDIDOS" : "AGENDA OPERACIONAL"}</small><h2>{selectedDateValue.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</h2><p>{settings.startTime} às {settings.endTime} · intervalos de {settings.slotMinutes} minutos</p></div>
      <div className="agenda-summary-cards"><span><b>{summary.total}</b> programados</span><span><b>{summary.confirmed}</b> confirmados</span><span><b>{summary.inService}</b> em atendimento</span><span><b>{summary.blocked}</b> bloqueios</span></div>
    </section>

    {!workingDay && <div className="agenda-closed-banner"><b>Dia sem expediente</b><span>Este dia está desativado na configuração da agenda. Você ainda pode criar um bloqueio ou alterar os dias de funcionamento.</span></div>}

    <section className="panel agenda-desktop-board" ref={timelineRef}>
      <div className="agenda-grid" style={{ minWidth: `${190 + slots.length * 82}px` }}>
        <div className="agenda-corner"><strong>Responsável</strong><span>{activeProfessionals.length} agenda(s)</span></div>
        <div className="agenda-time-header" style={{ gridTemplateColumns: `repeat(${slots.length},82px)` }}>{slots.map((minute) => <div key={minute} className={today && minute <= nowMinutes && nowMinutes < minute + slotMinutes ? "current" : ""}><strong>{agendaTime(minute)}</strong></div>)}</div>
        {activeProfessionals.map((professional) => {
          const rowAppointments = dayAppointments.filter((item) => item.professional === professional);
          const rowBlocks = dayBlocks.filter((item) => !item.professional || item.professional === professional);
          return <div className="agenda-professional-row" key={professional}>
            <div className="agenda-professional-name"><span>{professional.slice(0, 1).toUpperCase()}</span><div><strong>{professional}</strong><small>{rowAppointments.filter((item) => item.status !== "CANCELADO").length} compromisso(s)</small></div></div>
            <div className="agenda-row-timeline" style={{ width: `${slots.length * 82}px`, gridTemplateColumns: `repeat(${slots.length},82px)` }}>
              {slots.map((minute) => { const blocked = blockFor(professional, minute); const isPast = today && minute + slotMinutes <= nowMinutes; return <button key={minute} type="button" disabled={!workingDay || Boolean(blocked)} className={`${isPast ? "past" : ""} ${blocked ? "blocked" : ""}`} title={blocked?.reason || `Agendar às ${agendaTime(minute)}`} onClick={() => openSlot(professional, minute)} />; })}
              {today && currentTimePercent >= 0 && currentTimePercent <= 100 && <div className="agenda-now-line" style={{ left: `${((nowMinutes - startMinutes) / slotMinutes) * 82}px` }}><span>{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>}
              {rowBlocks.map((block) => <button type="button" key={block.id} className="agenda-block-event" style={blockStyle(block)} title={block.reason} onClick={() => { if (window.confirm(`Remover bloqueio: ${block.reason}?`)) onBlocksChange(appointmentBlocks.filter((item) => item.id !== block.id)); }}><b>🔒 {block.reason}</b><span>{new Date(block.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–{new Date(block.endsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></button>)}
              {rowAppointments.map((item) => <button type="button" key={item.id} className={`agenda-event status-${item.status.toLowerCase()}`} style={appointmentStyle(item)} onClick={() => editAppointment(item)}><strong>{item.customer}</strong><span>{new Date(item.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {item.title}</span><em>{agendaStatusLabel(item.status)}</em></button>)}
            </div>
          </div>;
        })}
      </div>
    </section>

    <section className="agenda-mobile-board">
      {activeProfessionals.map((professional) => {
        const rowAppointments = dayAppointments.filter((item) => item.professional === professional);
        const rowBlocks = dayBlocks.filter((item) => !item.professional || item.professional === professional);
        const available = slots.filter((minute) => !blockFor(professional, minute) && !appointments.some((item) => item.professional === professional && item.status !== "CANCELADO" && agendaDateKey(new Date(item.startsAt)) === selectedDate && minute < new Date(item.startsAt).getHours() * 60 + new Date(item.startsAt).getMinutes() + item.durationMinutes && minute + slotMinutes > new Date(item.startsAt).getHours() * 60 + new Date(item.startsAt).getMinutes())).filter((minute) => !today || minute >= nowMinutes).slice(0, 6);
        return <article className="panel agenda-mobile-professional" key={professional}><header><div><small>RESPONSÁVEL</small><h3>{professional}</h3></div><button className="primary small" disabled={!workingDay} onClick={() => openSlot(professional, available[0] ?? startMinutes)}>+ Horário</button></header><div className="agenda-mobile-items">{[...rowBlocks.map((block) => ({ kind: "block" as const, time: new Date(block.startsAt).getTime(), block })), ...rowAppointments.map((appointment) => ({ kind: "appointment" as const, time: new Date(appointment.startsAt).getTime(), appointment }))].sort((a, b) => a.time - b.time).map((entry) => entry.kind === "block" ? <button key={entry.block.id} className="agenda-mobile-block" onClick={() => { if (window.confirm(`Remover bloqueio: ${entry.block.reason}?`)) onBlocksChange(appointmentBlocks.filter((item) => item.id !== entry.block.id)); }}><time>{new Date(entry.block.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>🔒 {entry.block.reason}</strong><span>Até {new Date(entry.block.endsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div></button> : <button key={entry.appointment.id} className={`agenda-mobile-event status-${entry.appointment.status.toLowerCase()}`} onClick={() => editAppointment(entry.appointment)}><time>{new Date(entry.appointment.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>{entry.appointment.customer}</strong><span>{entry.appointment.title} · {agendaStatusLabel(entry.appointment.status)}</span></div></button>)}{!rowAppointments.length && !rowBlocks.length && <div className="empty-inline">Nenhum compromisso neste dia.</div>}</div>{workingDay && <div className="agenda-free-slots"><small>PRÓXIMOS HORÁRIOS LIVRES</small><div>{available.length ? available.map((minute) => <button key={minute} onClick={() => openSlot(professional, minute)}>{agendaTime(minute)}</button>) : <span>Sem horários livres no período.</span>}</div></div>}</article>;
      })}
    </section>

    {open && <div className="modal-backdrop"><section className="compact-modal agenda-modal"><header><div><small>{appointments.some((item) => item.id === draft.id) ? "EDITAR" : "NOVO"} {isDelivery ? "PEDIDO" : "AGENDAMENTO"}</small><h2>{appointments.some((item) => item.id === draft.id) ? "Atualizar compromisso" : isDelivery ? "Cadastrar pedido" : "Agendar cliente"}</h2></div><button onClick={() => setOpen(false)}>×</button></header>{error && <div className="agenda-form-error">{error}</div>}<div className="appointment-form"><Field label="Cliente"><input list="appointment-customers" value={draft.customer} onChange={(event) => { const customer = customers.find((item) => item.name === event.target.value); setDraft({ ...draft, customer: event.target.value, customerId: customer?.id || null, phone: customer?.phone || draft.phone }); }} /><datalist id="appointment-customers">{customers.map((item) => <option key={item.id} value={item.name} />)}</datalist></Field><Field label="Telefone"><input inputMode="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></Field><Field label={isDelivery ? "Pedido / descrição" : "Serviço / motivo"}><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field><Field label="Data e hora"><input type="datetime-local" value={draft.startsAt ? new Date(draft.startsAt).toLocaleString("sv-SE").slice(0, 16).replace(" ", "T") : ""} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} /></Field><Field label={isDelivery ? "Previsão" : "Duração"}><select value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Number(event.target.value) })}>{[15, 30, 45, 60, 90, 120, 180, 240].map((value) => <option key={value} value={value}>{value < 60 ? `${value} min` : value % 60 ? `${Math.floor(value / 60)}h${value % 60}` : `${value / 60} hora${value > 60 ? "s" : ""}`}</option>)}</select></Field><Field label="Responsável"><select value={draft.professional} onChange={(event) => setDraft({ ...draft, professional: event.target.value })}>{configuredProfessionals.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AppointmentStatus })}><option value="AGENDADO">Agendado</option><option value="CONFIRMADO">Confirmado</option><option value="EM_ATENDIMENTO">Em atendimento</option><option value="CONCLUIDO">Concluído</option><option value="CANCELADO">Cancelado</option></select></Field><Field label="Observações"><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></Field></div><footer>{appointments.some((item) => item.id === draft.id) && <button className="danger" onClick={deleteAppointment}>Excluir</button>}<span /><button className="outline" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" onClick={saveAppointment}>Salvar</button></footer></section></div>}

    {blockOpen && <div className="modal-backdrop"><section className="compact-modal agenda-modal"><header><div><small>BLOQUEIO DE AGENDA</small><h2>Bloquear horário</h2></div><button onClick={() => setBlockOpen(false)}>×</button></header>{error && <div className="agenda-form-error">{error}</div>}<div className="appointment-form"><Field label="Responsável"><select value={blockDraft.professional} onChange={(event) => setBlockDraft({ ...blockDraft, professional: event.target.value })}><option value="TODOS">Todos os responsáveis</option>{configuredProfessionals.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><Field label="Data"><input type="date" value={blockDraft.date} onChange={(event) => setBlockDraft({ ...blockDraft, date: event.target.value })} /></Field><Field label="Início"><input type="time" step={settings.slotMinutes * 60} value={blockDraft.startTime} onChange={(event) => setBlockDraft({ ...blockDraft, startTime: event.target.value })} /></Field><Field label="Fim"><input type="time" step={settings.slotMinutes * 60} value={blockDraft.endTime} onChange={(event) => setBlockDraft({ ...blockDraft, endTime: event.target.value })} /></Field><Field label="Motivo"><input value={blockDraft.reason} onChange={(event) => setBlockDraft({ ...blockDraft, reason: event.target.value })} placeholder="Almoço, reunião, treinamento..." /></Field></div><footer><button className="outline" onClick={() => setBlockOpen(false)}>Cancelar</button><button className="primary" onClick={saveBlock}>Salvar bloqueio</button></footer></section></div>}

    {settingsOpen && <div className="modal-backdrop"><section className="compact-modal agenda-settings-modal"><header><div><small>CONFIGURAÇÃO</small><h2>Configurar agenda</h2></div><button onClick={() => setSettingsOpen(false)}>×</button></header><div className="agenda-settings-body"><div className="agenda-settings-grid"><Field label="Início do expediente"><input type="time" value={settingsDraft.startTime} onChange={(event) => setSettingsDraft({ ...settingsDraft, startTime: event.target.value })} /></Field><Field label="Fim do expediente"><input type="time" value={settingsDraft.endTime} onChange={(event) => setSettingsDraft({ ...settingsDraft, endTime: event.target.value })} /></Field><Field label="Intervalo da grade"><select value={settingsDraft.slotMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, slotMinutes: Number(event.target.value) as 15 | 30 | 60 })}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">60 minutos</option></select></Field><Field label="Duração padrão"><select value={settingsDraft.defaultDurationMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, defaultDurationMinutes: Number(event.target.value) })}>{[30, 45, 60, 90, 120, 180].map((value) => <option key={value} value={value}>{value < 60 ? `${value} minutos` : value % 60 ? `${Math.floor(value / 60)}h${value % 60}` : `${value / 60} hora${value > 60 ? "s" : ""}`}</option>)}</select></Field></div><div className="agenda-weekdays"><strong>Dias de funcionamento</strong><div>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label, day) => <button key={label} type="button" className={settingsDraft.workingDays.includes(day) ? "active" : ""} onClick={() => setSettingsDraft({ ...settingsDraft, workingDays: settingsDraft.workingDays.includes(day) ? settingsDraft.workingDays.filter((item) => item !== day) : [...settingsDraft.workingDays, day].sort() })}>{label}</button>)}</div></div><label className="agenda-overlap"><input type="checkbox" checked={settingsDraft.allowOverlap} onChange={(event) => setSettingsDraft({ ...settingsDraft, allowOverlap: event.target.checked })} /><span><strong>Permitir sobreposição de horários</strong><small>Quando desativado, o Gerivo impede dois compromissos no mesmo período para o mesmo responsável.</small></span></label><div className="agenda-professionals-config"><strong>Responsáveis, profissionais ou recursos</strong><div className="agenda-professionals-list">{settingsDraft.professionals.map((item) => <span key={item}>{item}<button type="button" disabled={settingsDraft.professionals.length === 1} onClick={() => setSettingsDraft({ ...settingsDraft, professionals: settingsDraft.professionals.filter((current) => current !== item) })}>×</button></span>)}</div><div className="agenda-professional-add"><input value={newProfessional} onChange={(event) => setNewProfessional(event.target.value)} placeholder="Ex.: Camila, Box 1, Produção" /><button className="outline" type="button" onClick={() => { const value = newProfessional.trim(); if (!value || settingsDraft.professionals.some((item) => item.toLowerCase() === value.toLowerCase())) return; setSettingsDraft({ ...settingsDraft, professionals: [...settingsDraft.professionals, value] }); setNewProfessional(""); }}>Adicionar</button></div></div></div><footer><button className="outline" onClick={() => setSettingsOpen(false)}>Cancelar</button><button className="primary" onClick={saveSettings}>Salvar configuração</button></footer></section></div>}
  </div>;
}

function InventoryPage({ items, suppliers, generalMargin, onItemsChange, onSuppliersChange }: { items: CatalogItem[]; suppliers: Supplier[]; generalMargin: number; onItemsChange: (items: CatalogItem[]) => void; onSuppliersChange: (items: Supplier[]) => void }) {
  const products = items.filter((item) => item.active && item.kind !== "SERVICO");
  const lowStock = products.filter((item) => item.stock <= item.minimumStock);
  const stockCost = products.reduce((total, item) => total + item.stock * item.cost, 0);
  const potentialRevenue = products.reduce((total, item) => total + item.stock * item.price, 0);
  const [supplierName, setSupplierName] = useState("");
  const suggestions = lowStock.map((item) => {
    const supplier = suppliers.find((s) => s.id === item.supplierId);
    const suggestedQty = Math.max(item.minimumStock * 2 - item.stock, item.minimumStock || 1);
    return { item, supplier, suggestedQty };
  });
  return <div className="inventory-page"><section className="metrics metrics-3"><Metric label="Custo em estoque" value={money(stockCost)} detail={`${products.length} itens controlados`} /><Metric label="Venda potencial" value={money(potentialRevenue)} detail={`Margem geral ${generalMargin}%`} /><Metric label="Reposição necessária" value={String(lowStock.length)} detail="Itens no mínimo ou abaixo" /></section><section className="inventory-grid"><article className="panel"><header><div><small>ASSISTENTE DE ESTOQUE</small><h3>Sugestões de compra</h3></div></header>{suggestions.length ? suggestions.map(({ item, supplier, suggestedQty }) => <div className="stock-suggestion" key={item.id}><span><PremiumIcon name="sparkle" size={18} /></span><div><strong>Comprar {suggestedQty} un. de {item.name}</strong><small>{supplier?.name || "Fornecedor não definido"} · saldo atual {item.stock}</small></div><button className="outline small" onClick={() => onItemsChange(items.map((current) => current.id === item.id ? { ...current, stock: current.stock + suggestedQty } : current))}>Registrar entrada</button></div>) : <div className="empty-inline">Nenhuma reposição urgente.</div>}</article><article className="panel"><header><div><small>FORNECEDORES</small><h3>{suppliers.filter((s) => s.active).length} cadastrados</h3></div></header><div className="supplier-list">{suppliers.map((supplier) => <div key={supplier.id}><strong>{supplier.name}</strong><span>{supplier.paymentTerms || "Sem condição"} · {supplier.leadTimeDays} dias</span></div>)}</div><div className="supplier-add"><input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nome do fornecedor" /><button className="primary small" onClick={() => { if (!supplierName.trim()) return; onSuppliersChange([...suppliers, { id: uid(), name: supplierName.trim(), document: "", phone: "", email: "", paymentTerms: "", leadTimeDays: 0, active: true }]); setSupplierName(""); }}>Cadastrar</button></div></article></section><section className="panel inventory-table"><header><div><small>POSIÇÃO ATUAL</small><h3>Estoque</h3></div></header>{products.map((item) => <div className={item.stock <= item.minimumStock ? "inventory-row alert" : "inventory-row"} key={item.id}><div><strong>{item.name}</strong><small>{item.category} · {item.sku || "sem código"}</small></div><label>Saldo<input inputMode="numeric" value={item.stock} onChange={(e) => onItemsChange(items.map((current) => current.id === item.id ? { ...current, stock: Math.max(0, Number(e.target.value) || 0) } : current))} /></label><span>{money(item.cost)} custo</span><span>{money(item.price)} venda</span></div>)}</section></div>;
}

function monthKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function operationalHealth(data: StoreData) {
  const closedOrders = data.orders.filter((item) => item.status === "FECHADA");
  const openQuotes = data.quotes.filter((item) => item.status !== "FECHADO");
  const incompleteAttendances = data.attendances.filter((item) => item.status !== "CONCLUIDO");
  const lowStock = data.catalog.filter((item) => item.active && item.kind !== "SERVICO" && item.stock <= item.minimumStock);
  const quoteConversion = data.quotes.length ? data.quotes.filter((item) => item.status === "FECHADO").length / data.quotes.length : 0;
  let score = 100;
  score -= Math.min(25, openQuotes.length * 3);
  score -= Math.min(20, incompleteAttendances.length * 2);
  score -= Math.min(20, lowStock.length * 4);
  if (data.quotes.length >= 3 && quoteConversion < 0.3) score -= 15;
  if (!closedOrders.length) score -= 10;
  return Math.max(0, Math.round(score));
}

function BusinessIntelligencePage({ data }: { data: StoreData }) {
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (period - 1), 1);
  const closedOrders = data.orders.filter((item) => item.status === "FECHADA" && new Date(item.updatedAt) >= start);
  const closedQuotes = data.quotes.filter((item) => item.status === "FECHADO" && new Date(item.updatedAt) >= start);
  const revenue = closedOrders.reduce((total, item) => total + item.total, 0);
  const averageTicket = closedOrders.length ? revenue / closedOrders.length : 0;
  const periodQuotes = data.quotes.filter((item) => new Date(item.updatedAt) >= start);
  const conversion = periodQuotes.length ? closedQuotes.length / periodQuotes.length * 100 : 0;
  const lowStock = data.catalog.filter((item) => item.active && item.kind !== "SERVICO" && item.stock <= item.minimumStock).length;
  const rows = Array.from({ length: period }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (period - 1 - index), 1);
    const key = monthKey(date);
    return {
      label: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      value: closedOrders.filter((item) => monthKey(item.updatedAt) === key).reduce((total, item) => total + item.total, 0),
      orders: closedOrders.filter((item) => monthKey(item.updatedAt) === key).length,
    };
  });
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <div className="bi-page">
    <section className="bi-heading"><div><small>GERIVO BI</small><h2>Indicadores da operação</h2><p>Leitura consolidada dos registros salvos nesta unidade.</p></div><div className="bi-periods">{([3, 6, 12] as const).map((value) => <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{value} meses</button>)}</div></section>
    <section className="metrics bi-metrics"><Metric label="Faturamento realizado" value={money(revenue)} detail={`${closedOrders.length} O.S. fechadas`} /><Metric label="Ticket médio" value={money(averageTicket)} detail="Média por O.S. fechada" /><Metric label="Conversão de propostas" value={`${conversion.toFixed(1)}%`} detail={`${closedQuotes.length} de ${periodQuotes.length} orçamentos`} /><Metric label="Saúde operacional" value={`${operationalHealth(data)}/100`} detail={lowStock ? `${lowStock} alerta(s) de estoque` : "Sem alertas críticos de estoque"} /></section>
    <section className="bi-grid"><article className="panel bi-chart-card"><header><div><small>EVOLUÇÃO</small><h3>Faturamento mensal</h3></div></header><div className="bi-bars">{rows.map((row) => <div key={row.label}><span>{row.label}</span><i><em style={{ width: `${Math.max(2, row.value / max * 100)}%` }} /></i><b>{money(row.value)}</b><small>{row.orders} O.S.</small></div>)}</div></article><article className="panel bi-attention-card"><header><div><small>ATENÇÃO</small><h3>O que acompanhar</h3></div></header><ul><li><strong>{data.quotes.filter((item) => item.status !== "FECHADO").length}</strong> orçamentos ainda abertos</li><li><strong>{data.attendances.filter((item) => item.status !== "CONCLUIDO").length}</strong> atendimentos em andamento</li><li><strong>{data.appointments.filter((item) => !["CONCLUIDO", "CANCELADO"].includes(item.status)).length}</strong> agendamentos ativos</li><li><strong>{lowStock}</strong> itens no estoque mínimo ou abaixo</li></ul></article></section>
  </div>;
}

function buildCentralMessage(input: { situation: string; tone: QuoteMessageTemplate; customer: string; vehicle: string; value: string; details: string; company: string; variation: number }) {
  const customer = firstName(input.customer || "cliente");
  const vehicle = input.vehicle.trim() ? ` sobre o ${input.vehicle.trim()}` : "";
  const value = input.value.trim() ? ` no valor de ${input.value.trim()}` : "";
  const details = input.details.trim() ? `\n\n${input.details.trim()}` : "";
  const openers: Record<QuoteMessageTemplate, string> = {
    PROFISSIONAL: `Olá, ${customer}. Tudo bem?`,
    DIRETA: `Olá, ${customer}.`,
    CONSULTIVA: `Olá, ${customer}! Analisamos seu atendimento com atenção.`,
    PREVENTIVA: `Olá, ${customer}! Pensando em segurança e prevenção,`,
    AMIGAVEL: `Oi, ${customer}! Tudo certo? 😊`,
    FORMAL: `Prezado(a) ${customer},`,
    COMERCIAL: `Olá, ${customer}! Temos uma atualização importante para você.`,
    CURTA: `${customer},`,
  };
  const situations: Record<string, string[]> = {
    ORCAMENTO: [`seu orçamento${vehicle}${value} está pronto para análise.`, `preparamos a proposta solicitada${vehicle}${value}.`],
    APROVACAO: [`o orçamento enviado aguarda sua aprovação para seguirmos com o atendimento.`, `podemos prosseguir assim que você confirmar a proposta.`],
    LEMBRETE: [`passando para lembrar do atendimento combinado${vehicle}.`, `este é um lembrete sobre a próxima etapa do seu atendimento${vehicle}.`],
    AGENDAMENTO: [`seu agendamento${vehicle} está confirmado.`, `reservamos o horário do seu atendimento${vehicle}.`],
    POS_VENDA: [`queremos saber como foi sua experiência após o atendimento${vehicle}.`, `estamos entrando em contato para acompanhar o resultado do serviço${vehicle}.`],
    RETORNO: [`ainda aguardamos seu retorno para dar continuidade ao atendimento${vehicle}.`, `ficamos à disposição para concluir os próximos passos${vehicle}.`],
  };
  const body = (situations[input.situation] || situations.ORCAMENTO)[input.variation % 2];
  const closing = input.tone === "CURTA" ? "Responda por aqui." : input.tone === "FORMAL" ? `Permanecemos à disposição.\n\nAtenciosamente,\n${input.company}` : `Qualquer dúvida, responda esta mensagem.\n\n${input.company}`;
  return `${openers[input.tone]}\n\n${body}${details}\n\n${closing}`;
}

function MessageCenterPage({ store }: { store: Store }) {
  const [situation, setSituation] = useState("ORCAMENTO");
  const [tone, setTone] = useState<QuoteMessageTemplate>("PROFISSIONAL");
  const [customer, setCustomer] = useState("Cliente");
  const [vehicle, setVehicle] = useState("");
  const [value, setValue] = useState("");
  const [details, setDetails] = useState("");
  const [variation, setVariation] = useState(0);
  const message = buildCentralMessage({ situation, tone, customer, vehicle, value, details, company: store.companyName, variation });
  async function copy() { try { await navigator.clipboard.writeText(message); } catch { window.alert(message); } }
  return <div className="messages-page"><section className="management-heading"><div><small>CENTRAL DE MENSAGENS</small><h2>Comunicação pronta para o cliente</h2><p>Escolha a situação, o tom e os dados que devem entrar no texto.</p></div></section><section className="message-center-grid"><article className="panel message-builder"><div className="message-form-grid"><Field label="Situação"><select value={situation} onChange={(event) => setSituation(event.target.value)}><option value="ORCAMENTO">Envio de orçamento</option><option value="APROVACAO">Aguardando aprovação</option><option value="LEMBRETE">Lembrete</option><option value="AGENDAMENTO">Confirmação de agendamento</option><option value="POS_VENDA">Pós-venda</option><option value="RETORNO">Aguardando retorno</option></select></Field><Field label="Tom"><select value={tone} onChange={(event) => setTone(event.target.value as QuoteMessageTemplate)}>{(["PROFISSIONAL", "DIRETA", "CONSULTIVA", "PREVENTIVA", "AMIGAVEL", "FORMAL", "COMERCIAL", "CURTA"] as QuoteMessageTemplate[]).map((item) => <option value={item} key={item}>{quoteMessageTemplateLabel(item)}</option>)}</select></Field><Field label="Cliente"><input value={customer} onChange={(event) => setCustomer(event.target.value)} /></Field><Field label="Veículo / referência"><input value={vehicle} onChange={(event) => setVehicle(event.target.value)} /></Field><Field label="Valor"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="R$ 0,00" /></Field><Field label="Informações adicionais"><textarea rows={4} value={details} onChange={(event) => setDetails(event.target.value)} /></Field></div></article><article className="panel message-preview"><header><div><small>PRÉVIA</small><h3>Mensagem gerada</h3></div></header><textarea rows={15} value={message} readOnly /><div><button className="outline" onClick={() => setVariation((current) => current + 1)}>Gerar outra variação</button><button className="primary" onClick={copy}>Copiar mensagem</button></div></article></section></div>;
}

function parseKnowledgeFile(name: string, text: string): KnowledgeEntry[] {
  const now = new Date().toISOString();
  if (name.toLowerCase().endsWith(".csv")) {
    const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return rows.slice(rows[0]?.toLowerCase().includes("titulo") ? 1 : 0).map((line, index) => {
      const parts = line.split(/[;,]/).map((part) => part.trim().replace(/^"|"$/g, ""));
      return { id: uid(), title: parts[0] || `Procedimento ${index + 1}`, content: parts.slice(1).join(" · ") || parts[0] || "", tags: [], source: name, createdAt: now, updatedAt: now };
    });
  }
  const chunks = text.split(/\n(?=#{1,3}\s)|\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return chunks.map((part, index) => {
    const lines = part.split(/\r?\n/);
    const title = lines[0].replace(/^#{1,3}\s*/, "").slice(0, 100) || `Procedimento ${index + 1}`;
    return { id: uid(), title, content: lines.slice(1).join("\n").trim() || part, tags: [], source: name, createdAt: now, updatedAt: now };
  });
}

function KnowledgeBasePage({ entries, onChange }: { entries: KnowledgeEntry[]; onChange: (entries: KnowledgeEntry[]) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const filtered = entries.filter((entry) => `${entry.title} ${entry.content} ${entry.tags.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()));
  function add() { if (!title.trim() || !content.trim()) return; const now = new Date().toISOString(); onChange([{ id: uid(), title: title.trim(), content: content.trim(), tags: tags.split(",").map((item) => item.trim()).filter(Boolean), source: "Cadastro manual", createdAt: now, updatedAt: now }, ...entries]); setTitle(""); setContent(""); setTags(""); }
  async function importFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const text = await file.text(); onChange([...parseKnowledgeFile(file.name, text), ...entries]); event.target.value = ""; }
  return <div className="knowledge-page"><section className="management-heading"><div><small>CONHECIMENTO DA IA</small><h2>Procedimentos e padrões da empresa</h2><p>O Assistente Gerivo utiliza estas informações junto aos dados operacionais.</p></div><label className="primary knowledge-import">Importar TXT, CSV ou Markdown<input type="file" accept=".txt,.csv,.md,text/plain,text/csv,text/markdown" onChange={importFile} /></label></section><section className="knowledge-grid"><article className="panel knowledge-form"><header><div><small>NOVO CONHECIMENTO</small><h3>Cadastrar procedimento</h3></div></header><div><Field label="Título"><input value={title} onChange={(event) => setTitle(event.target.value)} /></Field><Field label="Conteúdo"><textarea rows={9} value={content} onChange={(event) => setContent(event.target.value)} /></Field><Field label="Tags separadas por vírgula"><input value={tags} onChange={(event) => setTags(event.target.value)} /></Field><button className="primary" onClick={add}>Salvar conhecimento</button></div></article><article className="panel knowledge-list"><header><div><small>BASE LOCAL</small><h3>{entries.length} registro(s)</h3></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar procedimento" /></header><div>{filtered.length ? filtered.map((entry) => <article key={entry.id}><div><strong>{entry.title}</strong><small>{entry.source} · {formatDate(entry.updatedAt)}</small><p>{entry.content}</p>{entry.tags.length > 0 && <span>{entry.tags.join(" · ")}</span>}</div><button className="danger small" onClick={() => onChange(entries.filter((item) => item.id !== entry.id))}>Excluir</button></article>) : <div className="empty-inline">Nenhum procedimento encontrado.</div>}</div></article></section></div>;
}

function localAssistantAnswer(question: string, data: StoreData) {
  const normalized = question.toLowerCase();
  const knowledge = data.knowledgeBase.find((entry) => `${entry.title} ${entry.content} ${entry.tags.join(" ")}`.toLowerCase().split(/\s+/).some((term) => term.length > 4 && normalized.includes(term)));
  if (knowledge) return { text: `${knowledge.title}: ${knowledge.content}`, source: "Conhecimento da empresa" };
  if (normalized.includes("faturamento") || normalized.includes("vendeu mais")) {
    const now = new Date();
    const rows = Array.from({ length: 12 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1); const value = data.orders.filter((item) => item.status === "FECHADA" && monthKey(item.updatedAt) === monthKey(date)).reduce((total, item) => total + item.total, 0); return { label: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), value }; });
    const total = rows.reduce((sum, row) => sum + row.value, 0); const best = rows.reduce((current, row) => row.value > current.value ? row : current, rows[0]);
    return { text: total ? `Nos últimos 12 meses, o faturamento registrado foi ${money(total)}. O melhor mês foi ${best.label}, com ${money(best.value)}.` : "Ainda não existem O.S. fechadas suficientes para calcular o faturamento.", rows, source: "Motor local" };
  }
  if (normalized.includes("ticket") || normalized.includes("convers")) { const closed = data.orders.filter((item) => item.status === "FECHADA"); const revenue = closed.reduce((total, item) => total + item.total, 0); const conversion = data.quotes.length ? data.quotes.filter((item) => item.status === "FECHADO").length / data.quotes.length * 100 : 0; return { text: `O ticket médio das O.S. fechadas é ${money(closed.length ? revenue / closed.length : 0)}. A conversão dos orçamentos registrados está em ${conversion.toFixed(1)}%.`, source: "Motor local" }; }
  if (normalized.includes("estoque") || normalized.includes("comprar")) { const low = data.catalog.filter((item) => item.kind !== "SERVICO" && item.active && item.stock <= item.minimumStock); return { text: low.length ? `${low.length} itens exigem reposição: ${low.slice(0, 8).map((item) => item.name).join(", ")}.` : "O estoque não possui itens abaixo do mínimo.", source: "Motor local" }; }
  if (normalized.includes("orçamento")) { const open = data.quotes.filter((item) => item.status !== "FECHADO"); return { text: `Existem ${open.length} orçamentos abertos, somando ${money(open.reduce((total, item) => total + item.total, 0))}.`, source: "Motor local" }; }
  if (normalized.includes("agenda") || normalized.includes("agend")) return { text: `Há ${data.appointments.filter((item) => !["CANCELADO", "CONCLUIDO"].includes(item.status)).length} agendamentos ativos nesta loja.`, source: "Motor local" };
  return { text: "Posso analisar faturamento, ticket médio, conversão, orçamentos, estoque, agenda e os procedimentos cadastrados em Conhecimento da IA.", source: "Motor local" };
}

function AssistantPage({ store, data }: { store: Store; data: StoreData }) {
  const [question, setQuestion] = useState("Quais pontos da operação precisam de atenção?");
  const [answer, setAnswer] = useState<{ text: string; rows?: Array<{ label: string; value: number }>; source?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState("Motor local");
  const health = operationalHealth(data);
  const alerts = [data.quotes.filter((item) => item.status !== "FECHADO").length ? `${data.quotes.filter((item) => item.status !== "FECHADO").length} orçamentos em aberto` : "Orçamentos sob controle", data.catalog.filter((item) => item.kind !== "SERVICO" && item.active && item.stock <= item.minimumStock).length ? "Estoque com necessidade de reposição" : "Estoque sem alertas críticos", data.appointments.filter((item) => !["CANCELADO", "CONCLUIDO"].includes(item.status)).length ? "Agenda possui compromissos ativos" : "Agenda sem pendências" ];
  async function analyze(customQuestion?: string) {
    const currentQuestion = customQuestion || question;
    if (customQuestion) setQuestion(customQuestion);
    setLoading(true);
    const local = localAssistantAnswer(currentQuestion, data);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: currentQuestion, company: store.companyName, summary: { health, openQuotes: data.quotes.filter((item) => item.status !== "FECHADO").length, closedOrders: data.orders.filter((item) => item.status === "FECHADA").length, lowStock: data.catalog.filter((item) => item.kind !== "SERVICO" && item.active && item.stock <= item.minimumStock).map((item) => item.name), appointments: data.appointments.filter((item) => !["CANCELADO", "CONCLUIDO"].includes(item.status)).length }, knowledge: data.knowledgeBase.slice(0, 20).map((entry) => ({ title: entry.title, content: entry.content })) }) });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.answer) { setAnswer({ text: payload.answer, source: "IA conectada" }); setEngine("IA conectada"); }
      else { setAnswer(local); setEngine("Motor local"); }
    } catch { setAnswer(local); setEngine("Motor local"); }
    finally { setLoading(false); }
  }
  const max = Math.max(1, ...(answer?.rows?.map((row) => row.value) || [1]));
  return <div className="assistant-page"><section className="assistant-hero assistant-hero-v176"><span><PremiumIcon name="sparkle" size={28} /></span><div><small>ASSISTENTE GERIVO</small><h2>Saúde operacional {health}/100</h2><p>{store.companyName}</p></div><b className={engine === "IA conectada" ? "engine online" : "engine"}>{engine}</b></section><section className="assistant-overview">{alerts.map((alert, index) => <article key={alert}><span>{index + 1}</span><p>{alert}</p></article>)}</section><section className="panel assistant-chat"><div className="assistant-quick-questions">{["Calcule o faturamento dos últimos 12 meses.", "Compare ticket médio e conversão.", "Quais orçamentos precisam de atenção?", "O que devo comprar para o estoque?"].map((item) => <button key={item} onClick={() => void analyze(item)}>{item}</button>)}</div><textarea value={question} onChange={(event) => setQuestion(event.target.value)} /><button className="primary" disabled={loading} onClick={() => void analyze()}>{loading ? "Analisando..." : "Analisar dados"}</button>{answer && <div className="assistant-answer"><strong>{answer.source || "Análise Gerivo"}</strong><p>{answer.text}</p>{answer.rows && <div className="assistant-chart">{answer.rows.map((row) => <div key={row.label}><span>{row.label}</span><i><em style={{ width: `${Math.max(2, row.value / max * 100)}%` }} /></i><b>{money(row.value)}</b></div>)}</div>}<small>A análise respeita a empresa, a loja e os dados disponíveis.</small></div>}</section></div>;
}

type MasterCompanyInput = { groupMode: "NEW" | "EXISTING"; groupId: string; groupName: string; companyName: string; document: string; storeName: string; segment: string };

function MasterCommercialPage({ stores, currentStore, onCreateCompany }: { stores: Store[]; currentStore: Store; onCreateCompany: (input: MasterCompanyInput) => Promise<void> }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<"NEW" | "EXISTING">("NEW");
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [document, setDocument] = useState("");
  const [storeName, setStoreName] = useState("");
  const [segment, setSegment] = useState("OUTRO");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const [plansResult, subscriptionsResult, groupsResult] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order"),
      supabase.from("company_subscriptions").select("*, companies(name, group_id), subscription_plans(name, code)").order("created_at", { ascending: false }),
      supabase.from("business_groups").select("id, name, status, active, companies(id, name, document, status, stores(id, name, public_code))").order("name"),
    ]);
    setPlans(plansResult.data || []);
    setSubscriptions(subscriptionsResult.data || []);
    if (!groupsResult.error) setGroups(groupsResult.data || []);
    else {
      const fallback = Array.from(new Map(stores.map((store) => [store.companyId, { id: store.companyId, name: store.companyName, companies: [{ id: store.companyId, name: store.companyName, document: "", status: "ACTIVE", stores: [{ id: store.id, name: store.name, public_code: store.publicCode }] }] }])).values());
      setGroups(fallback);
    }
  }
  useEffect(() => { void load(); }, []);

  async function activate(companyId: string, planId: string, months: number) {
    const { error } = await supabase.rpc("master_activate_subscription", { p_company_id: companyId, p_plan_id: planId, p_duration_months: months });
    setMessage(error ? error.message : "Assinatura ativada para todo o grupo empresarial.");
    if (!error) await load();
  }
  function resetCreate() { setGroupMode("NEW"); setGroupId(""); setGroupName(""); setCompanyName(""); setDocument(""); setStoreName(""); setSegment("OUTRO"); setCreateError(""); }
  function closeCreateCompany() { if (creating) return; setCreateOpen(false); resetCreate(); }
  async function createCompany() {
    if (!companyName.trim() || !storeName.trim() || creating) return;
    if (groupMode === "NEW" && !groupName.trim()) return setCreateError("Informe o nome do novo grupo empresarial.");
    if (groupMode === "EXISTING" && !groupId) return setCreateError("Selecione o grupo empresarial.");
    setCreating(true); setMessage(""); setCreateError("");
    try {
      await onCreateCompany({ groupMode, groupId, groupName: groupName.trim(), companyName: companyName.trim(), document: document.trim(), storeName: storeName.trim(), segment });
      setCreateOpen(false); resetCreate(); setMessage("Empresa criada. Defina o plano e ative a assinatura do grupo."); await load();
    } catch (error) { setCreateError(error instanceof Error && error.message ? error.message : "Não foi possível criar a empresa."); }
    finally { setCreating(false); }
  }
  const currentSubscription = subscriptions.find((item) => item.company_id === currentStore.companyId);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroups = groups.filter((group) => JSON.stringify(group).toLowerCase().includes(normalizedSearch));
  return <div className="master-page">
    <section className="master-heading"><div><small>GERIVO MASTER</small><h2>Grupos, empresas, unidades e usuários</h2><p>Estrutura: Grupo empresarial → Empresa/CNPJ → Unidade → Usuário.</p></div><button type="button" className="primary" onClick={() => { resetCreate(); setCreateOpen(true); }}>+ Nova empresa</button></section>
    <section className="plan-mini-grid">{plans.map((plan) => { const enterprise = plan.code === "ENTERPRISE"; return <article key={plan.id}><small>{plan.code}</small><h3>{plan.name}</h3><strong>{enterprise ? "A partir de R$ 599/mês" : `${money(plan.monthly_price)}/mês`}</strong><span>{enterprise ? "Empresas, unidades e usuários personalizados" : `${plan.company_limit} empresa(s) · ${plan.store_limit} unidade(s) · ${plan.user_limit} usuários`}</span><button className="primary small" onClick={() => activate(currentStore.companyId, plan.id, 12)}>Ativar 12 meses</button></article>; })}</section>
    <section className="panel subscription-current"><header><div><small>GRUPO DA EMPRESA SELECIONADA</small><h3>{currentStore.companyName}</h3></div></header>{currentSubscription ? <div className="subscription-detail"><strong>{currentSubscription.subscription_plans?.name || "Plano"}</strong><span>Status: {currentSubscription.status}</span><span>Ativação: {currentSubscription.activated_at ? formatDate(currentSubscription.activated_at) : "não ativada"}</span><span>Vencimento: {currentSubscription.expires_at ? formatDate(currentSubscription.expires_at) : "—"}</span></div> : <div className="empty-inline">Grupo ainda sem assinatura ativa.</div>}{message && <div className={message.toLowerCase().includes("não") ? "auth-error" : "auth-success"}>{message}</div>}</section>
    <section className="panel master-groups-panel"><header><div><small>ESTRUTURA EMPRESARIAL</small><h3>{groups.length} grupo(s)</h3></div><input className="master-company-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo, CNPJ, empresa ou unidade" /></header><div className="master-group-list">{filteredGroups.map((group) => <article key={group.id}><header><div><strong>{group.name}</strong><small>{group.companies?.length || 0} empresa(s)</small></div><span>{group.status || "ATIVO"}</span></header><div>{(group.companies || []).map((company: any) => <section key={company.id}><div><b>{company.name}</b><small>{company.document || "CNPJ não informado"}</small></div><ul>{(company.stores || []).map((store: any) => <li key={store.id}>{store.name}<span>ID {store.public_code}</span></li>)}</ul></section>)}</div></article>)}</div></section>
    {createOpen && <div className="modal-backdrop"><section className="compact-modal master-company-modal master-company-modal-v176"><header><div><small>NOVA EMPRESA</small><h2>Cadastrar estrutura do cliente</h2></div><button type="button" disabled={creating} onClick={closeCreateCompany}>×</button></header><div className="master-company-form" aria-busy={creating}><Field label="Vínculo empresarial"><select value={groupMode} onChange={(event) => setGroupMode(event.target.value as "NEW" | "EXISTING")}><option value="NEW">Novo grupo</option><option value="EXISTING">Grupo existente</option></select></Field>{groupMode === "NEW" ? <Field label="Nome do grupo empresarial"><input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Proprietário ou grupo econômico" /></Field> : <Field label="Grupo empresarial"><select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Selecione</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field>}<Field label="Empresa / razão exibida"><input autoFocus value={companyName} onChange={(event) => { setCompanyName(event.target.value); if (!storeName) setStoreName(event.target.value); }} /></Field><Field label="CNPJ"><input value={document} onChange={(event) => setDocument(event.target.value)} placeholder="00.000.000/0000-00" /></Field><Field label="Unidade principal"><input value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="Matriz, Centro, Loja 1..." /></Field><Field label="Segmento"><select value={segment} onChange={(event) => setSegment(event.target.value)}><option value="OFICINA">Oficina e centro automotivo</option><option value="CONCESSIONARIA">Concessionária</option><option value="VAREJO">Comércio varejista</option><option value="CONFEITARIA">Confeitaria</option><option value="SALAO_BELEZA">Salão de beleza</option><option value="ESTETICA_AUTOMOTIVA">Lavagem e estética</option><option value="DELIVERY">Delivery de comida</option><option value="SERVICOS">Prestação de serviços</option><option value="OUTRO">Outro</option></select></Field>{createError && <div className="auth-error master-company-error" role="alert">{createError}</div>}</div><footer><button type="button" className="outline" disabled={creating} onClick={closeCreateCompany}>Cancelar</button><button type="button" className="primary" disabled={creating || !companyName.trim() || !storeName.trim()} onClick={createCompany}>{creating ? "Criando empresa..." : "Criar empresa"}</button></footer></section></div>}
  </div>;
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

  function updateCheckinField(itemId: string, field: "mileage" | "fuel", value: string) {
    const normalized = field === "mileage" ? value.replace(/\D/g, "") : value;
    const stages = attendance.stages.map((currentStage) => currentStage.id === stage.id ? {
      ...currentStage,
      items: currentStage.items.map((item) => item.id === itemId ? { ...item, value: normalized !== "" ? "SIM" as ItemValue : "PENDENTE" as ItemValue } : item),
    } : currentStage);
    patchAttendance({ reception: { ...attendance.reception, [field]: normalized }, stages });
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

  function goToNextPending() {
    const pending = stage.items.find((item) => item.value === "PENDENTE");
    if (!pending) { window.alert("Todos os itens desta etapa já foram respondidos."); return; }
    document.getElementById(`check-${pending.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const stages = attendance.stages.map((item) => item.id === stage.id ? { ...item, status: "CONCLUIDO" as StageStatus, completedAt: now, completedBy: attendance.reception.responsible || "Usuário do sistema" } : item);
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
        <header className="row-head"><div><small>{store.companyName.toUpperCase()} · {attendance.code}</small><h3>Ficha do veículo</h3></div><button className="outline" onClick={onExit}>← Voltar aos atendimentos</button></header>
        <div className="reception">
          <Field label="Cliente"><input value={attendance.reception.customer} disabled={isLocked} onChange={(e) => setReception("customer", e.target.value)} placeholder="Nome do cliente" /></Field>
          <Field label="WhatsApp"><input value={attendance.reception.phone} disabled={isLocked} onChange={(e) => setReception("phone", e.target.value)} placeholder="(00) 00000-0000" /></Field>
          <Field label="Veículo"><input value={attendance.reception.vehicle} disabled={isLocked} onChange={(e) => setReception("vehicle", e.target.value)} placeholder="Modelo e versão" /></Field>
          <Field label="Placa"><input value={attendance.reception.plate} disabled={isLocked} maxLength={7} onChange={(e) => setReception("plate", e.target.value)} placeholder="ABC1D23" /></Field>
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
          <div className="stage-header-actions">{!isLocked && <button className="outline" type="button" onClick={goToNextPending}>Próximo pendente</button>}{isLocked && <button className="reopen-button" onClick={reopenStage}>Reabrir etapa</button>}<label className={isLocked ? "photo-button disabled" : "photo-button"}>📷 Fotos gerais<input disabled={isLocked} type="file" accept="image/*" capture="environment" multiple onChange={addStagePhotos} /></label></div>
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
              {items.map((item) => item.mode === "MILEAGE" ? (
                <MileageChecklistRow key={item.id} item={item} value={attendance.reception.mileage} locked={isLocked} onChange={(value) => updateCheckinField(item.id, "mileage", value)} />
              ) : item.mode === "FUEL" ? (
                <FuelChecklistRow key={item.id} item={item} value={attendance.reception.fuel} locked={isLocked} onChange={(value) => updateCheckinField(item.id, "fuel", value)} />
              ) : (
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
            <><div><strong>Finalizar {stage.label}</strong><span>Ao concluir, o atendimento volta para a tela principal.</span></div><button className="primary" onClick={completeStage}>{stage.id === "checkin" ? "Concluir Check-in" : `Concluir ${stage.label}`}</button></>
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
  if (["BOM", "SIM", "OK", "NORMAL"].includes(value)) return "✓";
  if (["REGULAR", "AVARIADO", "AVARIA", "INCOMPLETO", "MAL_ODOR"].includes(value)) return "!";
  if (["RUIM", "NAO"].includes(value)) return "×";
  if (["NAO_SE_APLICA", "NAO_POSSUI"].includes(value)) return "—";
  if (value === "EXPRESSA") return "⚡";
  if (value === "OUTRO") return "+";
  return "·";
}

function optionsForMode(mode: ResponseMode): ItemOption[] {
  if (mode === "PRESENCE") return PRESENCE_OPTIONS;
  if (mode === "YES_NO") return YES_NO_OPTIONS;
  if (mode === "WASH") return WASH_OPTIONS;
  if (mode === "MATS") return MATS_OPTIONS;
  if (mode === "PRESENCE_DAMAGE") return PRESENCE_DAMAGE_OPTIONS;
  if (mode === "AIR_CONDITIONING") return AIR_CONDITIONING_OPTIONS;
  if (mode === "BELONGINGS") return BELONGINGS_OPTIONS;
  if (mode === "TIRE") return TIRE_OPTIONS;
  if (mode === "SIDE_TRIM") return SIDE_TRIM_OPTIONS;
  if (mode === "MIRROR") return MIRROR_OPTIONS;
  if (mode === "OK_DAMAGE_OTHER") return OK_DAMAGE_OTHER_OPTIONS;
  if (mode === "OK_DAMAGE_NA") return OK_DAMAGE_NA_OPTIONS;
  if (mode === "GOOD_OTHER") return GOOD_OTHER_OPTIONS;
  if (mode === "GOOD_NA") return GOOD_NA_OPTIONS;
  if (mode === "TOOLS") return TOOLS_OPTIONS;
  return CONDITION_OPTIONS;
}

function MileageChecklistRow({ item, value, locked, onChange }: { item: CheckItem; value: string; locked: boolean; onChange: (value: string) => void }) {
  return <div id={`check-${item.key}`} className={`check-item workshop-item checklist-special-row ${value ? "value-sim" : "value-pendente"}`}><div className="special-check-main"><div className="item-title"><strong>{item.label}</strong><span>{value ? `${Number(value).toLocaleString("pt-BR")} km` : "Pendente"}</span></div><div className="mileage-check-control"><input aria-label="Quilometragem" inputMode="numeric" pattern="[0-9]*" disabled={locked} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Digite a quilometragem" /><small>No celular será aberto somente o teclado numérico.</small></div></div></div>;
}

function FuelChecklistRow({ item, value, locked, onChange }: { item: CheckItem; value: string; locked: boolean; onChange: (value: string) => void }) {
  const levels = [{ value: "0", label: "Reserva" }, { value: "1", label: "1/4" }, { value: "2", label: "1/2" }, { value: "3", label: "3/4" }, { value: "4", label: "Cheio" }];
  return <div id={`check-${item.key}`} className={`check-item workshop-item checklist-special-row ${value !== "" ? "value-sim" : "value-pendente"}`}><div className="special-check-main"><div className="item-title"><strong>{item.label}</strong><span>{value !== "" ? fuelLevelLabel(value) : "Pendente"}</span></div><div className="fuel-segment-control" role="group" aria-label="Nível de combustível">{levels.map((level, index) => <button type="button" disabled={locked} key={level.value} className={value === level.value ? "active" : value !== "" && Number(value) >= index ? "filled" : ""} onClick={() => onChange(level.value)}><i /><span>{level.label}</span></button>)}</div></div></div>;
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
  const showNote = noteOpen || Boolean(item.note) || item.key === "wash-request" || item.key === "belongings" || item.key.startsWith("road-test") || ["REGULAR", "RUIM", "AVARIADO", "AVARIA", "INCOMPLETO", "MAL_ODOR", "NAO", "OUTRO"].includes(item.value);
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
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ReportConfig>({
    includeCustomer: true,
    stageIds: attendance.stages.map((stage) => stage.id),
    includeTechnicalReport: true,
    includeGeneralPhotos: true,
    includeItemPhotos: true,
    includeSignatures: true,
  });
  function saveReport() {
    const blob = new Blob([createReportHtml(store, attendance, "MODULAR", config)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `checklist-${attendance.reception.plate || attendance.code}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function printReport(mode: ReportMode, customConfig?: Partial<ReportConfig>) {
    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) return window.alert("O navegador bloqueou a janela de impressão.");
    popup.document.write(createReportHtml(store, attendance, mode, customConfig));
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
  function toggleStage(stageId: StageId) {
    setConfig({ ...config, stageIds: config.stageIds.includes(stageId) ? config.stageIds.filter((id) => id !== stageId) : [...config.stageIds, stageId] });
  }
  return <>
    <div className="report-buttons"><button onClick={() => setOpen(true)}>Impressão modular</button><button onClick={() => printReport("SUMMARY")}>Resumo</button><button className="primary" onClick={shareReport}>Compartilhar</button></div>
    {open && <div className="modal-backdrop"><section className="compact-modal report-config-modal">
      <header><div><small>RELATÓRIO MODULAR</small><h2>Selecione o conteúdo</h2></div><button onClick={() => setOpen(false)}>×</button></header>
      <div className="report-config-grid">
        <label><input type="checkbox" checked={config.includeCustomer} onChange={(e) => setConfig({ ...config, includeCustomer: e.target.checked })} /> Dados do cliente e veículo</label>
        {attendance.stages.map((stage) => <label key={stage.id}><input type="checkbox" checked={config.stageIds.includes(stage.id)} onChange={() => toggleStage(stage.id)} /> {stage.label}</label>)}
        <label><input type="checkbox" checked={config.includeTechnicalReport} onChange={(e) => setConfig({ ...config, includeTechnicalReport: e.target.checked })} /> Laudo técnico</label>
        <label><input type="checkbox" checked={config.includeGeneralPhotos} onChange={(e) => setConfig({ ...config, includeGeneralPhotos: e.target.checked })} /> Fotos gerais</label>
        <label><input type="checkbox" checked={config.includeItemPhotos} onChange={(e) => setConfig({ ...config, includeItemPhotos: e.target.checked })} /> Fotos dos itens</label>
        <label><input type="checkbox" checked={config.includeSignatures} onChange={(e) => setConfig({ ...config, includeSignatures: e.target.checked })} /> Assinaturas</label>
      </div>
      <footer><button className="outline" onClick={saveReport}>Baixar HTML</button><button className="primary" onClick={() => printReport("MODULAR", config)}>Imprimir / PDF</button></footer>
    </section></div>}
  </>;
}

function StoreSwitcherModal({ stores, currentStoreId, onClose, onSelect }: { stores: Store[]; currentStoreId: string; onClose: () => void; onSelect: (storeId: string) => void }) {
  return <div className="modal-backdrop"><section className="compact-modal store-switcher-modal">
    <header><div><small>EMPRESAS</small><h2>Selecione a empresa</h2></div><button onClick={onClose}>×</button></header>
    <div className="store-options">{stores.map((store) => <button key={store.id} className={store.id === currentStoreId ? "store-option active" : "store-option"} onClick={() => onSelect(store.id)}><span><PremiumIcon name="store" size={20} /></span><div><strong>{store.companyName}</strong></div>{store.id === currentStoreId ? <b>Atual</b> : <PremiumIcon name="chevron" size={16} />}</button>)}</div>
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
    <div className="profile-content"><div className="profile-photo-editor"><div>{draft.photo ? <img src={draft.photo} alt="Foto do perfil" /> : <PremiumIcon name="user" size={34} />}</div><label><PremiumIcon name="camera" size={16} /> {processing ? "Processando..." : "Alterar foto"}<input type="file" accept="image/*" onChange={changePhoto} /></label>{draft.photo && <button onClick={() => setDraft({ ...draft, photo: "" })}>Remover foto</button>}</div><div className="profile-fields"><Field label="Como deseja ser chamado"><input value={draft.preferredName} onChange={(e) => setDraft({ ...draft, preferredName: e.target.value })} placeholder="Seu nome" /></Field><Field label="Usuário"><input value={draft.username} disabled /></Field><Field label="Telefone"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(00) 00000-0000" /></Field><Field label="E-mail de recuperação"><input type="email" value={draft.email} disabled /></Field></div></div>
    <footer><button className="outline" onClick={onClose}>Cancelar</button><button className="primary" onClick={() => onSave(draft)}>Salvar perfil</button></footer>
  </section></div>;
}

function CompanySettingsModal({
  companySettings,
  companyIdentity,
  checklistSettings,
  isPlatformMaster,
  onClose,
  onSave,
  initialTab,
}: {
  companySettings: CompanySettings;
  companyIdentity: CompanyIdentity;
  checklistSettings: ChecklistSettings;
  isPlatformMaster: boolean;
  onClose: () => void;
  onSave: (companySettings: CompanySettings, checklistSettings: ChecklistSettings, companyIdentity: CompanyIdentity) => void;
  initialTab: SettingsTab;
}) {
  const [companyDraft, setCompanyDraft] = useState<CompanySettings>(() => JSON.parse(JSON.stringify(companySettings)) as CompanySettings);
  const [identityDraft, setIdentityDraft] = useState<CompanyIdentity>(() => ({ ...companyIdentity }));
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState<ChecklistSettings>(() => JSON.parse(JSON.stringify(checklistSettings)) as ChecklistSettings);
  const [tab, setTab] = useState<SettingsTab>(initialTab === "MODULES" && !isPlatformMaster ? "IDENTITY" : initialTab);

  function setProfile(profile: CompanyProfile) {
    if (profile === "FULL") {
      setCompanyDraft({ ...companyDraft, profile, modules: { APPOINTMENTS: true, CATALOG: true, INVENTORY: true, CHECKLIST: true, ORDERS: true, QUOTES: true, ASSISTANT: true } });
      return;
    }
    if (profile === "QUOTE_ONLY") {
      setCompanyDraft({ ...companyDraft, profile, modules: { APPOINTMENTS: false, CATALOG: true, INVENTORY: false, CHECKLIST: false, ORDERS: false, QUOTES: true, ASSISTANT: false } });
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
    <header><div><small>CONFIGURAÇÃO POR EMPRESA</small><h2>{tab === "IDENTITY" ? "Identidade visual" : tab === "CHECKLIST" ? "Modelos de checklist" : tab === "QUOTES" ? "Orçamentos" : tab === "PRICING" ? "Formação de preço" : "Módulos contratados"}</h2></div><button onClick={onClose}>×</button></header>
    <nav className="settings-tabs"><button className={tab === "IDENTITY" ? "active" : ""} onClick={() => setTab("IDENTITY")}>Identidade</button><button className={tab === "PRICING" ? "active" : ""} onClick={() => setTab("PRICING")}>Preços</button>{isPlatformMaster && <button className={tab === "MODULES" ? "active" : ""} onClick={() => setTab("MODULES")}>Módulos</button>}<button disabled={!companyDraft.modules.CHECKLIST} className={tab === "CHECKLIST" ? "active" : ""} onClick={() => setTab("CHECKLIST")}>Checklist</button><button disabled={!companyDraft.modules.QUOTES} className={tab === "QUOTES" ? "active" : ""} onClick={() => setTab("QUOTES")}>Orçamentos</button></nav>

    {tab === "IDENTITY" && <div className="company-settings-content identity-settings-content">
      <section className="identity-editor-grid">
        <div className="identity-preview" style={{ background: identityDraft.sidebarColor, ...sidebarThemeVariables(identityDraft.sidebarColor) } as any}>
          <div>{identityDraft.logo ? <img src={identityDraft.logo} alt={identityDraft.displayName} /> : <img src={sidebarIsLight(identityDraft.sidebarColor) ? "/gerivo-logo.png" : "/gerivo-logo-light.png"} alt="Gerivo" />}</div>
          <strong>{identityDraft.displayName || "Nome da empresa"}</strong>
          {identityDraft.logo && <small><img src={sidebarIsLight(identityDraft.sidebarColor) ? "/gerivo-mark.png" : "/gerivo-mark-light.png"} alt="" /> Tecnologia Gerivo</small>}
        </div>
        <div className="identity-controls">
          <Field label="Nome exibido no sistema"><input value={identityDraft.displayName} onChange={(event) => setIdentityDraft({ ...identityDraft, displayName: event.target.value })} placeholder="Nome da oficina ou empresa" /></Field>
          <label className="logo-upload-control"><span>Logo da empresa</span><div>{identityDraft.logo && <img src={identityDraft.logo} alt="Prévia da logo" />}<label className="outline">{logoProcessing ? "Processando..." : identityDraft.logo ? "Trocar logo" : "Escolher logo"}<input type="file" accept="image/*" onChange={uploadCompanyLogo} disabled={logoProcessing} /></label>{identityDraft.logo && <button className="danger" type="button" onClick={() => setIdentityDraft({ ...identityDraft, logo: "" })}>Remover</button>}</div></label>
          <div className="identity-color-grid">
            <div className="sidebar-color-control"><span>Cor da barra lateral</span><div><input type="color" value={identityDraft.sidebarColor} onChange={(event) => setIdentityDraft({ ...identityDraft, sidebarColor: event.target.value })} /><input value={identityDraft.sidebarColor} maxLength={7} onChange={(event) => setIdentityDraft({ ...identityDraft, sidebarColor: event.target.value })} /></div><div className="color-presets">{["#0B1F3A", "#2B2F36", "#152A4A", "#0D3F46", "#3B224F", "#4A1F27"].map((color) => <button key={color} type="button" style={{ background: color }} aria-label={`Usar cor ${color}`} onClick={() => setIdentityDraft({ ...identityDraft, sidebarColor: color })} />)}</div></div>
            <div className="sidebar-color-control"><span>Cor das seleções e destaques</span><div><input type="color" value={identityDraft.selectionColor} onChange={(event) => setIdentityDraft({ ...identityDraft, selectionColor: event.target.value })} /><input value={identityDraft.selectionColor} maxLength={7} onChange={(event) => setIdentityDraft({ ...identityDraft, selectionColor: event.target.value })} /></div><div className="color-presets">{["#C89B3C", "#0B1F3A", "#1268B3", "#7C3AED", "#C2415D", "#334155"].map((color) => <button key={color} type="button" style={{ background: color }} aria-label={`Usar cor ${color}`} onClick={() => setIdentityDraft({ ...identityDraft, selectionColor: color })} />)}</div><div className="selection-preview" style={selectionThemeVariables(identityDraft.selectionColor) as any}><span>Prévia</span><button type="button">Seleção ativa</button></div></div>
          </div>
        </div>
      </section>
    </div>}

    {tab === "PRICING" && <div className="company-settings-content pricing-settings"><div className="pricing-general-card"><small>MARGEM GERAL</small><h3>Formação de preço padrão</h3><Field label="Margem sobre o custo (%)"><input inputMode="decimal" value={companyDraft.generalMargin} onChange={(e) => setCompanyDraft({ ...companyDraft, generalMargin: Math.max(0, Number(e.target.value) || 0) })} /></Field><p>Itens sem margem individual utilizam automaticamente esta configuração.</p></div></div>}

    {tab === "MODULES" && isPlatformMaster && <div className="company-settings-content">
      <div className="profile-selector">
        <button className={companyDraft.profile === "FULL" ? "active" : ""} onClick={() => setProfile("FULL")}><strong>Sistema completo</strong></button>
        <button className={companyDraft.profile === "QUOTE_ONLY" ? "active" : ""} onClick={() => setProfile("QUOTE_ONLY")}><strong>Somente orçamentos</strong></button>
        <button className={companyDraft.profile === "CUSTOM" ? "active" : ""} onClick={() => setProfile("CUSTOM")}><strong>Personalizado</strong></button>
      </div>
      <div className="module-selector">
        {(Object.keys(MODULE_INFO) as CompanyModule[]).map((module) => <label key={module} className={companyDraft.modules[module] ? "module-card enabled" : "module-card"}>
          <input type="checkbox" checked={companyDraft.modules[module]} onChange={() => toggleModule(module)} />
          <div><strong>{MODULE_INFO[module].label}</strong></div>
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
          {(["PROFISSIONAL", "DIRETA", "CONSULTIVA", "PREVENTIVA", "AMIGAVEL", "FORMAL", "COMERCIAL", "CURTA"] as QuoteMessageTemplate[]).map((template) => (
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

    <footer><button className="outline" onClick={onClose}>Cancelar</button><button className="primary" onClick={() => onSave(isPlatformMaster ? companyDraft : { ...companyDraft, profile: companySettings.profile, modules: companySettings.modules }, checklistDraft, { ...identityDraft, displayName: identityDraft.displayName.trim() || companyIdentity.displayName, sidebarColor: /^#[0-9a-f]{6}$/i.test(identityDraft.sidebarColor) ? identityDraft.sidebarColor : companyIdentity.sidebarColor, selectionColor: /^#[0-9a-f]{6}$/i.test(identityDraft.selectionColor) ? identityDraft.selectionColor : companyIdentity.selectionColor })}>Salvar configuração</button></footer>
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
      <div className="module-intro compact"><div><small>CONTROLE DE CHECKLISTS</small><h2>Recepções e inspeções</h2></div></div>
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
      <div className="module-intro compact"><div><small>EXECUÇÃO E CONTROLE</small><h2>Gestão de ordens de serviço</h2></div></div>
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
      <div className="module-intro compact"><div><small>ORÇAMENTAÇÃO</small><h2>Gestão de orçamentos</h2></div></div>
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
        {items.length === 0 ? <div className="document-items-empty">Nenhum item adicionado. Use o catálogo ou crie um item livre.</div> : items.map((item) => <div key={item.id} className="document-item-row"><select value={item.kind} onChange={(event) => updateItem(item.id, { kind: event.target.value as CatalogKind })}><option value="SERVICO">Serviço</option><option value="PECA">Peça</option><option value="PRODUTO">Produto</option><option value="KIT">Kit</option><option value="MATERIAL">Material</option></select><div className="document-item-description"><input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} placeholder="Descrição do item" /><input value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} placeholder="Detalhe, categoria ou observação" /></div><input type="number" min="0" step="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(0, Number(event.target.value) || 0) })} /><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })} /><strong>{money(lineTotal(item))}</strong><button className="document-remove-item" type="button" onClick={() => onChange(items.filter((current) => current.id !== item.id))}><PremiumIcon name="trash" size={16} /></button></div>)}
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

function quoteDisplayItems(quote: Quote) {
  const valid = quote.items.filter((item) => item.name.trim());
  if (!quote.combinePartsLabor || valid.length <= 1) return valid;
  const services = valid.filter((item) => item.kind === "SERVICO");
  const materials = valid.filter((item) => item.kind !== "SERVICO");
  if (!materials.length) return valid;
  const base = services[0] ?? materials[0];
  const total = valid.reduce((sum, item) => sum + lineTotal(item), 0);
  const names = valid.map((item) => item.name.trim()).filter(Boolean);
  const description = services.length
    ? [base.description.trim(), `Inclui: ${names.join(" · ")}`].filter(Boolean).join(" — ")
    : [base.description.trim(), names.slice(1).length ? `Composição: ${names.join(" · ")}` : ""].filter(Boolean).join(" — ");
  return [{ ...base, id: `${base.id}-combined`, quantity: 1, unitPrice: total, description, kind: services.length ? "SERVICO" as CatalogKind : base.kind }];
}

function buildQuoteMessage(quote: Quote, companyName: string, consultiveEnhancement = false) {
  const validItems = quoteDisplayItems(quote);
  const lines = validItems.map((item) => `• ${item.name}${item.description ? ` — ${item.description}` : ""} — ${money(lineTotal(item))}`);
  const greeting = `Olá, ${firstName(quote.customer)}! 👋`;
  const vehicle = `${quote.vehicle}${quote.plate ? ` · ${quote.plate}` : ""}`;
  const payment = `💳 Condição de pagamento: ${paymentDescription(quote)}`;
  const validity = quote.validityDays > 0 ? `📅 Validade da proposta: ${quote.validityDays} dias` : "";
  const notes = quote.notes.trim() ? `📝 Observações: ${quote.notes.trim()}` : "";
  const consultiveSummary = consultiveEnhancement ? ["", "💡 Podemos esclarecer cada item e organizar a execução conforme a sua prioridade."] : [];
  const common = [`🚗 Veículo: ${vehicle}`, "", "📋 Itens da proposta:", ...lines, "", `💰 Total: ${money(quote.total)}`, payment, validity, notes].filter(Boolean);

  if (quote.messageTemplate === "CURTA") return [`${firstName(quote.customer)}, orçamento ${quote.code}:`, ...lines, `Total: ${money(quote.total)}.`, "Responda para aprovar ou solicitar ajuste."].join("\n");
  if (quote.messageTemplate === "FORMAL") return [`Prezado(a) ${quote.customer || "cliente"},`, "", `Encaminhamos a proposta ${quote.code} elaborada pela ${companyName}.`, ...common, "", "Permanecemos à disposição para esclarecimentos e autorização.", "", `Atenciosamente,\n${companyName}`].join("\n");
  if (quote.messageTemplate === "AMIGAVEL") return [`Oi, ${firstName(quote.customer)}! Tudo certo? 😊`, "", `Preparamos o orçamento ${quote.code} para você.`, ...common, "", "Pode chamar por aqui para aprovar ou ajustar qualquer item. 👍", "", companyName].join("\n");
  if (quote.messageTemplate === "COMERCIAL") return [greeting, "", `Temos sua proposta ${quote.code} pronta para avançar.`, ...common, "", "✨ Podemos organizar a melhor condição para você e reservar a execução após a confirmação.", "", `Fale com a equipe da ${companyName}.`].join("\n");
  if (quote.messageTemplate === "DIRETA") return [greeting, "", `📄 Orçamento ${quote.code} — ${companyName}`, ...common, ...consultiveSummary, "", "✅ Para aprovar, responda *APROVO*. Para ajustes, envie sua dúvida por aqui."].filter(Boolean).join("\n");
  if (quote.messageTemplate === "CONSULTIVA") return [greeting, "", `Realizamos a análise do atendimento e preparamos o orçamento ${quote.code}.`, ...common, "", "💡 Nossa equipe está disponível para explicar cada recomendação e organizar a execução conforme sua necessidade.", ...consultiveSummary, "", "✅ Para autorizar ou solicitar uma revisão, basta responder esta mensagem.", "", `Atenciosamente,\n${companyName}`].filter(Boolean).join("\n");
  if (quote.messageTemplate === "PREVENTIVA") return [greeting, "", `🛡️ Pensando na segurança e na confiabilidade do seu veículo, preparamos o orçamento ${quote.code}.`, ...common, "", "🔍 A manutenção preventiva ajuda a reduzir falhas e preservar o bom funcionamento do veículo.", ...consultiveSummary, "", "✅ Responda para aprovar os itens desejados ou conversar com nossa equipe.", "", companyName].filter(Boolean).join("\n");
  return [greeting, "", `A ${companyName} preparou o orçamento ${quote.code} para o seu veículo.`, ...common, ...consultiveSummary, "", "✅ Para aprovar, solicitar alterações ou esclarecer dúvidas, responda esta mensagem.", "", `Atenciosamente,\n${companyName}`].filter(Boolean).join("\n");
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
  const displayItems = quoteDisplayItems(quote);
  const subtotal = itemsSubtotal(quote.items);
  const discount = Math.max(0, subtotal - quote.total);
  const accent = /^#[0-9a-f]{6}$/i.test(companyIdentity.selectionColor) ? companyIdentity.selectionColor : "#0f766e";
  const rows = displayItems.map((item, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td><b>${escapeHtml(item.name)}</b>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${money(lineTotal(item))}</td></tr>`).join("");
  const logo = companyIdentity.logo ? `<img src="${companyIdentity.logo}" alt="${escapeHtml(companyIdentity.displayName)}">` : `<div class="logo-fallback">${escapeHtml(companyIdentity.displayName.slice(0, 2).toUpperCase())}</div>`;
  const emittedAt = new Date(quote.updatedAt).toLocaleDateString("pt-BR");
  const validity = quote.validityDays > 0 ? `<div><span>Validade</span><strong>${quote.validityDays} dias</strong></div>` : "";
  const payment = paymentDescription(quote).trim() ? `<div><span>Forma de pagamento</span><strong>${escapeHtml(paymentDescription(quote))}</strong></div>` : "";
  const discountRow = discount > 0 ? `<div class="discount"><span>Descontos</span><b>- ${money(discount)}</b></div>` : "";
  const title = [quote.vehicle.trim(), quote.plate.trim()].filter(Boolean).join(" · ") || quote.code;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orçamento ${escapeHtml(title)}</title><style>
  :root{--accent:${accent};--ink:#14212c;--muted:#64727d;--line:#d9e1e6;--soft:#f5f8f9}@page{size:A4;margin:11mm}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#eef2f4;font-family:Inter,Arial,sans-serif;font-size:11px}.sheet{max-width:210mm;min-height:275mm;margin:14px auto;padding:14mm;background:#fff;box-shadow:0 18px 50px rgba(20,33,44,.12)}.toolbar{max-width:210mm;margin:10px auto;text-align:right}.toolbar button{padding:10px 16px;border:0;border-radius:8px;color:#fff;background:var(--accent);font-weight:800}.accent{height:7px;margin:-14mm -14mm 12mm;background:var(--accent)}.header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.brand{display:flex;align-items:center;gap:13px}.brand img{max-width:150px;max-height:60px;object-fit:contain}.logo-fallback{width:58px;height:58px;display:grid;place-items:center;border-radius:13px;color:#fff;background:var(--accent);font-size:20px;font-weight:900}.brand h1{margin:0;font-size:22px}.brand p{margin:5px 0 0;color:var(--muted)}.document{text-align:right}.document small{color:var(--muted);font-weight:800;letter-spacing:.1em}.document h2{max-width:320px;margin:5px 0;font-size:20px}.document b{color:var(--accent)}.data{margin-top:20px;border:1px solid var(--line);border-radius:12px;overflow:hidden}.section-title{padding:9px 12px;color:#fff;background:var(--accent);font-size:9px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.data-grid{display:grid;grid-template-columns:1.4fr 1.2fr .8fr .8fr}.data-grid div,.commercial div{padding:11px 12px}.data-grid span,.commercial span{display:block;margin-bottom:4px;color:var(--muted);font-size:8px;font-weight:800;text-transform:uppercase}.commercial{display:flex;gap:10px;margin-top:10px;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--soft)}.items-title{display:flex;justify-content:space-between;align-items:end;margin-top:19px;padding-bottom:7px;border-bottom:2px solid var(--accent)}.items-title h3{margin:0}table{width:100%;border-collapse:collapse;margin-top:7px}th{padding:9px 7px;color:#fff;background:#23313c;text-align:left;font-size:8px;text-transform:uppercase}td{padding:10px 7px;border-bottom:1px solid var(--line);vertical-align:top}td:nth-child(n+3),th:nth-child(n+3){text-align:right}td small{display:block;margin-top:4px;color:var(--muted);line-height:1.4}.bottom{display:grid;grid-template-columns:1fr 280px;gap:14px;margin-top:15px}.notes,.summary{padding:12px;border:1px solid var(--line);border-radius:10px}.notes{white-space:pre-wrap}.notes b{display:block;margin-bottom:7px}.summary{background:var(--soft)}.summary div{display:flex;justify-content:space-between;padding:5px 0}.summary .discount{color:#b42334}.summary .total{margin-top:7px;padding-top:10px;border-top:2px solid var(--accent);font-size:17px}.footer{margin-top:22px;padding-top:10px;border-top:1px solid var(--line);color:var(--muted);text-align:center;font-size:8px}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;padding:0;box-shadow:none}.accent{margin:0 0 10mm}}@media(max-width:760px){.sheet{margin:0;padding:18px}.accent{margin:-18px -18px 18px}.header,.bottom{display:grid;grid-template-columns:1fr}.document{text-align:left}.data-grid{grid-template-columns:1fr 1fr}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / salvar PDF</button></div><main class="sheet"><div class="accent"></div><header class="header"><div class="brand">${logo}<div><h1>${escapeHtml(companyIdentity.displayName)}</h1><p>Proposta de serviços, peças e produtos</p></div></div><div class="document"><small>ORÇAMENTO</small><h2>${escapeHtml(title)}</h2><b>${escapeHtml(quote.code)}</b></div></header><section class="data"><div class="section-title">Dados</div><div class="data-grid"><div><span>Cliente</span><strong>${escapeHtml(quote.customer)}</strong></div><div><span>Veículo</span><strong>${escapeHtml(quote.vehicle)}</strong></div><div><span>Placa</span><strong>${escapeHtml(quote.plate)}</strong></div><div><span>Emissão</span><strong>${emittedAt}</strong></div></div></section>${payment || validity ? `<section class="commercial">${payment}${validity}</section>` : ""}<div class="items-title"><h3>Itens do orçamento</h3><span>${displayItems.length} item(ns)</span></div><table><thead><tr><th>#</th><th>Descrição</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Nenhum item informado.</td></tr>'}</tbody></table><section class="bottom"><div class="notes"><b>Observações</b>${quote.notes ? escapeHtml(quote.notes) : "Nenhuma observação adicional informada."}</div><aside class="summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div>${discountRow}<div class="total"><span>Total final</span><b>${money(quote.total)}</b></div></aside></section><footer class="footer">Gerivo</footer></main></body></html>`;
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
      <article className="document-editor-card"><h3>Condições comerciais</h3><div className="document-form-grid"><Field label="Status"><select value={quote.status} onChange={(event) => update({ status: event.target.value as QuoteStatus })}><option value="ABERTO">Aberto</option><option value="FECHADO">Fechado</option><option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option><option value="AGUARDANDO_COTACAO">Aguardando cotação</option><option value="AGUARDANDO_DIGITACAO">Aguardando digitação</option><option value="INCOMPLETO">Incompleto</option><option value="AGUARDANDO_RETORNO_CLIENTE">Aguardando retorno do cliente</option><option value="AGUARDANDO_DESCONTO">Aguardando desconto</option></select></Field><Field label="Validade"><div className="validity-field"><div className="input-suffix"><input type="number" min="0" value={quote.validityDays} onChange={(event) => update({ validityDays: Math.max(0, Number(event.target.value) || 0) })} /><span>dias</span></div><small>Use 0 para não exibir validade.</small></div></Field><Field label="Forma de pagamento"><select value={quote.paymentMethod} onChange={(event) => update({ paymentMethod: event.target.value as PaymentMethod })}><option value="PIX">Pix</option><option value="DEBITO">Débito</option><option value="CREDITO">Crédito</option><option value="DINHEIRO">Dinheiro</option><option value="OUTRO">Outro</option></select></Field>{quote.paymentMethod === "CREDITO" && <Field label="Parcelamento em até"><select value={quote.installments} onChange={(event) => update({ installments: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}x</option>)}</select></Field>}<Field label="Desconto R$"><input type="number" min="0" step="0.01" value={quote.discountAmount} onChange={(event) => update({ discountAmount: Math.max(0, Number(event.target.value) || 0) })} /></Field><Field label="Desconto %"><input type="number" min="0" max="100" step="0.01" value={quote.discountPercent} onChange={(event) => update({ discountPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></Field></div><label className="quote-combine-toggle"><input type="checkbox" checked={quote.combinePartsLabor} onChange={(event) => update({ combinePartsLabor: event.target.checked })} /><span><strong>Unir peça + mão de obra</strong><small>Oculta peças e materiais no documento e soma seus valores ao serviço.</small></span></label></article>
      <article className="document-editor-card quote-message-card"><div className="message-card-heading"><div><h3>Mensagem ao cliente</h3><span>Modelo profissional com emojis e edição livre.</span></div><select value={quote.messageTemplate} onChange={(event) => changeTemplate(event.target.value as QuoteMessageTemplate)}>{(["PROFISSIONAL", "DIRETA", "CONSULTIVA", "PREVENTIVA", "AMIGAVEL", "FORMAL", "COMERCIAL", "CURTA"] as QuoteMessageTemplate[]).map((template) => <option key={template} value={template}>{quoteMessageTemplateLabel(template)}</option>)}</select></div><textarea rows={14} value={message} onChange={(event) => setMessageOverride(event.target.value)} /><div className="quote-message-actions"><span>Padrão da empresa: {quoteDeliveryLabel(deliveryMode)}</span><button className="outline" type="button" onClick={() => setMessageOverride(null)}>Restaurar automático</button>{deliveryMode !== "LINK" && <button className="outline" type="button" onClick={copyMessage}>Copiar mensagem</button>}<button className="primary" type="button" onClick={shareWhatsApp}>Abrir WhatsApp</button></div></article>
    </section>
    <section className="quote-ai-assistant"><div className="quote-ai-heading"><div className="quote-ai-icon">✦</div><div><small>ASSISTENTE CONSULTIVO GERIVO</small><h3>Análise inteligente da proposta</h3><p>Revisa clareza, condições comerciais e prontidão para envio.</p></div><div><button className="outline" type="button" onClick={() => setAssistantOpen((current) => !current)}>{assistantOpen ? "Ocultar análise" : "Analisar orçamento"}</button><button className="primary" type="button" onClick={applyConsultiveImprovement}>Melhorar mensagem</button></div></div>{assistantOpen && <div className="quote-ai-suggestions">{suggestions.map((suggestion, index) => <div key={`${index}-${suggestion}`}><span>{index + 1}</span><p>{suggestion}</p></div>)}</div>}</section>
    <DocumentItemsEditor items={quote.items} catalog={catalog} onChange={(items) => update({ items })} />
    <section className="quote-summary-grid"><Field label="Observações da proposta"><textarea rows={4} value={quote.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Prazo de execução, garantia, disponibilidade de peças ou informações adicionais." /></Field><aside><span>Subtotal</span><b>{money(subtotal)}</b>{Math.max(0, subtotal - total) > 0 && <><span>Descontos</span><b>- {money(Math.max(0, subtotal - total))}</b></>}<strong>Total final</strong><em>{money(total)}</em></aside></section>
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
