import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toEqual({message: 'Hello API'});
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const appController = app.get<AppController>(AppController);
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(typeof health.timestamp).toBe('string');
      expect(typeof health.uptimeSeconds).toBe('number');
    });
  });
});
