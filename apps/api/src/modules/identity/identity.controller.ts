/**
 * @file identity.controller.ts
 * @module identity
 * @description Auth endpoints for identity registration and login
 * @author BharatERP
 * @created 2026-02-16
 */

import { Body, Controller, Get, Post } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { IntrospectTokenDto } from './dto/introspect-token.dto';

@Controller('auth')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('register')
  registerOwner(@Body() dto: RegisterOwnerDto) {
    return this.identityService.registerOwner(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.identityService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.identityService.refresh(dto);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.identityService.logout(dto);
  }

  @Get('jwks')
  jwks() {
    return this.identityService.getJwksMetadata();
  }

  @Post('introspect')
  introspect(@Body() dto: IntrospectTokenDto) {
    return this.identityService.introspectToken(dto.token);
  }
}

