/**
 * File: apps/api/src/modules/commerce/services/commerce.service.ts
 * Module: commerce
 * Purpose: Commerce operations (products + cart) for SMB MVP
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - v1 keeps a single active cart per site (no customer/session separation yet)
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Cart, type CartLine } from '../entities/cart.entity';

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
  ) {}

  async listProducts(siteId: string) {
    return await this.productRepo.find({ where: { siteId }, order: { createdAt: 'DESC' } });
  }

  async seedDemoProducts(siteId: string) {
    const handle = 'demo-product';
    const existing = await this.productRepo.findOne({ where: { siteId, handle } });
    if (existing) return { created: false, product: existing };

    const product = await this.productRepo.save(
      this.productRepo.create({
        siteId,
        title: 'Demo Product',
        handle,
        priceCents: 1299,
        currency: 'USD',
        imageUrl: 'https://picsum.photos/seed/demo/800/600',
      }),
    );
    this.logger.log(`seedDemoProducts siteId=${siteId} productId=${product.id}`);
    return { created: true, product };
  }

  private async getOrCreateCart(siteId: string) {
    const existing = await this.cartRepo.findOne({ where: { siteId } });
    if (existing) return existing;
    const created = await this.cartRepo.save(this.cartRepo.create({ siteId, lines: [], currency: 'USD' }));
    return created;
  }

  async getCart(siteId: string) {
    return await this.getOrCreateCart(siteId);
  }

  async addToCart(siteId: string, productId: string, quantity: number) {
    if (!productId) throw new BadRequestException('productId is required');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException('quantity must be > 0');

    const product = await this.productRepo.findOne({ where: { id: productId, siteId } });
    if (!product) throw new NotFoundException(`Product not found for site: ${productId}`);

    const cart = await this.getOrCreateCart(siteId);
    const lines = (cart.lines || []) as CartLine[];
    const idx = lines.findIndex((l) => l.productId === productId);
    const nextLines =
      idx === -1
        ? [...lines, { productId, quantity }]
        : lines.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + quantity } : l));

    cart.lines = nextLines;
    cart.currency = product.currency || cart.currency;
    const saved = await this.cartRepo.save(cart);
    this.logger.log(`addToCart siteId=${siteId} productId=${productId} quantity=${quantity}`);
    return saved;
  }
}

