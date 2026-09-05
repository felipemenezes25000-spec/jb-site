-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('admin', 'gestor', 'comercial', 'tecnico', 'editor');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('fisica', 'juridica');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('novo', 'seminovo', 'usado', 'recondicionado');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('disponivel', 'reservado', 'vendido', 'indisponivel');

-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('entrada', 'saida', 'reserva', 'liberacao_reserva', 'ajuste', 'devolucao');

-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('instalacao', 'visita_tecnica', 'manutencao_preventiva', 'manutencao_corretiva', 'treinamento', 'retirada_equipamento', 'outro');

-- CreateEnum
CREATE TYPE "ShippingKind" AS ENUM ('retirada', 'entrega_local', 'transportadora', 'sob_orcamento', 'gratis', 'nao_aplicavel');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('percentual', 'valor_fixo');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('aguardando_pagamento', 'pagamento_em_analise', 'pago', 'separacao', 'revisao_tecnica', 'aguardando_frete', 'pronto_retirada', 'enviado', 'instalacao_agendada', 'entregue', 'concluido', 'cancelado', 'reembolsado');

-- CreateEnum
CREATE TYPE "OrderItemKind" AS ENUM ('produto', 'servico');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('pix', 'cartao', 'boleto', 'manual');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('criado', 'pendente', 'em_analise', 'aprovado', 'recusado', 'expirado', 'cancelado', 'estornado');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('operacional', 'em_manutencao', 'aguardando_peca', 'inoperante', 'desativado');

-- CreateEnum
CREATE TYPE "EquipmentOrigin" AS ENUM ('compra_jb', 'cadastro_cliente', 'cadastro_tecnico', 'atendimento');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('solicitacao_recebida', 'triagem', 'aguardando_cliente', 'visita_agendada', 'tecnico_a_caminho', 'em_diagnostico', 'orcamento_enviado', 'aguardando_aprovacao', 'aprovado', 'aguardando_peca', 'em_manutencao', 'testes', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('baixa', 'normal', 'alta', 'parado');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('aberta', 'em_execucao', 'aguardando_peca', 'aguardando_aprovacao', 'concluida', 'cancelada');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('rascunho', 'enviado', 'em_duvida', 'aprovado', 'recusado', 'expirado', 'convertido');

-- CreateEnum
CREATE TYPE "QuoteKind" AS ENUM ('comercial', 'assistencia');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('rascunho', 'ativo', 'suspenso', 'encerrado');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('prevista', 'agendada', 'concluida', 'cancelada');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('nota_fiscal', 'pedido', 'orcamento', 'ordem_servico', 'laudo', 'certificado', 'manual', 'garantia', 'contrato', 'outro');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('aberto', 'respondido', 'aguardando_cliente', 'fechado');

-- DropForeignKey
ALTER TABLE "Highlight" DROP CONSTRAINT "Highlight_imageId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceCategory" DROP CONSTRAINT "ServiceCategory_imageId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- Converte o papel no lugar. Recriar a coluna apagaria quem hoje é admin.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "StaffRole" USING (
  CASE
    WHEN lower("role") = 'admin'    THEN 'admin'::"StaffRole"
    WHEN lower("role") = 'gestor'   THEN 'gestor'::"StaffRole"
    WHEN lower("role") = 'comercial' THEN 'comercial'::"StaffRole"
    WHEN lower("role") = 'tecnico'  THEN 'tecnico'::"StaffRole"
    ELSE 'editor'::"StaffRole"
  END
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'editor';

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "colorTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "phone" TEXT NOT NULL DEFAULT '',
    "personType" "PersonType" NOT NULL DEFAULT 'fisica',
    "document" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "tradeName" TEXT NOT NULL DEFAULT '',
    "stateRegistry" TEXT NOT NULL DEFAULT '',
    "emailVerifiedAt" TIMESTAMP(3),
    "marketingOptInAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Principal',
    "recipient" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLocation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "success" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "logoId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "parentId" TEXT,
    "imageId" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT '',
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "condition" "ProductCondition" NOT NULL DEFAULT 'novo',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "brandId" TEXT,
    "categoryId" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "compareAtCents" INTEGER,
    "costCents" INTEGER,
    "allowDirectPurchase" BOOLEAN NOT NULL DEFAULT true,
    "allowQuoteRequest" BOOLEAN NOT NULL DEFAULT true,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "unique" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 1,
    "warrantyMonths" INTEGER,
    "voltage" TEXT,
    "weightGrams" INTEGER,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "depthMm" INTEGER,
    "shippingProfileId" TEXT,
    "anvisaCode" TEXT,
    "manufacturer" TEXT,
    "regulatoryHolder" TEXT,
    "regulatoryNote" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpec" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Ficha técnica',
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAddon" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "priceCents" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "status" "UnitStatus" NOT NULL DEFAULT 'disponivel',
    "manufactureYear" INTEGER,
    "usageHours" INTEGER,
    "usageCycles" INTEGER,
    "conditionNotes" TEXT NOT NULL DEFAULT '',
    "inspectionNotes" TEXT NOT NULL DEFAULT '',
    "warrantyMonths" INTEGER,
    "acquiredFrom" TEXT NOT NULL DEFAULT '',
    "orderItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCheckItem" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'verificado',
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryUnitMedia" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryUnitMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "StockMovementKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "orderId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ServiceKind" NOT NULL DEFAULT 'outro',
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ShippingKind" NOT NULL DEFAULT 'sob_orcamento',
    "description" TEXT NOT NULL DEFAULT '',
    "freeAboveCents" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zipStart" TEXT NOT NULL,
    "zipEnd" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "etaDays" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customerId" TEXT,
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceId" TEXT,
    "parentId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CouponKind" NOT NULL DEFAULT 'percentual',
    "value" INTEGER NOT NULL,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "maxUsesPerCustomer" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'aguardando_pagamento',
    "customerId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL DEFAULT '',
    "buyerDocument" TEXT NOT NULL DEFAULT '',
    "personType" "PersonType" NOT NULL DEFAULT 'fisica',
    "companyName" TEXT NOT NULL DEFAULT '',
    "shippingKind" "ShippingKind" NOT NULL DEFAULT 'retirada',
    "shippingLabel" TEXT NOT NULL DEFAULT '',
    "shipZip" TEXT NOT NULL DEFAULT '',
    "shipStreet" TEXT NOT NULL DEFAULT '',
    "shipNumber" TEXT NOT NULL DEFAULT '',
    "shipComplement" TEXT NOT NULL DEFAULT '',
    "shipDistrict" TEXT NOT NULL DEFAULT '',
    "shipCity" TEXT NOT NULL DEFAULT '',
    "shipState" TEXT NOT NULL DEFAULT '',
    "shipReference" TEXT NOT NULL DEFAULT '',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "couponId" TEXT,
    "couponCode" TEXT NOT NULL DEFAULT '',
    "customerNote" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "OrderItemKind" NOT NULL DEFAULT 'produto',
    "productId" TEXT,
    "serviceId" TEXT,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "brandName" TEXT NOT NULL DEFAULT '',
    "modelName" TEXT NOT NULL DEFAULT '',
    "condition" "ProductCondition",
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallationTask" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'criado',
    "amountCents" INTEGER NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "externalId" TEXT,
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "expiresAt" TIMESTAMP(3),
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "approvedAt" TIMESTAMP(3),
    "failReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "brandName" TEXT NOT NULL DEFAULT '',
    "modelName" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "voltage" TEXT,
    "productId" TEXT,
    "orderId" TEXT,
    "locationId" TEXT,
    "room" TEXT NOT NULL DEFAULT '',
    "origin" "EquipmentOrigin" NOT NULL DEFAULT 'cadastro_cliente',
    "status" "EquipmentStatus" NOT NULL DEFAULT 'operacional',
    "condition" "ProductCondition",
    "manufacturedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "installedAt" TIMESTAMP(3),
    "warrantyUntil" TIMESTAMP(3),
    "lastMaintenanceAt" TIMESTAMP(3),
    "nextMaintenanceAt" TIMESTAMP(3),
    "maintenanceIntervalDays" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentMedia" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EquipmentMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentEvent" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'solicitacao_recebida',
    "customerId" TEXT,
    "equipmentId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT,
    "brandName" TEXT NOT NULL DEFAULT '',
    "modelName" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "problemKind" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "urgency" "Urgency" NOT NULL DEFAULT 'normal',
    "addressZip" TEXT NOT NULL DEFAULT '',
    "addressStreet" TEXT NOT NULL DEFAULT '',
    "addressNumber" TEXT NOT NULL DEFAULT '',
    "addressComplement" TEXT NOT NULL DEFAULT '',
    "addressDistrict" TEXT NOT NULL DEFAULT '',
    "addressCity" TEXT NOT NULL DEFAULT '',
    "addressState" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestMedia" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceRequestMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "ServiceRequestStatus",
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAppointment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "installTaskId" TEXT,
    "technicianId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'agendado',
    "addressSummary" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'aberta',
    "requestId" TEXT,
    "equipmentId" TEXT,
    "technicianId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "reportedIssue" TEXT NOT NULL DEFAULT '',
    "diagnosis" TEXT NOT NULL DEFAULT '',
    "workDone" TEXT NOT NULL DEFAULT '',
    "finalTest" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "laborCents" INTEGER NOT NULL DEFAULT 0,
    "travelCents" INTEGER NOT NULL DEFAULT 0,
    "partsCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "serviceWarrantyDays" INTEGER,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedByName" TEXT NOT NULL DEFAULT '',
    "acceptedIp" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderItem" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'peca',
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderCheckItem" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkOrderCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderMedia" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'antes',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkOrderMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderEvent" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "QuoteKind" NOT NULL DEFAULT 'comercial',
    "status" "QuoteStatus" NOT NULL DEFAULT 'rascunho',
    "version" INTEGER NOT NULL DEFAULT 1,
    "customerId" TEXT,
    "requestId" TEXT,
    "orderId" TEXT,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "conditions" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedByName" TEXT NOT NULL DEFAULT '',
    "decidedIp" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "serviceId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteEvent" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceCents" INTEGER,
    "periodMonths" INTEGER NOT NULL DEFAULT 12,
    "visitsIncluded" INTEGER NOT NULL DEFAULT 0,
    "partsDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceContract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'rascunho',
    "customerId" TEXT NOT NULL,
    "planId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceContractItem" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "MaintenanceContractItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceVisit" (
    "id" TEXT NOT NULL,
    "contractId" TEXT,
    "equipmentId" TEXT NOT NULL,
    "technicianId" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'prevista',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceReminder" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'outro',
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'application/pdf',
    "size" INTEGER NOT NULL DEFAULT 0,
    "customerId" TEXT,
    "orderId" TEXT,
    "equipmentId" TEXT,
    "workOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'aberto',
    "customerId" TEXT,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enviado',
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'geral',
    "productId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaHref" TEXT NOT NULL DEFAULT '',
    "mediaId" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "prefix" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("prefix")
);

-- CreateIndex
CREATE UNIQUE INDEX "Technician_userId_key" ON "Technician"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_document_idx" ON "Customer"("document");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");

-- CreateIndex
CREATE INDEX "CustomerLocation_customerId_idx" ON "CustomerLocation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_customerId_idx" ON "PasswordResetToken"("customerId");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_published_order_idx" ON "Brand"("published", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_published_order_idx" ON "Category"("published", "order");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_status_publishedAt_idx" ON "Product"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Product_brandId_status_idx" ON "Product"("brandId", "status");

-- CreateIndex
CREATE INDEX "Product_condition_status_idx" ON "Product"("condition", "status");

-- CreateIndex
CREATE INDEX "Product_featured_status_idx" ON "Product"("featured", "status");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_order_idx" ON "ProductMedia"("productId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMedia_productId_mediaId_key" ON "ProductMedia"("productId", "mediaId");

-- CreateIndex
CREATE INDEX "ProductSpec_productId_order_idx" ON "ProductSpec"("productId", "order");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_idx" ON "ProductDocument"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRelation_sourceId_targetId_key" ON "ProductRelation"("sourceId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAddon_productId_serviceId_key" ON "ProductAddon"("productId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUnit_orderItemId_key" ON "InventoryUnit"("orderItemId");

-- CreateIndex
CREATE INDEX "InventoryUnit_productId_status_idx" ON "InventoryUnit"("productId", "status");

-- CreateIndex
CREATE INDEX "InventoryUnit_serialNumber_idx" ON "InventoryUnit"("serialNumber");

-- CreateIndex
CREATE INDEX "InventoryCheckItem_unitId_order_idx" ON "InventoryCheckItem"("unitId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUnitMedia_unitId_mediaId_key" ON "InventoryUnitMedia"("unitId", "mediaId");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_published_order_idx" ON "Service"("published", "order");

-- CreateIndex
CREATE INDEX "ShippingZone_profileId_order_idx" ON "ShippingZone"("profileId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_token_key" ON "Cart"("token");

-- CreateIndex
CREATE INDEX "Cart_customerId_idx" ON "Cart"("customerId");

-- CreateIndex
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_active_endsAt_idx" ON "Coupon"("active", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_customerId_placedAt_idx" ON "Order"("customerId", "placedAt");

-- CreateIndex
CREATE INDEX "Order_status_placedAt_idx" ON "Order"("status", "placedAt");

-- CreateIndex
CREATE INDEX "Order_buyerEmail_idx" ON "Order"("buyerEmail");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "InstallationTask_status_scheduledAt_idx" ON "InstallationTask"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalId_key" ON "Payment"("externalId");

-- CreateIndex
CREATE INDEX "Payment_orderId_createdAt_idx" ON "Payment"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_eventKey_key" ON "PaymentEvent"("eventKey");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "Equipment_customerId_status_idx" ON "Equipment"("customerId", "status");

-- CreateIndex
CREATE INDEX "Equipment_nextMaintenanceAt_idx" ON "Equipment"("nextMaintenanceAt");

-- CreateIndex
CREATE INDEX "Equipment_serialNumber_idx" ON "Equipment"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentMedia_equipmentId_mediaId_key" ON "EquipmentMedia"("equipmentId", "mediaId");

-- CreateIndex
CREATE INDEX "EquipmentEvent_equipmentId_happenedAt_idx" ON "EquipmentEvent"("equipmentId", "happenedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_number_key" ON "ServiceRequest"("number");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerId_createdAt_idx" ON "ServiceRequest"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequestMedia_requestId_mediaId_key" ON "ServiceRequestMedia"("requestId", "mediaId");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_requestId_createdAt_idx" ON "ServiceRequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAppointment_installTaskId_key" ON "ServiceAppointment"("installTaskId");

-- CreateIndex
CREATE INDEX "ServiceAppointment_startsAt_idx" ON "ServiceAppointment"("startsAt");

-- CreateIndex
CREATE INDEX "ServiceAppointment_technicianId_startsAt_idx" ON "ServiceAppointment"("technicianId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_number_key" ON "WorkOrder"("number");

-- CreateIndex
CREATE INDEX "WorkOrder_status_openedAt_idx" ON "WorkOrder"("status", "openedAt");

-- CreateIndex
CREATE INDEX "WorkOrder_equipmentId_idx" ON "WorkOrder"("equipmentId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_workOrderId_order_idx" ON "WorkOrderItem"("workOrderId", "order");

-- CreateIndex
CREATE INDEX "WorkOrderCheckItem_workOrderId_order_idx" ON "WorkOrderCheckItem"("workOrderId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderMedia_workOrderId_mediaId_key" ON "WorkOrderMedia"("workOrderId", "mediaId");

-- CreateIndex
CREATE INDEX "WorkOrderEvent_workOrderId_createdAt_idx" ON "WorkOrderEvent"("workOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_orderId_key" ON "Quote"("orderId");

-- CreateIndex
CREATE INDEX "Quote_customerId_createdAt_idx" ON "Quote"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Quote_status_createdAt_idx" ON "Quote"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_order_idx" ON "QuoteItem"("quoteId", "order");

-- CreateIndex
CREATE INDEX "QuoteEvent_quoteId_createdAt_idx" ON "QuoteEvent"("quoteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePlan_slug_key" ON "MaintenancePlan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceContract_number_key" ON "MaintenanceContract"("number");

-- CreateIndex
CREATE INDEX "MaintenanceContract_customerId_status_idx" ON "MaintenanceContract"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceContractItem_contractId_equipmentId_key" ON "MaintenanceContractItem"("contractId", "equipmentId");

-- CreateIndex
CREATE INDEX "MaintenanceVisit_status_dueAt_idx" ON "MaintenanceVisit"("status", "dueAt");

-- CreateIndex
CREATE INDEX "MaintenanceVisit_equipmentId_dueAt_idx" ON "MaintenanceVisit"("equipmentId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReminder_visitId_daysBefore_key" ON "MaintenanceReminder"("visitId", "daysBefore");

-- CreateIndex
CREATE INDEX "Document_customerId_createdAt_idx" ON "Document"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_customerId_idx" ON "SupportTicket"("customerId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_customerId_readAt_createdAt_idx" ON "Notification"("customerId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundMessage_dedupeKey_key" ON "OutboundMessage"("dedupeKey");

-- CreateIndex
CREATE INDEX "OutboundMessage_createdAt_idx" ON "OutboundMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_customerId_productId_key" ON "Favorite"("customerId", "productId");

-- CreateIndex
CREATE INDEX "Faq_group_order_idx" ON "Faq"("group", "order");

-- CreateIndex
CREATE INDEX "HomeSection_published_order_idx" ON "HomeSection"("published", "order");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "Media_folder_createdAt_idx" ON "Media"("folder", "createdAt");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLocation" ADD CONSTRAINT "CustomerLocation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLocation" ADD CONSTRAINT "CustomerLocation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAddon" ADD CONSTRAINT "ProductAddon_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAddon" ADD CONSTRAINT "ProductAddon_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCheckItem" ADD CONSTRAINT "InventoryCheckItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUnitMedia" ADD CONSTRAINT "InventoryUnitMedia_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUnitMedia" ADD CONSTRAINT "InventoryUnitMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZone" ADD CONSTRAINT "ShippingZone_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ShippingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallationTask" ADD CONSTRAINT "InstallationTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CustomerLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMedia" ADD CONSTRAINT "EquipmentMedia_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMedia" ADD CONSTRAINT "EquipmentMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestMedia" ADD CONSTRAINT "ServiceRequestMedia_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestMedia" ADD CONSTRAINT "ServiceRequestMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_installTaskId_fkey" FOREIGN KEY ("installTaskId") REFERENCES "InstallationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCheckItem" ADD CONSTRAINT "WorkOrderCheckItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMedia" ADD CONSTRAINT "WorkOrderMedia_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMedia" ADD CONSTRAINT "WorkOrderMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEvent" ADD CONSTRAINT "WorkOrderEvent_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceContract" ADD CONSTRAINT "MaintenanceContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceContract" ADD CONSTRAINT "MaintenanceContract_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceContractItem" ADD CONSTRAINT "MaintenanceContractItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MaintenanceContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceContractItem" ADD CONSTRAINT "MaintenanceContractItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceVisit" ADD CONSTRAINT "MaintenanceVisit_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "MaintenanceContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceVisit" ADD CONSTRAINT "MaintenanceVisit_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceVisit" ADD CONSTRAINT "MaintenanceVisit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReminder" ADD CONSTRAINT "MaintenanceReminder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "MaintenanceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSection" ADD CONSTRAINT "HomeSection_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- MIGRAÇÃO DE DADOS
-- As soluções do site antigo viram a árvore de categorias do catálogo, e as
-- chamadas da home são preservadas desativadas para o admin decidir o destino.
-- Nada é descartado antes de ter sido copiado.
-- ============================================================================

INSERT INTO "Category" ("id", "slug", "name", "description", "order", "published", "featured", "imageId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  sc."slug",
  sc."name",
  sc."description",
  sc."order",
  sc."published",
  true,
  sc."imageId",
  sc."createdAt",
  sc."updatedAt"
FROM "ServiceCategory" sc
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "HomeSection" ("id", "kind", "title", "subtitle", "body", "ctaLabel", "ctaHref", "mediaId", "config", "order", "published", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'chamada_legado',
  h."title",
  COALESCE(h."subtitle", ''),
  COALESCE(h."body", ''),
  'Acessar',
  COALESCE(h."href", ''),
  h."imageId",
  '{}'::jsonb,
  h."order",
  false,
  now()
FROM "Highlight" h;

-- Agora sim, as tabelas antigas podem sair.
DROP TABLE "Highlight";
DROP TABLE "ServiceCategory";
