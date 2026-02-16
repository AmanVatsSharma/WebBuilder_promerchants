/**
 * @file identity.module.ts
 * @module identity
 * @description Identity module wiring
 * @author BharatERP
 * @created 2026-02-16
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMembership } from './entities/workspace-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Workspace, WorkspaceMembership])],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}

