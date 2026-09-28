import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CatalogImportRequestDto,
  CatalogImportRowDto,
  CatalogImportRowSchema,
  CatalogItemCreateDto,
  CatalogItemUpdateDto,
} from '@orcivo/shared-types';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PHOTO_BUCKET, StorageService } from '../storage/storage.service';

type CatalogItemRow = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: Prisma.Decimal;
  quantity: number;
  low_stock_threshold: number;
  cost_price: Prisma.Decimal;
  sale_price: Prisma.Decimal;
  unit: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

type CatalogWriteData = {
  name: string;
  description: string | null;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: string;
  quantity: number;
  low_stock_threshold: number;
  cost_price: string;
  sale_price: string;
  unit: string | null;
  photo_url?: string | null;
  is_active: boolean;
};

type Queryable = Pick<PrismaService, '$queryRaw'>;

const inventoryColumns = Prisma.sql`
  "id", "company_id", "name", "description", "type", "unit_price",
  "quantity", "low_stock_threshold", "cost_price", "sale_price", "unit",
  "photo_url", "is_active", "created_at", "updated_at"
`;

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(companyId: string, onlyActive = true) {
    const items = await this.prisma.$queryRaw<CatalogItemRow[]>`
      SELECT ${inventoryColumns} FROM "catalog_items"
      WHERE "company_id" = ${companyId}
        AND (${onlyActive} = false OR "is_active" = true)
      ORDER BY "type" ASC, "name" ASC
    `;
    return Promise.all(items.map((item) => this.withLowStock(item)));
  }

  async findLowStock(companyId: string) {
    const items = await this.prisma.$queryRaw<CatalogItemRow[]>`
      SELECT ${inventoryColumns} FROM "catalog_items"
      WHERE "company_id" = ${companyId}
        AND "type" = 'PRODUCT'::"CatalogItemType"
        AND "is_active" = true
        AND "quantity" <= "low_stock_threshold"
      ORDER BY "quantity" ASC, "name" ASC
    `;
    return Promise.all(items.map((item) => this.withLowStock(item)));
  }

  async findOne(id: string, companyId: string) {
    const item = await this.findOneRow(this.prisma, id, companyId);
    if (!item) throw new NotFoundException();
    return this.withLowStock(item);
  }

  async create(dto: CatalogItemCreateDto, companyId: string) {
    const item = await this.insert(this.prisma, this.toCatalogCreateData(dto), companyId);
    return this.withLowStock(item);
  }

  async update(id: string, dto: CatalogItemUpdateDto, companyId: string) {
    const item = await this.updateRow(this.prisma, id, companyId, this.toCatalogData(dto));
    if (!item) throw new NotFoundException();
    return this.withLowStock(item);
  }

  async deactivate(id: string, companyId: string) {
    const item = await this.updateRow(this.prisma, id, companyId, { is_active: false });
    if (!item) throw new NotFoundException();
    return this.withLowStock(item);
  }

  async import(dto: CatalogImportRequestDto, companyId: string) {
    const rows = 'csv' in dto ? this.parseCsv(dto.csv) : dto.items;
    let created = 0;
    let updated = 0;

    const items = await this.prisma.$transaction(async (tx) => {
      const imported: CatalogItemRow[] = [];
      for (const row of rows) {
        const existing = await this.findByNameAndType(tx, companyId, row.name, row.type);
        const data = this.toCatalogCreateData(row);
        if (existing) {
          updated += 1;
          const item = await this.updateRow(tx, existing.id, companyId, data);
          if (!item) throw new NotFoundException();
          imported.push(item);
        } else {
          created += 1;
          imported.push(await this.insert(tx, data, companyId));
        }
      }
      return imported;
    });

    return {
      created,
      updated,
      total: items.length,
      items: await Promise.all(items.map((item) => this.withLowStock(item))),
    };
  }

  async uploadPhoto(id: string, companyId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie uma foto do item.');
    const item = await this.findOneRow(this.prisma, id, companyId);
    if (!item) throw new NotFoundException();

    this.storage.assertUploadable(
      file.buffer,
      file.mimetype,
      MAX_PHOTO_SIZE,
      ALLOWED_PHOTO_MIME_TYPES,
    );

    const extension = file.mimetype.split('/')[1] || 'jpg';
    const objectKey = `${companyId}/catalog/${id}/${randomUUID()}.${extension}`;
    const uploadedKey = await this.storage.uploadBuffer(
      PHOTO_BUCKET,
      objectKey,
      file.buffer,
      file.mimetype,
    );

    let updated: CatalogItemRow | undefined;
    try {
      updated = await this.updateRow(this.prisma, id, companyId, { photo_url: uploadedKey });
    } catch (error) {
      await this.storage.deleteObject(PHOTO_BUCKET, uploadedKey).catch(() => null);
      throw error;
    }
    if (!updated) {
      await this.storage.deleteObject(PHOTO_BUCKET, uploadedKey).catch(() => null);
      throw new NotFoundException();
    }

    const previousKey = this.storage.extractKey(PHOTO_BUCKET, item.photo_url);
    if (previousKey && previousKey !== uploadedKey) {
      await this.storage.deleteObject(PHOTO_BUCKET, previousKey).catch(() => null);
    }
    return this.withLowStock(updated);
  }

  async deletePhoto(id: string, companyId: string) {
    const item = await this.findOneRow(this.prisma, id, companyId);
    if (!item) throw new NotFoundException();

    const updated = await this.updateRow(this.prisma, id, companyId, { photo_url: null });
    if (!updated) throw new NotFoundException();

    const objectKey = this.storage.extractKey(PHOTO_BUCKET, item.photo_url);
    if (objectKey) await this.storage.deleteObject(PHOTO_BUCKET, objectKey).catch(() => null);
    return this.withLowStock(updated);
  }

  private async findOneRow(queryable: Queryable, id: string, companyId: string) {
    const [item] = await queryable.$queryRaw<CatalogItemRow[]>`
      SELECT ${inventoryColumns} FROM "catalog_items"
      WHERE "id" = ${id} AND "company_id" = ${companyId}
    `;
    return item;
  }

  private async findByNameAndType(
    queryable: Queryable,
    companyId: string,
    name: string,
    type: CatalogWriteData['type'],
  ) {
    const [item] = await queryable.$queryRaw<Pick<CatalogItemRow, 'id'>[]>`
      SELECT "id" FROM "catalog_items"
      WHERE "company_id" = ${companyId}
        AND "name" = ${name}
        AND "type" = ${type}::"CatalogItemType"
      LIMIT 1
    `;
    return item;
  }

  private async insert(queryable: Queryable, data: CatalogWriteData, companyId: string) {
    const id = randomUUID();
    const [item] = await queryable.$queryRaw<CatalogItemRow[]>`
      INSERT INTO "catalog_items" (
        "id", "company_id", "name", "description", "type", "unit_price",
        "quantity", "low_stock_threshold", "cost_price", "sale_price", "unit",
        "is_active", "updated_at"
      ) VALUES (
        ${id}, ${companyId}, ${data.name}, ${data.description},
        ${data.type}::"CatalogItemType", ${data.unit_price}::DECIMAL(12,2), ${data.quantity},
        ${data.low_stock_threshold}, ${data.cost_price}::DECIMAL(12,2),
        ${data.sale_price}::DECIMAL(12,2), ${data.unit},
        ${data.is_active}, NOW()
      ) RETURNING ${inventoryColumns}
    `;
    return item;
  }

  private async updateRow(
    queryable: Queryable,
    id: string,
    companyId: string,
    data: Partial<CatalogWriteData>,
  ) {
    const assignments = this.toAssignments(data);
    assignments.push(Prisma.sql`"updated_at" = NOW()`);
    const [item] = await queryable.$queryRaw<CatalogItemRow[]>`
      UPDATE "catalog_items" SET ${Prisma.join(assignments, ', ')}
      WHERE "id" = ${id} AND "company_id" = ${companyId}
      RETURNING ${inventoryColumns}
    `;
    return item;
  }

  private toAssignments(data: Partial<CatalogWriteData>) {
    const assignments: Prisma.Sql[] = [];
    if (data.name !== undefined) assignments.push(Prisma.sql`"name" = ${data.name}`);
    if (data.description !== undefined)
      assignments.push(Prisma.sql`"description" = ${data.description}`);
    if (data.type !== undefined)
      assignments.push(Prisma.sql`"type" = ${data.type}::"CatalogItemType"`);
    if (data.unit_price !== undefined)
      assignments.push(Prisma.sql`"unit_price" = ${data.unit_price}::DECIMAL(12,2)`);
    if (data.quantity !== undefined) assignments.push(Prisma.sql`"quantity" = ${data.quantity}`);
    if (data.low_stock_threshold !== undefined)
      assignments.push(Prisma.sql`"low_stock_threshold" = ${data.low_stock_threshold}`);
    if (data.cost_price !== undefined)
      assignments.push(Prisma.sql`"cost_price" = ${data.cost_price}::DECIMAL(12,2)`);
    if (data.sale_price !== undefined)
      assignments.push(Prisma.sql`"sale_price" = ${data.sale_price}::DECIMAL(12,2)`);
    if (data.unit !== undefined) assignments.push(Prisma.sql`"unit" = ${data.unit}`);
    if (data.photo_url !== undefined) assignments.push(Prisma.sql`"photo_url" = ${data.photo_url}`);
    if (data.is_active !== undefined) assignments.push(Prisma.sql`"is_active" = ${data.is_active}`);
    return assignments;
  }

  private toCatalogCreateData(dto: CatalogItemCreateDto | CatalogImportRowDto): CatalogWriteData {
    const price = dto.sale_price ?? dto.unit_price;
    if (!price) throw new BadRequestException('sale_price ou unit_price é obrigatório.');
    return {
      name: dto.name,
      description: dto.description ?? null,
      type: dto.type,
      unit_price: price,
      sale_price: price,
      cost_price: dto.cost_price ?? '0',
      quantity: dto.quantity ?? 0,
      low_stock_threshold: dto.low_stock_threshold ?? 5,
      unit: dto.unit ?? null,
      is_active: dto.is_active ?? true,
    };
  }

  private toCatalogData(dto: CatalogItemUpdateDto): Partial<CatalogWriteData> {
    const { unit_price, sale_price, ...data } = dto;
    const price = sale_price ?? unit_price;
    return price === undefined ? data : { ...data, unit_price: price, sale_price: price };
  }

  private async withLowStock(item: CatalogItemRow) {
    return {
      ...item,
      photo_url: await this.storage.resolveUrl(PHOTO_BUCKET, item.photo_url),
      is_low_stock: item.type === 'PRODUCT' && item.quantity <= item.low_stock_threshold,
    };
  }

  private parseCsv(csv: string): CatalogImportRowDto[] {
    const records = parseCsvRecords(csv);
    if (records.length < 2)
      throw new BadRequestException('O CSV deve conter um cabeçalho e ao menos um item.');

    const headers = records[0].map((header) => header.trim().toLowerCase());
    if (
      new Set(headers).size !== headers.length ||
      !headers.includes('name') ||
      !headers.includes('type')
    ) {
      throw new BadRequestException('CSV deve ter cabeçalhos únicos e incluir name e type.');
    }
    const rows = records.slice(1).filter((record) => record.some((value) => value.trim() !== ''));
    if (rows.length === 0) throw new BadRequestException('O CSV deve conter ao menos um item.');
    if (rows.length > 1000)
      throw new BadRequestException('O CSV aceita no máximo 1000 itens por importação.');

    return rows.map((record, index) => {
      if (record.length !== headers.length) {
        throw new BadRequestException(`Linha ${index + 2}: quantidade de colunas inválida.`);
      }
      const raw = Object.fromEntries(
        headers.map((header, column) => [header, record[column].trim()]),
      );
      const normalized = Object.fromEntries(
        Object.entries(raw).filter(([, value]) => value !== ''),
      );
      const parsed = CatalogImportRowSchema.safeParse(normalized);
      if (!parsed.success) {
        const errors = parsed.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`,
        );
        throw new BadRequestException({ message: `Linha ${index + 2} inválida`, errors });
      }
      return parsed.data;
    });
  }
}

function parseCsvRecords(input: string): string[][] {
  const delimiter = input.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else field += char;
  }
  if (quoted) throw new BadRequestException('CSV contém aspas não fechadas.');
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}
