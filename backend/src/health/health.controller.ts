import { Controller, Get, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { firstValueFrom, timeout } from 'rxjs';

interface DependencyStatus {
  status: 'ok' | 'error';
  message?: string;
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  async check() {
    const [database, pythonService] = await Promise.all([
      this.checkDatabase(),
      this.checkPythonService(),
    ]);

    const status = database.status === 'ok' && pythonService.status === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      service: 'menusmart-backend',
      timestamp: new Date().toISOString(),
      dependencies: { database, pythonService },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.warn(`Chequeo de PostgreSQL falló: ${message}`);
      return { status: 'error', message };
    }
  }

  private async checkPythonService(): Promise<DependencyStatus> {
    try {
      await firstValueFrom(this.httpService.get('/health').pipe(timeout(2000)));
      return { status: 'ok' };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.warn(`Chequeo del servicio Python falló: ${message}`);
      return { status: 'error', message };
    }
  }
}
